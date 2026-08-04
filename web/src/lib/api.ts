'use client';

import axios, { AxiosError } from 'axios';
import { useAuthStore } from './auth-store';
import { API_URL } from './server-api';

export { API_URL };

export const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  timeout: 15_000,
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
          const { data } = await axios.post(`${API_URL}/api/v1/auth/refresh`, { refreshToken });
          setAuth({
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            user: data.user,
          });
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
  return fallback;
}
