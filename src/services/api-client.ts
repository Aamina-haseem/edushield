import axios, { AxiosError } from 'axios';

export interface ApiError {
  message: string;
  status?: number;
  details?: unknown;
}

export const AUTH_TOKEN_KEY = 'edushield-access-token';
export const USER_STORAGE_KEY = 'edushield-auth-user';

/** "Keep me signed in" stores the session in localStorage; otherwise it lives in
 * sessionStorage — so both must be checked when attaching the token. */
export function readStoredToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY) ?? sessionStorage.getItem(AUTH_TOKEN_KEY);
}

export function clearStoredSession() {
  for (const storage of [localStorage, sessionStorage]) {
    storage.removeItem(AUTH_TOKEN_KEY);
    storage.removeItem(USER_STORAGE_KEY);
  }
}

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1',
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = readStoredToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string }>) => {
    // An expired/invalid token on any call other than the login attempt itself means the
    // session is over — send the user back to sign in instead of failing silently page by page.
    const isLoginAttempt = error.config?.url?.endsWith('/auth/login');
    if (error.response?.status === 401 && !isLoginAttempt && readStoredToken()) {
      clearStoredSession();
      if (window.location.pathname !== '/login') window.location.assign('/login');
    }

    const normalized: ApiError = {
      message: error.response?.data?.message ?? error.message ?? 'Unexpected API error',
      status: error.response?.status,
      details: error.response?.data,
    };
    return Promise.reject(normalized);
  },
);
