/** Server-side fetch helper (no auth), safe to import from Server Components — ISR-friendly. */

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export async function serverGet<T>(path: string, revalidate = 60): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}/api/v1${path}`, { next: { revalidate } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    // API unreachable (e.g. during local build) — render an empty-state instead of failing
    return null;
  }
}
