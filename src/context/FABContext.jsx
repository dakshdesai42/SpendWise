/**
 * FABContext — lets any page register the action for the global
 * center FAB in the bottom nav. Pages call setFABAction(fn) on
 * mount and clear it on unmount.
 */
import { createContext, useContext, useState, useCallback } from 'react';

const FABContext = createContext(null);

export function FABProvider({ children }) {
  const [fabAction, setFabActionState] = useState(null);

  // Wrap setter so pages can pass a plain function (avoids the
  // setState(fn) functional-update trap with function values).
  const setFABAction = useCallback((fn) => {
    setFabActionState(() => fn ?? null);
  }, []);

  function triggerFAB() {
    if (typeof fabAction === 'function') fabAction();
  }

  return (
    <FABContext.Provider value={{ setFABAction, triggerFAB }}>
      {children}
    </FABContext.Provider>
  );
}

export function useFAB() {
  return useContext(FABContext);
}
