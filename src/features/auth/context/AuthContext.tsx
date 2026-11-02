import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AUTH_TOKEN_KEY, fetchMe, loginRequest } from '@/features/auth/api';
import type { AuthContextValue, AuthUser, LoginCredentials } from '@/features/auth/types/auth';
import { clearStoredSession, readStoredToken, USER_STORAGE_KEY } from '@/services/api-client';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readStoredUser(): AuthUser | null {
  const stored = localStorage.getItem(USER_STORAGE_KEY) ?? sessionStorage.getItem(USER_STORAGE_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as AuthUser;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedUser = readStoredUser();
    if (storedUser && readStoredToken()) {
      setUser(storedUser);
      // Refresh in the background — clears the session if the token has expired server-side.
      fetchMe()
        .then((freshUser) => setUser(freshUser))
        .catch(() => {
          clearStoredSession();
          setUser(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async ({ email, password, rememberMe }: LoginCredentials) => {
    const { token, user: loggedInUser } = await loginRequest({ email, password, rememberMe });
    // Drop any session left in the other storage so the two can never disagree about who is signed in.
    clearStoredSession();
    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem(AUTH_TOKEN_KEY, token);
    storage.setItem(USER_STORAGE_KEY, JSON.stringify(loggedInUser));
    // Cached queries belong to whoever was signed in before — never show them to this user.
    queryClient.clear();
    setUser(loggedInUser);
  }, [queryClient]);

  const logout = useCallback(() => {
    clearStoredSession();
    queryClient.clear();
    setUser(null);
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, isAuthenticated: Boolean(user), isLoading, login, logout }),
    [user, isLoading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
