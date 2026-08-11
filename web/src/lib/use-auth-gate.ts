'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';

/**
 * Lighter-weight guard than useRoleGuard: only requires "logged in", not a
 * specific role. Used by sections where a plain CUSTOMER is a legitimate
 * visitor (e.g. the seller area before they've registered a shop).
 */
export function useAuthGate() {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!accessToken) {
      router.replace('/login');
      return;
    }
    if (!user) return; // auth store not hydrated yet
    setReady(true);
  }, [accessToken, user, router]);

  return { ready, user };
}
