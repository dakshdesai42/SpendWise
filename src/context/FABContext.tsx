import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type FABAction = () => void;

interface FABContextType {
  setFABAction: (fn: FABAction | null) => void;
  triggerFAB: () => void;
}

const FABContext = createContext<FABContextType | null>(null);

export function FABProvider({ children }: { children: ReactNode }) {
  const [fabAction, setFabActionState] = useState<FABAction | null>(null);

  // Wrap setter so pages can pass a plain function (avoids the
  // setState(fn) functional-update trap with function values).
  const setFABAction = useCallback((fn: FABAction | null) => {
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

export function useFAB(): FABContextType {
  const context: FABContextType | null = useContext(FABContext);
  if (!context) {
    throw new Error("useFAB must be used within a FABProvider");
  }
  return context;
}
