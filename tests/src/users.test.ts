import { describe, it, expect, beforeAll } from 'vitest';
import { api } from './client';
import { loginAsAdmin, loginAsManager, loginAsAttendant } from './auth-helper';
import { assertUser, assertPermission, assertArray } from './assertions';

describe('Users — GET /api/v1/users', () => {
  let adminToken: string;

  beforeAll(async () => {
    adminToken = (await loginAsAdmin()).accessToken;
  });

  it('returns 200 with array of users', async () => {
    const res = await api.get<Record<string, unknown>[]>('/api/v1/users', adminToken);

    expect(res.status).toBe(200);
    assertArray(res.body, 'users');
    expect(res.body.length).toBeGreaterThanOrEqual(3); // at least the seed users
    res.body.forEach((user) => assertUser(user));
  });

  it('returns 401 without auth', async () => {
    const res = await api.get('/api/v1/users');
    expect(res.status).toBe(401);
  });

  it('can filter by role', async () => {
    const res = await api.get<Record<string, unknown>[]>('/api/v1/users', adminToken, { role: 'admin' });

    expect(res.status).toBe(200);
    assertArray(res.body, 'users');
    res.body.forEach((user) => {
      expect(user.role).toBe('admin');
    });
  });

  it('can filter by status', async () => {
    const res = await api.get<Record<string, unknown>[]>('/api/v1/users', adminToken, { status: 'active' });

    expect(res.status).toBe(200);
    assertArray(res.body, 'users');
    res.body.forEach((user) => {
      expect(user.status).toBe('active');
    });
  });

  it('supports limit and offset pagination', async () => {
    const full = await api.get<Record<string, unknown>[]>('/api/v1/users', adminToken);
    if (full.body.length < 2) return; // skip if not enough data

    const page = await api.get<Record<string, unknown>[]>('/api/v1/users', adminToken, {
      limit: '1',
      offset: '0',
    });

    expect(page.status).toBe(200);
    expect(page.body.length).toBe(1);
  });
});

describe('Users — POST /api/v1/users', () => {
  let adminToken: string;
  let createdUserId: string | null = null;

  beforeAll(async () => {
    adminToken = (await loginAsAdmin()).accessToken;
  });

  it('returns 201 with created user', async () => {
    const body = {
      name: 'Test User',
      email: `test_${Date.now()}@bakemaster.com`,
      role: 'attendant',
    };
    const res = await api.post<Record<string, unknown>>('/api/v1/users', body, adminToken);

    expect(res.status).toBe(201);
    assertUser(res.body);
    expect(res.body.name).toBe(body.name);
    expect(res.body.email).toBe(body.email);
    expect(res.body.role).toBe('attendant');
    expect(res.body.status).toBe('active'); // new users should default to active

    createdUserId = res.body.id as string;
  });

  it('returns 400 or 422 for missing required fields', async () => {
    const res = await api.post('/api/v1/users', { name: 'No Email' }, adminToken);
    expect([400, 422]).toContain(res.status);
  });

  it('returns 400 or 422 for invalid role', async () => {
    const res = await api.post('/api/v1/users', {
      name: 'Bad Role',
      email: `bad_role_${Date.now()}@bakemaster.com`,
      role: 'superadmin',
    }, adminToken);
    expect([400, 422]).toContain(res.status);
  });

  it('returns 401 without auth', async () => {
    const res = await api.post('/api/v1/users', {
      name: 'Anon',
      email: 'anon@test.com',
      role: 'attendant',
    });
    expect(res.status).toBe(401);
  });

  // Cleanup
  it.skipIf(!createdUserId)('cleanup: delete created user', async () => {
    if (createdUserId) {
      await api.delete(`/api/v1/users/${createdUserId}`, adminToken);
    }
  });
});

describe('Users — PATCH /api/v1/users/{userId}', () => {
  let adminToken: string;
  let userId: string;

  beforeAll(async () => {
    adminToken = (await loginAsAdmin()).accessToken;

    // Create a user to edit
    const res = await api.post<Record<string, unknown>>('/api/v1/users', {
      name: 'Edit Target',
      email: `edit_target_${Date.now()}@bakemaster.com`,
      role: 'attendant',
    }, adminToken);
    userId = res.body.id as string;
  });

  it('returns 200 with updated user', async () => {
    const res = await api.patch<Record<string, unknown>>(`/api/v1/users/${userId}`, {
      name: 'Updated Name',
    }, adminToken);

    expect(res.status).toBe(200);
    assertUser(res.body);
    expect(res.body.name).toBe('Updated Name');
    expect(res.body.id).toBe(userId);
  });

  it('can update status to inactive', async () => {
    const res = await api.patch<Record<string, unknown>>(`/api/v1/users/${userId}`, {
      status: 'inactive',
    }, adminToken);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('inactive');
  });

  it('can update role', async () => {
    const res = await api.patch<Record<string, unknown>>(`/api/v1/users/${userId}`, {
      role: 'manager',
    }, adminToken);

    expect(res.status).toBe(200);
    expect(res.body.role).toBe('manager');
  });

  it('returns 404 for non-existent user', async () => {
    const res = await api.patch('/api/v1/users/nonexistent_id', {
      name: 'Ghost',
    }, adminToken);

    expect(res.status).toBe(404);
  });

  it('returns 401 without auth', async () => {
    const res = await api.patch(`/api/v1/users/${userId}`, { name: 'Anon' });
    expect(res.status).toBe(401);
  });
});

describe('Users — DELETE /api/v1/users/{userId}', () => {
  let adminToken: string;

  beforeAll(async () => {
    adminToken = (await loginAsAdmin()).accessToken;
  });

  it('returns 204 and actually removes the user', async () => {
    // Create a user to delete
    const createRes = await api.post<Record<string, unknown>>('/api/v1/users', {
      name: 'To Delete',
      email: `delete_me_${Date.now()}@bakemaster.com`,
      role: 'attendant',
    }, adminToken);
    const userId = createRes.body.id as string;

    const deleteRes = await api.delete(`/api/v1/users/${userId}`, adminToken);
    expect(deleteRes.status).toBe(204);

    // Confirm it's gone — should be 404 or not in the list
    const getRes = await api.get<Record<string, unknown>[]>('/api/v1/users', adminToken);
    const found = getRes.body.find((u) => u.id === userId);
    expect(found, 'Deleted user should not appear in list').toBeUndefined();
  });

  it('returns 404 for non-existent user', async () => {
    const res = await api.delete('/api/v1/users/nonexistent_id', adminToken);
    expect(res.status).toBe(404);
  });

  it('returns 401 without auth', async () => {
    const res = await api.delete('/api/v1/users/any_id');
    expect(res.status).toBe(401);
  });
});

describe('Users — GET /api/v1/users/permissions', () => {
  let adminToken: string;

  beforeAll(async () => {
    adminToken = (await loginAsAdmin()).accessToken;
  });

  it('returns permissions for admin role', async () => {
    const res = await api.get<Record<string, unknown>[]>(
      '/api/v1/users/permissions', adminToken, { role: 'admin' },
    );

    expect(res.status).toBe(200);
    assertArray(res.body, 'permissions');
    expect(res.body.length).toBeGreaterThan(0);
    res.body.forEach((perm) => assertPermission(perm));

    // Admin should have full access
    const prodPerm = res.body.find((p) => p.module === 'Produtos');
    expect(prodPerm, 'Admin should have Produtos permission').toBeDefined();
    expect(prodPerm!.view).toBe(true);
    expect(prodPerm!.create).toBe(true);
    expect(prodPerm!.edit).toBe(true);
    expect(prodPerm!.delete).toBe(true);
  });

  it('returns permissions for manager role', async () => {
    const res = await api.get<Record<string, unknown>[]>(
      '/api/v1/users/permissions', adminToken, { role: 'manager' },
    );

    expect(res.status).toBe(200);
    assertArray(res.body, 'permissions');
    res.body.forEach((perm) => assertPermission(perm));

    // Manager should NOT be able to delete products
    const prodPerm = res.body.find((p) => p.module === 'Produtos');
    expect(prodPerm).toBeDefined();
    expect(prodPerm!.delete).toBe(false);

    // Manager should NOT CRUD users
    const userPerm = res.body.find((p) => p.module === 'Usuários');
    expect(userPerm).toBeDefined();
    expect(userPerm!.create).toBe(false);
    expect(userPerm!.edit).toBe(false);
    expect(userPerm!.delete).toBe(false);
  });

  it('returns permissions for attendant role', async () => {
    const res = await api.get<Record<string, unknown>[]>(
      '/api/v1/users/permissions', adminToken, { role: 'attendant' },
    );

    expect(res.status).toBe(200);
    assertArray(res.body, 'permissions');
    res.body.forEach((perm) => assertPermission(perm));

    // Attendant should NOT view dashboard
    const dashPerm = res.body.find((p) => p.module === 'Dashboard');
    expect(dashPerm).toBeDefined();
    expect(dashPerm!.view).toBe(false);

    // Attendant should NOT view users
    const userPerm = res.body.find((p) => p.module === 'Usuários');
    expect(userPerm).toBeDefined();
    expect(userPerm!.view).toBe(false);

    // Attendant CAN create sales
    const salesPerm = res.body.find((p) => p.module === 'Vendas');
    expect(salesPerm).toBeDefined();
    expect(salesPerm!.create).toBe(true);

    // Attendant should NOT view financial reports
    const reportPerm = res.body.find((p) => p.module === 'Relatórios Financeiros');
    expect(reportPerm).toBeDefined();
    expect(reportPerm!.view).toBe(false);
  });

  it('returns 400 or 422 for missing role param', async () => {
    const res = await api.get('/api/v1/users/permissions', adminToken);
    expect([400, 422]).toContain(res.status);
  });

  it('returns 400 or 422 for invalid role', async () => {
    const res = await api.get('/api/v1/users/permissions', adminToken, { role: 'superuser' });
    expect([400, 422]).toContain(res.status);
  });
});
