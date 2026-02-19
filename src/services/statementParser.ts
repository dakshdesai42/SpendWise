import * as pdfjsLib from 'pdfjs-dist';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { CATEGORIES } from '../utils/constants';
import { ParsedTransaction } from '../types/models';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Use a bundled worker URL so PDF parsing works without CDN/network dependency.
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export async function extractTextFromPDF(file: File): Promise<string> {
  return Promise.race([
    (async () => {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        // Preserve line breaks by grouping items by vertical position
        const itemsByY: { [key: number]: string[] } = {};
        for (const itemAny of content.items) {
          const item = itemAny as { transform: number[]; str: string };
          const y = Math.round(item.transform[5]);
          if (!itemsByY[y]) itemsByY[y] = [];
          itemsByY[y].push(item.str);
        }
        const sortedYs = Object.keys(itemsByY).map(Number).sort((a, b) => b - a);
        for (const y of sortedYs) {
          fullText += itemsByY[y].join(' ') + '\n';
        }
      }

      return fullText;
    })(),
    new Promise<string>((_, reject) => {
      setTimeout(() => reject(new Error('PDF text extraction timed out after 25s')), 25000);
    }),
  ]);
}

export function parseCSV(text: string): ParsedTransaction[] {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  // Detect delimiter: comma, semicolon, or tab
  const firstLine = lines[0];
  const delim = firstLine.includes('\t') ? '\t' : firstLine.includes(';') ? ';' : ',';

  function splitRow(row: string) {
    const cells = [];
    let current = '';
    let inQuote = false;
    for (let i = 0; i < row.length; i++) {
      const ch = row[i];
      if (ch === '"') {
        inQuote = !inQuote;
      } else if (ch === delim && !inQuote) {
        cells.push(current.trim().replace(/^"|"$/g, ''));
        current = '';
      } else {
        current += ch;
      }
    }
    cells.push(current.trim().replace(/^"|"$/g, ''));
    return cells;
  }

  const headers = splitRow(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));

  // Find relevant column indices
  const dateIdx = headers.findIndex((h) => ['date', 'transactiondate', 'postingdate', 'valuedate', 'txndate'].includes(h));
  const descIdx = headers.findIndex((h) => ['description', 'narrative', 'details', 'memo', 'merchant', 'payee', 'name', 'particulars', 'remarks'].includes(h));
  const amountIdx = headers.findIndex((h) => ['amount', 'debit', 'withdrawal', 'dr', 'debitamount', 'withdrawalamount'].includes(h));
  const creditIdx = headers.findIndex((h) => ['credit', 'deposit', 'cr', 'creditamount', 'depositamount'].includes(h));

  if (dateIdx === -1 || (amountIdx === -1 && creditIdx === -1)) {
    // Fallback: try positional guessing on first 4 columns
    return parseCSVPositional(lines, delim, splitRow);
  }

  const transactions = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitRow(lines[i]);
    if (cells.length < 2) continue;

    const rawDate = cells[dateIdx];
    const rawDesc = descIdx >= 0 ? cells[descIdx] : '';
    const rawAmount = amountIdx >= 0 ? cells[amountIdx] : '';

    const dateStr = normalizeDate(rawDate);
    if (!dateStr) continue;

    // Only import debits (spending). Skip pure credit rows unless it's a combined amount column.
    let amount = 0;
    if (amountIdx >= 0 && creditIdx >= 0) {
      // Separate debit/credit columns — only take debits
      const debit = parseAmount(rawAmount);
      if (debit <= 0) continue;
      amount = debit;
    } else if (amountIdx >= 0) {
      // Single amount column — negative = debit in many formats
      const raw = parseAmount(rawAmount);
      if (raw === 0) continue;
      amount = Math.abs(raw);
      // Skip if it looks like a credit (some banks show positives as credits)
      if (rawAmount.startsWith('+') || rawAmount.startsWith('CR')) continue;
    } else {
      continue;
    }

    if (amount <= 0 || amount > 100000) continue;

    const note = rawDesc.trim().slice(0, 120) || 'Transaction';
    const category = inferCategory(note);
    const fingerprint = buildFingerprint(dateStr, amount, note);

    transactions.push({ date: dateStr, amount, note, category, fingerprint });
  }

  return transactions;
}

function parseCSVPositional(lines: string[], _delim: string, splitRow: (row: string) => string[]): ParsedTransaction[] {
  // Last-resort: guess date is col 0, description col 1, amount col 2 or 3
  const transactions = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitRow(lines[i]);
    if (cells.length < 3) continue;
    const dateStr = normalizeDate(cells[0]);
    if (!dateStr) continue;
    const note = cells[1]?.trim().slice(0, 120) || 'Transaction';
    const rawAmt = cells[2] || cells[3] || '';
    const amount = Math.abs(parseAmount(rawAmt));
    if (amount <= 0 || amount > 100000) continue;
    const category = inferCategory(note);
    const fingerprint = buildFingerprint(dateStr, amount, note);
    transactions.push({ date: dateStr, amount, note, category, fingerprint });
  }
  return transactions;
}

function parseAmount(str: string): number {
  if (!str) return 0;
  const cleaned = str.replace(/[^0-9.\-+]/g, '');
  return parseFloat(cleaned) || 0;
}

// Normalizes many date formats to YYYY-MM-DD
export function normalizeDate(raw: string): string | null {
  if (!raw) return null;
  const s = raw.trim().replace(/['"]/g, '');

  // Already ISO: 2024-01-15
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(s.slice(0, 10));
    return isValidDate(d) ? s.slice(0, 10) : null;
  }

  // DD/MM/YYYY or DD-MM-YYYY (most international banks)
  const dmy = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    if (isValidDate(date)) return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // MM/DD/YYYY (US banks)
  const mdy = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (mdy) {
    const [, m, d, y] = mdy;
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    if (isValidDate(date)) return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // DD MMM YYYY or DD-MMM-YYYY (e.g. 15 Jan 2024)
  const dmonY = s.match(/^(\d{1,2})[\s\-]([A-Za-z]{3})[\s\-](\d{4})$/);
  if (dmonY) {
    const [, d, mon, y] = dmonY;
    const date = new Date(`${mon} ${d} ${y}`);
    if (isValidDate(date)) {
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      return `${y}-${mm}-${dd}`;
    }
  }

  // DD/MM/YY two-digit year
  const dmyShort = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})$/);
  if (dmyShort) {
    const [, d, m, y] = dmyShort;
    const fullYear = '20' + y;
    const date = new Date(Number(fullYear), Number(m) - 1, Number(d));
    if (isValidDate(date)) return `${fullYear}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  return null;
}

function isValidDate(d: Date): boolean {
  return d instanceof Date && !isNaN(d.getTime()) && d.getFullYear() >= 2000 && d.getFullYear() <= 2030;
}

export function buildFingerprint(date: string, amount: number, note: string): string {
  const normalizedNote = note.toLowerCase().replace(/\s+/g, '').slice(0, 30);
  return `${date}:${amount.toFixed(2)}:${normalizedNote}`;
}

const categoryKeywords = {
  food: ['restaurant', 'cafe', 'coffee', 'pizza', 'burger', 'grocery', 'groceries', 'food', 'eat', 'dining', 'mcdonald', 'starbucks', 'subway', 'uber eats', 'doordash', 'grubhub', 'zomato', 'swiggy', 'supermarket', 'bakery', 'diner', 'sushi', 'kfc', 'domino'],
  transport: ['uber', 'lyft', 'taxi', 'gas', 'fuel', 'transit', 'metro', 'bus', 'train', 'parking', 'toll', 'ola', 'grab', 'rapido', 'irctc', 'airline', 'flight', 'airways', 'petrol'],
  rent: ['rent', 'lease', 'apartment', 'housing', 'landlord', 'mortgage', 'property'],
  entertainment: ['netflix', 'spotify', 'movie', 'cinema', 'game', 'concert', 'hulu', 'disney', 'theater', 'youtube', 'prime video', 'apple tv', 'hotstar', 'zee5', 'gaming'],
  education: ['book', 'tuition', 'university', 'college', 'course', 'textbook', 'library', 'school', 'udemy', 'coursera', 'chegg', 'kindle', 'exam'],
  shopping: ['amazon', 'walmart', 'target', 'shop', 'store', 'mall', 'clothing', 'ebay', 'online', 'flipkart', 'myntra', 'ajio', 'zara', 'h&m', 'ikea', 'nykaa'],
  health: ['pharmacy', 'hospital', 'doctor', 'medical', 'health', 'gym', 'fitness', 'dental', 'cvs', 'walgreens', 'chemist', 'clinic', 'apollo', 'medplus'],
};

export function inferCategory(note: string): string {
  const lower = note.toLowerCase();
  for (const [cat, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some((kw) => lower.includes(kw))) return cat;
  }
  return 'other';
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function extractJsonArrayOrObject(raw: string): any {
  const trimmed = raw.trim();
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    return JSON.parse(trimmed);
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    const body = fenced[1].trim();
    if (body.startsWith('[') || body.startsWith('{')) return JSON.parse(body);
  }

  const arrayMatch = trimmed.match(/\[[\s\S]*\]/);
  if (arrayMatch) return JSON.parse(arrayMatch[0]);

  const objMatch = trimmed.match(/\{[\s\S]*\}/);
  if (objMatch) return JSON.parse(objMatch[0]);

  throw new Error('No valid JSON found in AI response');
}

function normalizeAITransactions(payload: any): ParsedTransaction[] {
  const maybeList = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.transactions)
      ? payload.transactions
      : [];

  return maybeList
    .map((t: any) => {
      const dateValue = normalizeDate(String(t?.date ?? '').trim());
      const amountValue = typeof t?.amount === 'number'
        ? Math.abs(t.amount)
        : Math.abs(parseAmount(String(t?.amount ?? '')));
      const note = String(t?.note ?? t?.description ?? t?.merchant ?? 'Transaction').trim().slice(0, 120);
      let category = String(t?.category ?? '').toLowerCase().trim();
      if (!CATEGORIES.some((c) => c.id === category)) {
        category = inferCategory(note);
      }
      if (!dateValue || !amountValue || amountValue <= 0) return null;
      return {
        date: dateValue,
        amount: amountValue,
        note,
        category,
        fingerprint: buildFingerprint(dateValue, amountValue, note),
      } as ParsedTransaction;
    })
    .filter(Boolean) as ParsedTransaction[];
}

export async function parseWithAI(text: string, hostCurrency: string, sourceFile?: File): Promise<ParsedTransaction[]> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    return parseWithKeywords(text, hostCurrency);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const categoryList = CATEGORIES.map((c) => c.id).join(', ');

    const prompt = `You are a bank statement parser. Extract all spending/debit transactions and return them as a JSON array.

Each transaction must have:
- "date": string in YYYY-MM-DD format
- "amount": positive number (absolute value of the debit amount)
- "note": merchant or description (max 80 chars, clean readable name)
- "category": one of [${categoryList}] — pick best match

Rules:
- Only include debits/spending (skip credits, deposits, refunds, interest income)
- If currency symbols appear, strip them from the amount
- If amounts have commas as thousands separator, remove them
- Currency is ${hostCurrency}

Return JSON only. Preferred shape is an array. If needed, return {"transactions":[...]}.
`;

    let result;
    if (sourceFile && sourceFile.name.toLowerCase().endsWith('.pdf')) {
      const fileData = await sourceFile.arrayBuffer();
      const inlineData = {
        inlineData: {
          data: arrayBufferToBase64(fileData),
          mimeType: 'application/pdf',
        },
      };
      result = await Promise.race([
        model.generateContent([prompt, inlineData]),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('AI parsing timed out after 25s')), 25000);
        }),
      ]);
    } else {
      result = await Promise.race([
        model.generateContent(`${prompt}\n\nBank statement text:\n${text.slice(0, 18000)}`),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('AI parsing timed out after 25s')), 25000);
        }),
      ]);
    }
    const response = result.response.text();
    const parsedPayload = extractJsonArrayOrObject(response);
    const normalized = normalizeAITransactions(parsedPayload);
    if (normalized.length > 0) return normalized;
    throw new Error('AI returned no usable transactions');
  } catch (err) {
    console.error('AI parsing failed, falling back to keyword matching:', err);
    return parseWithKeywords(text, hostCurrency);
  }
}

function parseWithKeywords(text: string, _hostCurrency: string): ParsedTransaction[] {
  const lines = text.split('\n').filter((l) => l.trim());
  const transactions = [];

  const dateRegex = /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{4}-\d{2}-\d{2}|\d{1,2}\s+[A-Za-z]{3}\s+\d{4})/;
  const amountRegex = /[\$€£₹₩¥]?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/;

  for (const line of lines) {
    const dateMatch = line.match(dateRegex);
    const amountMatch = line.match(amountRegex);
    if (!dateMatch || !amountMatch) continue;

    const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
    if (amount <= 0 || amount > 100000) continue;

    const dateStr = normalizeDate(dateMatch[1]);
    if (!dateStr) continue;

    const note = line
      .replace(dateRegex, '')
      .replace(amountRegex, '')
      .replace(/[\$€£₹₩¥]/g, '')
      .trim()
      .slice(0, 100) || 'Transaction';

    const category = inferCategory(note);
    const fingerprint = buildFingerprint(dateStr, amount, note);

    transactions.push({ date: dateStr, amount, note, category, fingerprint });
  }

  return transactions;
}
