import { apiClient } from '@/services/api-client';
import type { AuthUser, LoginCredentials } from '@/types/contract';

export { AUTH_TOKEN_KEY } from '@/services/api-client';

export async function loginRequest(credentials: LoginCredentials): Promise<{ token: string; user: AuthUser }> {
  const { data } = await apiClient.post<{ token: string; user: AuthUser }>('/auth/login', credentials);
  return data;
}

export async function fetchMe(): Promise<AuthUser> {
  const { data } = await apiClient.get<AuthUser>('/me');
  return data;
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await apiClient.post('/auth/change-password', { currentPassword, newPassword });
}

export async function requestPasswordReset(email: string): Promise<{ message: string }> {
  const { data } = await apiClient.post<{ message: string }>('/auth/forgot-password', { email });
  return data;
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  await apiClient.post('/auth/reset-password', { token, newPassword });
}

/** Mirrors the backend's checkPassword so users see the rule before submitting. */
export function passwordProblem(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters long.';
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return 'Password must contain at least one letter and one number.';
  return null;
}
