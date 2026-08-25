/** Server-side fetch helper (no auth), safe to import from Server Components — ISR-friendly. */

import { MOCK_ENABLED } from './mock/data';

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export const USE_MOCK =
  MOCK_ENABLED ||
  process.env.NEXT_PUBLIC_USE_MOCK === 'true' ||
  process.env.NEXT_PUBLIC_USE_MOCK === '1';

export async function serverGet<T>(path: string, revalidate = 60): Promise<T | null> {
  if (USE_MOCK) {
    try {
      const { handleMockRequest } = await import('./mock/handler');
      const result = await handleMockRequest('GET', path);
      if (result.status >= 400) return null;
      return result.data as T;
    } catch {
      return null;
    }
  }

  try {
    const res = await fetch(`${API_URL}/api/v1${path}`, { next: { revalidate } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    // API unreachable (e.g. during local build) — render an empty-state instead of failing
    return null;
  }
}
