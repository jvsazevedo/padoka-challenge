import { describe, it, expect, beforeAll } from 'vitest';
import { api } from './client';
import { loginAsAdmin, loginAsManager, loginAsAttendant } from './auth-helper';
import { assertProduct, assertArray } from './assertions';

describe('Products — GET /api/v1/products', () => {
  let adminToken: string;

  beforeAll(async () => {
    adminToken = (await loginAsAdmin()).accessToken;
  });

  it('returns 200 with array of products', async () => {
    const res = await api.get<Record<string, unknown>[]>('/api/v1/products', adminToken);

    expect(res.status).toBe(200);
    assertArray(res.body, 'products');
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    res.body.forEach((p) => assertProduct(p));
  });

  it('returns 401 without auth', async () => {
    const res = await api.get('/api/v1/products');
    expect(res.status).toBe(401);
  });

  it('can filter by category', async () => {
    const res = await api.get<Record<string, unknown>[]>('/api/v1/products', adminToken, {
      category: 'bread',
    });

    expect(res.status).toBe(200);
    assertArray(res.body, 'products');
    res.body.forEach((p) => {
      expect(p.category).toBe('bread');
    });
  });

  it('can filter by belowMinStock', async () => {
    const res = await api.get<Record<string, unknown>[]>('/api/v1/products', adminToken, {
      belowMinStock: 'true',
    });

    expect(res.status).toBe(200);
    assertArray(res.body, 'products');
    res.body.forEach((p) => {
      expect(p.stock as number, 'stock should be below minStock').toBeLessThan(p.minStock as number);
    });
  });

  it('supports limit and offset pagination', async () => {
    const full = await api.get<Record<string, unknown>[]>('/api/v1/products', adminToken);
    if (full.body.length < 2) return;

    const page = await api.get<Record<string, unknown>[]>('/api/v1/products', adminToken, {
      limit: '1',
      offset: '0',
    });

    expect(page.status).toBe(200);
    expect(page.body.length).toBe(1);
  });
});

describe('Products — POST /api/v1/products', () => {
  let adminToken: string;
  let createdId: string;

  beforeAll(async () => {
    adminToken = (await loginAsAdmin()).accessToken;
  });

  it('returns 201 with created product', async () => {
    const body = {
      name: `Test Product ${Date.now()}`,
      category: 'pastry',
      basePriceInCents: 1500,
      promoPriceInCents: 1200,
      promoActive: false,
      stock: 50,
      minStock: 10,
      isCombo: false,
    };

    const res = await api.post<Record<string, unknown>>('/api/v1/products', body, adminToken);

    expect(res.status).toBe(201);
    assertProduct(res.body);
    expect(res.body.name).toBe(body.name);
    expect(res.body.category).toBe('pastry');
    expect(res.body.basePriceInCents).toBe(1500);
    expect(res.body.promoPriceInCents).toBe(1200);
    expect(res.body.promoActive).toBe(false);
    expect(res.body.stock).toBe(50);
    expect(res.body.minStock).toBe(10);
    expect(res.body.isCombo).toBe(false);

    createdId = res.body.id as string;
  });

  it('returns 201 for combo product', async () => {
    const body = {
      name: `Combo Test ${Date.now()}`,
      category: 'bread',
      basePriceInCents: 2500,
      promoActive: false,
      stock: 20,
      minStock: 5,
      isCombo: true,
    };

    const res = await api.post<Record<string, unknown>>('/api/v1/products', body, adminToken);
    expect(res.status).toBe(201);
    expect(res.body.isCombo).toBe(true);

    // Cleanup
    await api.delete(`/api/v1/products/${res.body.id}`, adminToken);
  });

  it('returns 400 or 422 for missing name', async () => {
    const res = await api.post('/api/v1/products', {
      category: 'bread',
      basePriceInCents: 100,
      promoActive: false,
      stock: 10,
      minStock: 5,
      isCombo: false,
    }, adminToken);

    expect([400, 422]).toContain(res.status);
  });

  it('returns 400 or 422 for invalid category', async () => {
    const res = await api.post('/api/v1/products', {
      name: 'Invalid',
      category: 'pizza',
      basePriceInCents: 100,
      promoActive: false,
      stock: 10,
      minStock: 5,
      isCombo: false,
    }, adminToken);

    expect([400, 422]).toContain(res.status);
  });

  it('returns 401 without auth', async () => {
    const res = await api.post('/api/v1/products', {
      name: 'Anon',
      category: 'bread',
      basePriceInCents: 100,
      promoActive: false,
      stock: 10,
      minStock: 5,
      isCombo: false,
    });
    expect(res.status).toBe(401);
  });

  // Cleanup
  it('cleanup: delete created product', async () => {
    if (createdId) {
      await api.delete(`/api/v1/products/${createdId}`, adminToken);
    }
  });
});

describe('Products — PATCH /api/v1/products/{productId}', () => {
  let adminToken: string;
  let productId: string;

  beforeAll(async () => {
    adminToken = (await loginAsAdmin()).accessToken;

    const res = await api.post<Record<string, unknown>>('/api/v1/products', {
      name: `Patch Target ${Date.now()}`,
      category: 'beverage',
      basePriceInCents: 500,
      promoActive: false,
      stock: 100,
      minStock: 20,
      isCombo: false,
    }, adminToken);
    productId = res.body.id as string;
  });

  it('returns 200 with updated product', async () => {
    const res = await api.patch<Record<string, unknown>>(`/api/v1/products/${productId}`, {
      name: 'Updated Beverage',
    }, adminToken);

    expect(res.status).toBe(200);
    assertProduct(res.body);
    expect(res.body.name).toBe('Updated Beverage');
    expect(res.body.id).toBe(productId);
  });

  it('can toggle promoActive', async () => {
    const res = await api.patch<Record<string, unknown>>(`/api/v1/products/${productId}`, {
      promoActive: true,
    }, adminToken);

    expect(res.status).toBe(200);
    expect(res.body.promoActive).toBe(true);
  });

  it('can update price', async () => {
    const res = await api.patch<Record<string, unknown>>(`/api/v1/products/${productId}`, {
      basePriceInCents: 750,
      promoPriceInCents: 600,
    }, adminToken);

    expect(res.status).toBe(200);
    expect(res.body.basePriceInCents).toBe(750);
    expect(res.body.promoPriceInCents).toBe(600);
  });

  it('can update stock', async () => {
    const res = await api.patch<Record<string, unknown>>(`/api/v1/products/${productId}`, {
      stock: 999,
    }, adminToken);

    expect(res.status).toBe(200);
    expect(res.body.stock).toBe(999);
  });

  it('returns 404 for non-existent product', async () => {
    const res = await api.patch('/api/v1/products/nonexistent_id', {
      name: 'Ghost',
    }, adminToken);

    expect(res.status).toBe(404);
  });

  it('returns 401 without auth', async () => {
    const res = await api.patch(`/api/v1/products/${productId}`, { name: 'Anon' });
    expect(res.status).toBe(401);
  });
});

describe('Products — DELETE /api/v1/products/{productId}', () => {
  let adminToken: string;

  beforeAll(async () => {
    adminToken = (await loginAsAdmin()).accessToken;
  });

  it('returns 204 and removes product from list', async () => {
    const createRes = await api.post<Record<string, unknown>>('/api/v1/products', {
      name: `Delete Target ${Date.now()}`,
      category: 'bread',
      basePriceInCents: 100,
      promoActive: false,
      stock: 1,
      minStock: 1,
      isCombo: false,
    }, adminToken);
    const id = createRes.body.id as string;

    const deleteRes = await api.delete(`/api/v1/products/${id}`, adminToken);
    expect(deleteRes.status).toBe(204);

    // Verify it's gone
    const listRes = await api.get<Record<string, unknown>[]>('/api/v1/products', adminToken);
    const found = listRes.body.find((p) => p.id === id);
    expect(found, 'Deleted product should not appear in list').toBeUndefined();
  });

  it('returns 404 for non-existent product', async () => {
    const res = await api.delete('/api/v1/products/nonexistent_id', adminToken);
    expect(res.status).toBe(404);
  });

  it('returns 401 without auth', async () => {
    const res = await api.delete('/api/v1/products/any_id');
    expect(res.status).toBe(401);
  });
});
