"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { useAutoRefresh } from "@/lib/use-auto-refresh";

type CheckingContextValue = {
  checkingIds: Set<string>;
  isChecking: (id: string) => boolean;
  startChecking: (ids: string[]) => void;
  stopChecking: (ids: string[]) => void;
};

const CheckingContext = createContext<CheckingContextValue | null>(null);

export function CheckingProvider({ children }: { children: React.ReactNode }) {
  const [checkingIds, setCheckingIds] = useState<Set<string>>(new Set());

  const startChecking = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    setCheckingIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) next.add(id);
      return next;
    });
  }, []);

  const stopChecking = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    setCheckingIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) next.delete(id);
      return next;
    });
  }, []);

  useAutoRefresh(checkingIds.size > 0, 4000);

  const value = useMemo<CheckingContextValue>(
    () => ({
      checkingIds,
      isChecking: (id: string) => checkingIds.has(id),
      startChecking,
      stopChecking,
    }),
    [checkingIds, startChecking, stopChecking],
  );

  return (
    <CheckingContext.Provider value={value}>
      {children}
    </CheckingContext.Provider>
  );
}

export function useChecking(): CheckingContextValue {
  const ctx = useContext(CheckingContext);
  if (!ctx) {
    throw new Error("useChecking must be used within a CheckingProvider");
  }
  return ctx;
}
