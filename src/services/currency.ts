import { ExchangeRates } from '../types/models';

const PRIMARY_BASE = 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies';
const FALLBACK_BASE = 'https://latest.currency-api.pages.dev/v1/currencies';
const CACHE_KEY = 'spendwise_rates';
const CACHE_DURATION = 4 * 60 * 60 * 1000; // 4 hours

function getCached(baseCurrency: string): ExchangeRates | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    const { rates, timestamp, base } = JSON.parse(cached);
    if (base === baseCurrency && Date.now() - timestamp < CACHE_DURATION) {
      return rates;
    }
    return null;
  } catch {
    return null;
  }
}

function setCache(rates: ExchangeRates, baseCurrency: string) {
  localStorage.setItem(
    CACHE_KEY,
    JSON.stringify({ rates, timestamp: Date.now(), base: baseCurrency })
  );
}

function getStaleCached(): ExchangeRates | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    return JSON.parse(cached).rates;
  } catch {
    return null;
  }
}

export async function fetchRates(baseCurrency: string): Promise<ExchangeRates> {
  const base = baseCurrency.toLowerCase();

  const cached = getCached(baseCurrency);
  if (cached) return cached;

  // Try primary endpoint
  try {
    const res = await fetch(`${PRIMARY_BASE}/${base}.min.json`);
    if (res.ok) {
      const data = await res.json();
      const rates: ExchangeRates = data[base];
      setCache(rates, baseCurrency);
      return rates;
    }
  } catch {
    // fall through to fallback
  }

  // Try fallback endpoint
  try {
    const res = await fetch(`${FALLBACK_BASE}/${base}.min.json`);
    if (res.ok) {
      const data = await res.json();
      const rates: ExchangeRates = data[base];
      setCache(rates, baseCurrency);
      return rates;
    }
  } catch {
    // fall through to stale cache
  }

  // Return stale cache as last resort
  const stale = getStaleCached();
  if (stale) return stale;

  throw new Error('Unable to fetch exchange rates');
}

export function convert(amount: number, fromCurrency: string, toCurrency: string, rates: ExchangeRates): number {
  if (!rates || fromCurrency === toCurrency) return amount;
  const rate = rates[toCurrency.toLowerCase()];
  if (!rate) return amount;
  return amount * rate;
}

export function getRate(fromCurrency: string, toCurrency: string, rates: ExchangeRates): number {
  if (!rates || fromCurrency === toCurrency) return 1;
  return rates[toCurrency.toLowerCase()] || 1;
}
