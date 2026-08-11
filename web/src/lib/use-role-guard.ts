'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import type { User } from '@/lib/types';

/**
 * Centralizes the "wait for auth hydration, then require a role" dance that was
 * previously copy-pasted (with small, inconsistent bugs) into every admin/seller
 * page. Returns `ready` once it's safe to render the protected content, and
 * `user` once known — avoiding both a flash of "access denied" during hydration
 * and the redirect-loop bugs that come from checking a stale reference.
 */
export function useRoleGuard(requiredRole: User['role']) {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!accessToken) {
      router.replace('/login');
      return;
    }
    if (!user) return; // auth store not hydrated yet — wait for next render
    if (user.role !== requiredRole) {
      router.replace('/');
      return;
    }
    setReady(true);
  }, [accessToken, user, requiredRole, router]);

  return { ready, user };
}
