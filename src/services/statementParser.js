import * as pdfjsLib from 'pdfjs-dist';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { CATEGORIES } from '../utils/constants';

// Configure pdf.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export async function extractTextFromPDF(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map((item) => item.str).join(' ');
    fullText += text + '\n';
  }

  return fullText;
}

export async function parseWithAI(text, hostCurrency) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    return parseWithKeywords(text, hostCurrency);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const categoryList = CATEGORIES.map((c) => c.id).join(', ');

    const prompt = `You are a bank statement parser. Extract transactions from the following bank statement text and return them as a JSON array.

Each transaction should have:
- "date": date string in YYYY-MM-DD format
- "amount": positive number (the transaction amount)
- "note": merchant/description name
- "category": one of [${categoryList}] — pick the best match based on the merchant name

Only include debit/spending transactions (not credits/deposits).
Currency is ${hostCurrency}.

Return ONLY a valid JSON array, no markdown, no explanation.

Bank statement text:
${text.slice(0, 15000)}`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();

    // Extract JSON from response
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in AI response');
    }

    const transactions = JSON.parse(jsonMatch[0]);
    return transactions.filter(
      (t) => t.date && t.amount && t.amount > 0
    );
  } catch (err) {
    console.error('AI parsing failed, falling back to keyword matching:', err);
    return parseWithKeywords(text, hostCurrency);
  }
}

// Simple keyword-based fallback parser
function parseWithKeywords(text, hostCurrency) {
  const lines = text.split('\n').filter((l) => l.trim());
  const transactions = [];

  const dateRegex = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/;
  const amountRegex = /[\$€£₹]?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/;

  const categoryKeywords = {
    food: ['restaurant', 'cafe', 'coffee', 'pizza', 'burger', 'grocery', 'food', 'eat', 'dining', 'mcdonald', 'starbucks', 'subway', 'uber eats', 'doordash', 'grubhub'],
    transport: ['uber', 'lyft', 'taxi', 'gas', 'fuel', 'transit', 'metro', 'bus', 'train', 'parking', 'toll'],
    rent: ['rent', 'lease', 'apartment', 'housing', 'landlord', 'mortgage'],
    entertainment: ['netflix', 'spotify', 'movie', 'cinema', 'game', 'concert', 'hulu', 'disney', 'theater'],
    education: ['book', 'tuition', 'university', 'college', 'course', 'textbook', 'library', 'school'],
    shopping: ['amazon', 'walmart', 'target', 'shop', 'store', 'mall', 'clothing', 'ebay', 'online'],
    health: ['pharmacy', 'hospital', 'doctor', 'medical', 'health', 'gym', 'fitness', 'dental', 'cvs', 'walgreens'],
  };

  for (const line of lines) {
    const dateMatch = line.match(dateRegex);
    const amountMatch = line.match(amountRegex);

    if (dateMatch && amountMatch) {
      const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
      if (amount <= 0 || amount > 100000) continue;

      const lowerLine = line.toLowerCase();
      let category = 'other';
      for (const [cat, keywords] of Object.entries(categoryKeywords)) {
        if (keywords.some((kw) => lowerLine.includes(kw))) {
          category = cat;
          break;
        }
      }

      // Try to parse the date
      let dateStr;
      try {
        const parts = dateMatch[1].split(/[\/\-]/);
        if (parts[2].length === 2) parts[2] = '20' + parts[2];
        dateStr = `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
        // Validate date
        new Date(dateStr).toISOString();
      } catch {
        continue;
      }

      // Extract description (remove date and amount from line)
      const note = line
        .replace(dateRegex, '')
        .replace(amountRegex, '')
        .replace(/[\$€£₹]/g, '')
        .trim()
        .slice(0, 100) || 'Transaction';

      transactions.push({ date: dateStr, amount, note, category });
    }
  }

  return transactions;
}
