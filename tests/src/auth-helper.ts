/**
 * Auth helper — login once and cache tokens for reuse across tests.
 * Each role gets its own cached session.
 */
import { api, type ApiResponse } from './client';

interface LoginResult {
  accessToken: string;
  refreshToken: string;
  userId: string;
}

const tokenCache = new Map<string, LoginResult>();

/**
 * Login with the given credentials and cache the tokens.
 * Returns cached result if already logged in with same email.
 */
export async function loginAs(email: string, password = 'any'): Promise<LoginResult> {
  const cached = tokenCache.get(email);
  if (cached) return cached;

  const res = await api.post<Record<string, unknown>>('/api/v1/auth/login', { email, password });

  if (res.status !== 200) {
    throw new Error(`Login failed for ${email}: status ${res.status} — ${JSON.stringify(res.body)}`);
  }

  const result: LoginResult = {
    accessToken: res.body.accessToken as string,
    refreshToken: res.body.refreshToken as string,
    userId: (res.body.user as Record<string, unknown>).id as string,
  };

  tokenCache.set(email, result);
  return result;
}

export async function loginAsAdmin(): Promise<LoginResult> {
  return loginAs('joao@bakemaster.com');
}

export async function loginAsManager(): Promise<LoginResult> {
  return loginAs('maria@bakemaster.com');
}

export async function loginAsAttendant(): Promise<LoginResult> {
  return loginAs('carlos@bakemaster.com');
}

export function clearTokenCache() {
  tokenCache.clear();
}
