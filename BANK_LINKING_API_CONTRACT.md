# SpendWise Bank Linking API Contract (Plaid)

The app now calls these authenticated endpoints using:

- `Authorization: Bearer <Firebase ID token>`
- JSON body that always includes `userId`

Set client env:

- `VITE_BANK_API_BASE_URL=https://<your-bank-api-domain>`

## 1) Create Link Token

`POST /plaid/create-link-token`

Request:

```json
{
  "userId": "firebase-uid"
}
```

Response:

```json
{
  "linkToken": "link-sandbox-..."
}
```

## 2) Exchange Public Token

`POST /plaid/exchange-public-token`

Request:

```json
{
  "userId": "firebase-uid",
  "publicToken": "public-sandbox-...",
  "metadata": {
    "institution": { "name": "Chase", "institution_id": "ins_1" },
    "accounts": [{ "id": "acc_1", "name": "Checking", "mask": "0000" }],
    "link_session_id": "..."
  }
}
```

Response:

```json
{
  "connectionId": "bank_conn_abc123",
  "institutionName": "Chase"
}
```

Server should store/update:

- `users/{userId}/bankConnections/{connectionId}`
  - `provider`, `status`, `institutionName`, `accounts`, `createdAt`, `updatedAt`, `lastSyncedAt`

## 3) Sync Transactions

`POST /plaid/sync-transactions`

Request:

```json
{
  "userId": "firebase-uid",
  "connectionId": "bank_conn_abc123"
}
```

`connectionId` can be omitted/null to sync all active connections.

Response:

```json
{
  "importedCount": 12,
  "skippedCount": 31,
  "errorCount": 0,
  "lastSyncAt": "2026-02-24T07:42:31.000Z"
}
```

Deduping recommendation:

- Use `fingerprint = "bank:<provider>:<account_id>:<transaction_id>"`
- Skip if fingerprint already exists in `users/{userId}/expenses`

## 4) Disconnect Connection

`POST /plaid/disconnect`

Request:

```json
{
  "userId": "firebase-uid",
  "connectionId": "bank_conn_abc123"
}
```

Response:

```json
{
  "success": true
}
```

Server should:

- Revoke/remove provider access token
- Mark connection as disconnected (or delete)

## Security requirements

- Verify Firebase ID token on every request
- Enforce `decodedToken.uid === body.userId`
- Never expose provider access tokens to client

