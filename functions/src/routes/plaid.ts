import { Router, Request, Response } from 'express';
import { CountryCode, Products, RemovedTransaction } from 'plaid';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getPlaidClient } from '../config/plaid';
import { mapPlaidCategory } from '../utils/categoryMapper';
import { updateMonthlySummary } from '../utils/monthlySummary';

export const plaidRouter = Router();

// ---------------------------------------------------------------------------
// POST /plaid/create-link-token
// ---------------------------------------------------------------------------
plaidRouter.post('/create-link-token', async (req: Request, res: Response) => {
  try {
    const userId: string = res.locals.uid;
    const plaid = getPlaidClient();

    const response = await plaid.linkTokenCreate({
      user: { client_user_id: userId },
      client_name: 'SpendWise',
      products: [Products.Transactions],
      country_codes: [CountryCode.Us],
      language: 'en',
    });

    res.json({ linkToken: response.data.link_token });
  } catch (err) {
    console.error('create-link-token error:', err);
    const message = err instanceof Error ? err.message : 'Failed to create link token';
    res.status(502).json({ error: message });
  }
});

// ---------------------------------------------------------------------------
// POST /plaid/exchange-public-token
// ---------------------------------------------------------------------------
plaidRouter.post('/exchange-public-token', async (req: Request, res: Response) => {
  try {
    const userId: string = res.locals.uid;
    const { publicToken, metadata } = req.body;

    if (!publicToken || typeof publicToken !== 'string') {
      res.status(400).json({ error: 'publicToken is required' });
      return;
    }

    const plaid = getPlaidClient();
    const exchangeResponse = await plaid.itemPublicTokenExchange({
      public_token: publicToken,
    });

    const accessToken = exchangeResponse.data.access_token;
    const itemId = exchangeResponse.data.item_id;
    const connectionId = itemId;

    const db = getFirestore();
    const institutionName = metadata?.institution?.name || 'Linked account';
    const accounts: Array<Record<string, unknown>> = (metadata?.accounts || []).map(
      (acc: Record<string, unknown>) => ({
        id: acc.id || '',
        name: acc.name || '',
        mask: acc.mask || '',
        subtype: acc.subtype || '',
        type: acc.type || '',
      })
    );

    // Store access token securely (client cannot read this collection)
    await db.doc(`users/${userId}/plaidTokens/${connectionId}`).set({
      accessToken,
      itemId,
      createdAt: FieldValue.serverTimestamp(),
    });

    // Create the public-facing connection document
    await db.doc(`users/${userId}/bankConnections/${connectionId}`).set({
      provider: 'plaid',
      status: 'active',
      institutionName,
      accounts,
      accountCount: accounts.length,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      lastSyncedAt: null,
    });

    res.json({ connectionId, institutionName });
  } catch (err) {
    console.error('exchange-public-token error:', err);
    const message = err instanceof Error ? err.message : 'Failed to exchange token';
    res.status(502).json({ error: message });
  }
});

// ---------------------------------------------------------------------------
// POST /plaid/sync-transactions
// ---------------------------------------------------------------------------
plaidRouter.post('/sync-transactions', async (req: Request, res: Response) => {
  try {
    const userId: string = res.locals.uid;
    const { connectionId } = req.body;
    const db = getFirestore();
    const plaid = getPlaidClient();

    // Resolve which connections to sync
    let connectionIds: string[];
    if (connectionId && typeof connectionId === 'string') {
      connectionIds = [connectionId];
    } else {
      const connectionsSnap = await db
        .collection(`users/${userId}/bankConnections`)
        .where('status', '==', 'active')
        .get();
      connectionIds = connectionsSnap.docs.map((d) => d.id);
    }

    if (connectionIds.length === 0) {
      res.json({ importedCount: 0, skippedCount: 0, errorCount: 0, lastSyncAt: null });
      return;
    }

    let totalImported = 0;
    let totalSkipped = 0;
    let totalErrors = 0;
    const affectedMonths = new Set<string>();

    for (const connId of connectionIds) {
      try {
        // Read access token and cursor
        const tokenDoc = await db.doc(`users/${userId}/plaidTokens/${connId}`).get();
        if (!tokenDoc.exists) {
          totalErrors++;
          continue;
        }
        const tokenData = tokenDoc.data()!;
        const accessToken = tokenData.accessToken as string;
        let cursor = (tokenData.syncCursor as string) || '';

        // Fetch transactions using incremental sync
        let hasMore = true;
        const allAdded: Array<Record<string, unknown>> = [];
        const allRemoved: RemovedTransaction[] = [];

        while (hasMore) {
          const syncResponse = await plaid.transactionsSync({
            access_token: accessToken,
            cursor: cursor || undefined,
          });

          const data = syncResponse.data;
          allAdded.push(
            ...data.added.map((t) => ({
              transactionId: t.transaction_id,
              accountId: t.account_id,
              amount: t.amount,
              date: t.date,
              merchantName: t.merchant_name,
              name: t.name,
              category: t.personal_finance_category,
              pending: t.pending,
            }))
          );
          allRemoved.push(...data.removed);
          cursor = data.next_cursor;
          hasMore = data.has_more;
        }

        // Filter: only non-pending debits (positive amount in Plaid = money out)
        const toImport = allAdded.filter(
          (t) => !t.pending && typeof t.amount === 'number' && t.amount > 0
        );

        // Batch deduplication: check existing fingerprints
        const fingerprints = toImport.map(
          (t) => `bank:plaid:${t.accountId}:${t.transactionId}`
        );

        const existingFingerprints = new Set<string>();
        // Firestore 'in' queries limited to 30 items per query
        for (let i = 0; i < fingerprints.length; i += 30) {
          const batch = fingerprints.slice(i, i + 30);
          const snap = await db
            .collection(`users/${userId}/expenses`)
            .where('fingerprint', 'in', batch)
            .get();
          for (const doc of snap.docs) {
            const fp = doc.data().fingerprint;
            if (fp) existingFingerprints.add(fp);
          }
        }

        // Write new expenses in batches of 500
        let writeBatch = db.batch();
        let batchCount = 0;

        for (const txn of toImport) {
          const fp = `bank:plaid:${txn.accountId}:${txn.transactionId}`;
          if (existingFingerprints.has(fp)) {
            totalSkipped++;
            continue;
          }

          const dateStr = txn.date as string;
          const month = dateStr.slice(0, 7);
          affectedMonths.add(month);

          const expenseRef = db.collection(`users/${userId}/expenses`).doc();
          writeBatch.set(expenseRef, {
            amount: txn.amount,
            amountHome: txn.amount,
            exchangeRate: 1,
            category: mapPlaidCategory(
              txn.category as { primary?: string; detailed?: string } | null
            ),
            note: (txn.merchantName as string) || (txn.name as string) || 'Bank transaction',
            date: Timestamp.fromDate(new Date(dateStr)),
            month,
            isRecurring: false,
            frequency: null,
            recurringId: null,
            recurringOccurrenceKey: null,
            fingerprint: fp,
            createdAt: FieldValue.serverTimestamp(),
          });

          totalImported++;
          batchCount++;

          if (batchCount >= 450) {
            await writeBatch.commit();
            writeBatch = db.batch();
            batchCount = 0;
          }
        }

        if (batchCount > 0) {
          await writeBatch.commit();
        }

        // Save updated cursor
        await db.doc(`users/${userId}/plaidTokens/${connId}`).update({
          syncCursor: cursor,
        });

        // Update connection's lastSyncedAt
        await db.doc(`users/${userId}/bankConnections/${connId}`).update({
          lastSyncedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      } catch (connErr) {
        console.error(`sync error for connection ${connId}:`, connErr);
        totalErrors++;
      }
    }

    // Recalculate monthly summaries for affected months
    for (const month of affectedMonths) {
      await updateMonthlySummary(userId, month);
    }

    const lastSyncAt = new Date().toISOString();
    res.json({
      importedCount: totalImported,
      skippedCount: totalSkipped,
      errorCount: totalErrors,
      lastSyncAt,
    });
  } catch (err) {
    console.error('sync-transactions error:', err);
    const message = err instanceof Error ? err.message : 'Failed to sync transactions';
    res.status(500).json({ error: message });
  }
});

// ---------------------------------------------------------------------------
// POST /plaid/disconnect
// ---------------------------------------------------------------------------
plaidRouter.post('/disconnect', async (req: Request, res: Response) => {
  try {
    const userId: string = res.locals.uid;
    const { connectionId } = req.body;

    if (!connectionId || typeof connectionId !== 'string') {
      res.status(400).json({ error: 'connectionId is required' });
      return;
    }

    const db = getFirestore();
    const plaid = getPlaidClient();

    // Read access token
    const tokenDoc = await db.doc(`users/${userId}/plaidTokens/${connectionId}`).get();

    if (tokenDoc.exists) {
      const accessToken = tokenDoc.data()?.accessToken as string | undefined;

      // Revoke Plaid access (best-effort)
      if (accessToken) {
        try {
          await plaid.itemRemove({ access_token: accessToken });
        } catch (plaidErr) {
          console.warn('Plaid itemRemove failed (continuing):', plaidErr);
        }
      }

      // Delete the token document
      await db.doc(`users/${userId}/plaidTokens/${connectionId}`).delete();
    }

    // Mark the connection as disconnected
    const connRef = db.doc(`users/${userId}/bankConnections/${connectionId}`);
    const connDoc = await connRef.get();
    if (connDoc.exists) {
      await connRef.update({
        status: 'disconnected',
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('disconnect error:', err);
    const message = err instanceof Error ? err.message : 'Failed to disconnect';
    res.status(500).json({ error: message });
  }
});
