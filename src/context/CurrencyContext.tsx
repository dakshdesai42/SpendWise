import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { fetchRates, convert as convertAmount, getRate as getRateUtil } from '../services/currency';
import { useAuth } from './AuthContext';
import { ExchangeRates } from '../types/models';

export interface CurrencyContextType {
  rates: ExchangeRates | null;
  loading: boolean;
  error: string | null;
  hostCurrency: string;
  homeCurrency: string;
  convert: (amount: number, from?: string, to?: string) => number;
  getRate: (from?: string, to?: string) => number;
  convertToHome: (amount: number) => number;
}

const CurrencyContext = createContext<CurrencyContextType | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const [rates, setRates] = useState<ExchangeRates | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const hostCurrency = profile?.hostCurrency || 'USD';
  const homeCurrency = profile?.homeCurrency || 'INR';

  useEffect(() => {
    if (!hostCurrency) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchRates(hostCurrency)
      .then((r) => {
        if (!cancelled) {
          setRates(r);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [hostCurrency]);

  const convert = useCallback(
    (amount: number, from?: string, to?: string) => {
      if (!rates) return amount;
      return convertAmount(amount, from || hostCurrency, to || homeCurrency, rates);
    },
    [rates, hostCurrency, homeCurrency]
  );

  const getRate = useCallback(
    (from?: string, to?: string) => {
      if (!rates) return 1;
      return getRateUtil(from || hostCurrency, to || homeCurrency, rates);
    },
    [rates, hostCurrency, homeCurrency]
  );

  const convertToHome = useCallback(
    (amount: number) => convert(amount, hostCurrency, homeCurrency),
    [convert, hostCurrency, homeCurrency]
  );

  const value: CurrencyContextType = {
    rates,
    loading,
    error,
    hostCurrency,
    homeCurrency,
    convert,
    getRate,
    convertToHome,
  };

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency(): CurrencyContextType {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}

