'use client';

import axios, { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from './auth-store';
import { API_URL, USE_MOCK } from './server-api';

export { API_URL, USE_MOCK };

/** Axios adapter that serves responses from the in-memory mock API. */
const mockAdapter: AxiosAdapter = async (config) => {
  const { handleMockRequest } = await import('./mock/handler');
  const method = (config.method ?? 'get').toUpperCase();

  let path = config.url ?? '/';
  // axios may pass absolute URL or path relative to baseURL
  if (path.startsWith('http')) {
    try {
      const u = new URL(path);
      path = u.pathname.replace(/^\/api\/v1/, '') + u.search;
    } catch {
      /* keep path */
    }
  } else {
    path = path.replace(/^\/api\/v1/, '');
    if (!path.startsWith('/')) path = `/${path}`;
  }

  // Merge params into query string
  if (config.params && typeof config.params === 'object') {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(config.params as Record<string, unknown>)) {
      if (v !== undefined && v !== null) qs.set(k, String(v));
    }
    const s = qs.toString();
    if (s) path += (path.includes('?') ? '&' : '?') + s;
  }

  const authHeader =
    (config.headers?.Authorization as string | undefined) ??
    (config.headers?.authorization as string | undefined) ??
    null;

  let body: unknown = config.data;
  if (typeof FormData !== 'undefined' && body instanceof FormData) {
    body = {};
  }

  const result = await handleMockRequest(method, path, body, authHeader);

  // Axios expects adapter to throw on HTTP error status when validateStatus fails
  const response = {
    data: result.data,
    status: result.status,
    statusText: result.status >= 400 ? 'Error' : 'OK',
    headers: { 'content-type': 'application/json' },
    config: config as InternalAxiosRequestConfig,
    request: {},
  };

  const validate = config.validateStatus ?? ((s: number) => s >= 200 && s < 300);
  if (!validate(result.status)) {
    const err = new AxiosError(
      `Request failed with status code ${result.status}`,
      String(result.status),
      config as InternalAxiosRequestConfig,
      {},
      response,
    );
    return Promise.reject(err);
  }

  return response;
};

export const api = axios.create({
  baseURL: USE_MOCK ? '/api/v1' : `${API_URL}/api/v1`,
  timeout: 15_000,
  ...(USE_MOCK ? { adapter: mockAdapter } : {}),
});

// Attach the access token to every request (client-side store)
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshing: Promise<void> | null = null;

/** On 401, try a single refresh-token rotation then retry the original request. */
api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as typeof error.config & { _retried?: boolean };
    const status = error.response?.status;
    const { refreshToken, setAuth, clear } = useAuthStore.getState();

    if (status === 401 && refreshToken && !original?._retried) {
      original._retried = true;
      try {
        refreshing ??= (async () => {
          if (USE_MOCK) {
            const { data } = await api.post('/auth/refresh', { refreshToken });
            setAuth({
              accessToken: data.accessToken,
              refreshToken: data.refreshToken,
              user: data.user,
            });
          } else {
            const { data } = await axios.post(`${API_URL}/api/v1/auth/refresh`, { refreshToken });
            setAuth({
              accessToken: data.accessToken,
              refreshToken: data.refreshToken,
              user: data.user,
            });
          }
        })();
        await refreshing;
        refreshing = null;
        return api(original);
      } catch {
        refreshing = null;
        clear();
      }
    }
    return Promise.reject(error);
  },
);

export function errorMessage(error: unknown, fallback = 'خطایی رخ داد'): string {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (Array.isArray(message)) return message.join('، ');
    if (typeof message === 'string') return message;
  }
  // Not an API error (e.g. a bug in how we parsed a response) — surface it in
  // the console so it's actually diagnosable instead of a silent generic toast.
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.error('[errorMessage] unexpected error:', error);
  }
  return fallback;
}
