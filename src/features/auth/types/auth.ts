import type { AuthUser, LoginCredentials } from '@/types/contract';

export type { AuthUser, LoginCredentials, UserRole } from '@/types/contract';

export interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
}
