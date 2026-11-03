import React, { createContext, useContext } from 'react';
import { useAppState } from '../../hooks/useAppState';

type AppStateValue = ReturnType<typeof useAppState>;

const AppStateContext = createContext<AppStateValue | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const value = useAppState();
  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useApp(): AppStateValue {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useApp must be used inside AppStateProvider');
  return ctx;
}
