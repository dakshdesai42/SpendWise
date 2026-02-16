import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { fetchRates, convert as convertAmount, getRate as getRateUtil } from '../services/currency';
import { useAuth } from './AuthContext';

const CurrencyContext = createContext(null);

export function CurrencyProvider({ children }) {
  const { profile } = useAuth();
  const [rates, setRates] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
    (amount, from, to) => {
      if (!rates) return amount;
      return convertAmount(amount, from || hostCurrency, to || homeCurrency, rates);
    },
    [rates, hostCurrency, homeCurrency]
  );

  const getRate = useCallback(
    (from, to) => {
      if (!rates) return 1;
      return getRateUtil(from || hostCurrency, to || homeCurrency, rates);
    },
    [rates, hostCurrency, homeCurrency]
  );

  const convertToHome = useCallback(
    (amount) => convert(amount, hostCurrency, homeCurrency),
    [convert, hostCurrency, homeCurrency]
  );

  const value = {
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

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}
