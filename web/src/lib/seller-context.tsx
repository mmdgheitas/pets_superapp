'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import type { SellerProfile } from '@/lib/types';

interface SellerContextValue {
  seller: SellerProfile | null;
  /** true once we've asked the API at least once (successfully or not) */
  loading: boolean;
  /** true when the current user has no seller record yet (never registered) */
  notRegistered: boolean;
  refresh: () => Promise<void>;
}

const SellerContext = createContext<SellerContextValue | null>(null);

export function SellerProvider({ children }: { children: ReactNode }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [seller, setSeller] = useState<SellerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notRegistered, setNotRegistered] = useState(false);

  const refresh = useCallback(async () => {
    if (!accessToken) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.get<SellerProfile>('/sellers/me');
      setSeller(data);
      setNotRegistered(false);
    } catch {
      // 403 here means either "role isn't SELLER yet" or "no Seller row" —
      // either way, from the UI's perspective the user hasn't registered a shop
      setSeller(null);
      setNotRegistered(true);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <SellerContext.Provider value={{ seller, loading, notRegistered, refresh }}>
      {children}
    </SellerContext.Provider>
  );
}

export function useSeller() {
  const ctx = useContext(SellerContext);
  if (!ctx) throw new Error('useSeller must be used within a SellerProvider');
  return ctx;
}
