import { describe, it, expect, beforeAll } from 'vitest';
import { api } from './client';
import { loginAsAdmin, loginAsAttendant } from './auth-helper';
import { assertLoginResponse, assertRefreshResponse, assertUser } from './assertions';

describe('Auth — POST /api/v1/auth/login', () => {
  it('returns 200 with tokens and user for valid credentials', async () => {
    const res = await api.post<Record<string, unknown>>('/api/v1/auth/login', {
      email: 'joao@bakemaster.com',
      password: 'any',
    });

    expect(res.status).toBe(200);
    assertLoginResponse(res.body);

    expect(res.body.user).toEqual(
      expect.objectContaining({ email: 'joao@bakemaster.com', role: 'admin' }),
    );
  });

  it('returns different tokens for different users', async () => {
    const admin = await api.post<Record<string, unknown>>('/api/v1/auth/login', {
      email: 'joao@bakemaster.com',
      password: 'x',
    });
    const manager = await api.post<Record<string, unknown>>('/api/v1/auth/login', {
      email: 'maria@bakemaster.com',
      password: 'x',
    });

    expect(admin.status).toBe(200);
    expect(manager.status).toBe(200);
    expect(admin.body.accessToken).not.toBe(manager.body.accessToken);
  });

  it('returns 401 for invalid email', async () => {
    const res = await api.post('/api/v1/auth/login', {
      email: 'nobody@bakemaster.com',
      password: 'any',
    });

    expect(res.status).toBe(401);
  });

  it('returns 400 or 422 for missing email', async () => {
    const res = await api.post('/api/v1/auth/login', { password: 'any' });

    expect([400, 422]).toContain(res.status);
  });

  it('returns 400 or 422 for missing password', async () => {
    const res = await api.post('/api/v1/auth/login', { email: 'joao@bakemaster.com' });

    expect([400, 422]).toContain(res.status);
  });

  it('returns 401 or 403 for inactive user', async () => {
    const res = await api.post('/api/v1/auth/login', {
      email: 'ana@bakemaster.com',
      password: 'any',
    });

    // Accept 401 or 403 — both are valid interpretations
    expect([401, 403]).toContain(res.status);
  });

  it('returns user with correct role for each credential', async () => {
    const cases = [
      { email: 'joao@bakemaster.com', expectedRole: 'admin' },
      { email: 'maria@bakemaster.com', expectedRole: 'manager' },
      { email: 'carlos@bakemaster.com', expectedRole: 'attendant' },
    ];

    for (const { email, expectedRole } of cases) {
      const res = await api.post<Record<string, unknown>>('/api/v1/auth/login', {
        email,
        password: 'x',
      });

      expect(res.status, `${email} should login successfully`).toBe(200);
      const user = res.body.user as Record<string, unknown>;
      expect(user.role, `${email} should have role ${expectedRole}`).toBe(expectedRole);
    }
  });
});

describe('Auth — POST /api/v1/auth/refresh', () => {
  let refreshToken: string;

  beforeAll(async () => {
    const res = await api.post<Record<string, unknown>>('/api/v1/auth/login', {
      email: 'joao@bakemaster.com',
      password: 'x',
    });
    refreshToken = res.body.refreshToken as string;
  });

  it('returns 200 with new access token for valid refresh token', async () => {
    const res = await api.post<Record<string, unknown>>('/api/v1/auth/refresh', {
      refreshToken,
    });

    expect(res.status).toBe(200);
    assertRefreshResponse(res.body);
  });

  it('returns 401 for invalid refresh token', async () => {
    const res = await api.post('/api/v1/auth/refresh', {
      refreshToken: 'invalid_token_xyz',
    });

    expect(res.status).toBe(401);
  });

  it('returns 400 or 422 for missing refresh token', async () => {
    const res = await api.post('/api/v1/auth/refresh', {});

    expect([400, 422]).toContain(res.status);
  });
});

describe('Auth — GET /api/v1/auth/me', () => {
  it('returns 200 with user for valid access token', async () => {
    const { accessToken } = await loginAsAdmin();
    const res = await api.get<Record<string, unknown>>('/api/v1/auth/me', accessToken);

    expect(res.status).toBe(200);
    assertUser(res.body);
    expect(res.body.email).toBe('joao@bakemaster.com');
  });

  it('returns 401 without token', async () => {
    const res = await api.get('/api/v1/auth/me');

    expect(res.status).toBe(401);
  });

  it('returns 401 with invalid token', async () => {
    const res = await api.get('/api/v1/auth/me', 'Bearer invalid_token');

    expect(res.status).toBe(401);
  });
});

describe('Auth — POST /api/v1/auth/logout', () => {
  it('returns 204 for valid logout', async () => {
    // Login fresh to get a dedicated token pair
    const loginRes = await api.post<Record<string, unknown>>('/api/v1/auth/login', {
      email: 'joao@bakemaster.com',
      password: 'x',
    });
    const token = loginRes.body.accessToken as string;
    const refresh = loginRes.body.refreshToken as string;

    const res = await api.post('/api/v1/auth/logout', { refreshToken: refresh }, token);

    expect(res.status).toBe(204);
  });
});
