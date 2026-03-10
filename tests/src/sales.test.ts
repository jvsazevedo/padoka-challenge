import { describe, it, expect, beforeAll } from 'vitest';
import { api } from './client';
import { loginAsAdmin, loginAsAttendant } from './auth-helper';
import {
  assertSale,
  assertSalesSummary,
  assertPaymentMethodStat,
  assertArray,
  assertNonNegativeInt,
  assertString,
  PAYMENT_METHODS,
} from './assertions';

describe('Sales — GET /api/v1/sales', () => {
  let adminToken: string;

  beforeAll(async () => {
    adminToken = (await loginAsAdmin()).accessToken;
  });

  it('returns 200 with array of sales', async () => {
    const res = await api.get<Record<string, unknown>[]>('/api/v1/sales', adminToken);

    expect(res.status).toBe(200);
    assertArray(res.body, 'sales');
    res.body.forEach((s) => assertSale(s));
  });

  it('returns 401 without auth', async () => {
    const res = await api.get('/api/v1/sales');
    expect(res.status).toBe(401);
  });

  it('can filter by period', async () => {
    for (const period of ['today', 'week', 'month']) {
      const res = await api.get<Record<string, unknown>[]>('/api/v1/sales', adminToken, { period });
      expect(res.status, `period=${period} should return 200`).toBe(200);
      assertArray(res.body, 'sales');
    }
  });

  it('can filter by paymentMethod', async () => {
    const res = await api.get<Record<string, unknown>[]>('/api/v1/sales', adminToken, {
      paymentMethod: 'cash',
    });

    expect(res.status).toBe(200);
    assertArray(res.body, 'sales');
    res.body.forEach((s) => {
      expect(s.paymentMethod).toBe('cash');
    });
  });

  it('can filter by status', async () => {
    const res = await api.get<Record<string, unknown>[]>('/api/v1/sales', adminToken, {
      status: 'completed',
    });

    expect(res.status).toBe(200);
    assertArray(res.body, 'sales');
    res.body.forEach((s) => {
      expect(s.status).toBe('completed');
    });
  });

  it('supports sort=-createdAt (descending)', async () => {
    const res = await api.get<Record<string, unknown>[]>('/api/v1/sales', adminToken, {
      sort: '-createdAt',
    });

    expect(res.status).toBe(200);
    if (res.body.length >= 2) {
      for (let i = 0; i < res.body.length - 1; i++) {
        const current = new Date(res.body[i].createdAt as string).getTime();
        const next = new Date(res.body[i + 1].createdAt as string).getTime();
        expect(current, 'Sales should be in descending order').toBeGreaterThanOrEqual(next);
      }
    }
  });

  it('supports limit and offset', async () => {
    const full = await api.get<Record<string, unknown>[]>('/api/v1/sales', adminToken);
    if (full.body.length < 2) return;

    const page = await api.get<Record<string, unknown>[]>('/api/v1/sales', adminToken, {
      limit: '1',
      offset: '0',
    });

    expect(page.status).toBe(200);
    expect(page.body.length).toBe(1);
  });
});

describe('Sales — POST /api/v1/sales', () => {
  let adminToken: string;
  let attendantToken: string;

  beforeAll(async () => {
    adminToken = (await loginAsAdmin()).accessToken;
    attendantToken = (await loginAsAttendant()).accessToken;

    // Get a valid product ID for the sale items
    const products = await api.get<Record<string, unknown>[]>('/api/v1/products', adminToken);
    if (products.body.length > 0) {
      validProductId = products.body[0].id as string;
    }
  });

  let validProductId = 'prod_01';

  it('returns 201 with created sale (counter order)', async () => {
    const body = {
      items: [
        { productId: validProductId, quantity: 2, discountInCents: 0 },
      ],
      paymentMethod: 'cash',
      orderType: 'counter',
      globalDiscountInCents: 0,
      totalInCents: 160, // informational
    };

    const res = await api.post<Record<string, unknown>>('/api/v1/sales', body, attendantToken);

    expect(res.status).toBe(201);
    assertSale(res.body);
    expect(res.body.paymentMethod).toBe('cash');
    assertArray(res.body.items, 'sale.items');
    expect((res.body.items as unknown[]).length).toBeGreaterThanOrEqual(1);
  });

  it('returns 201 with created sale (table order)', async () => {
    const body = {
      items: [
        { productId: validProductId, quantity: 1, discountInCents: 0 },
      ],
      paymentMethod: 'pix',
      orderType: 'table',
      tableNumber: '5',
      globalDiscountInCents: 0,
      totalInCents: 80,
    };

    const res = await api.post<Record<string, unknown>>('/api/v1/sales', body, attendantToken);

    expect(res.status).toBe(201);
    assertSale(res.body);
    expect(res.body.paymentMethod).toBe('pix');
  });

  it('returns 400 or 422 for empty items', async () => {
    const res = await api.post('/api/v1/sales', {
      items: [],
      paymentMethod: 'cash',
      orderType: 'counter',
      globalDiscountInCents: 0,
      totalInCents: 0,
    }, attendantToken);

    expect([400, 422]).toContain(res.status);
  });

  it('returns 400 or 422 for invalid payment method', async () => {
    const res = await api.post('/api/v1/sales', {
      items: [{ productId: validProductId, quantity: 1, discountInCents: 0 }],
      paymentMethod: 'bitcoin',
      orderType: 'counter',
      globalDiscountInCents: 0,
      totalInCents: 100,
    }, attendantToken);

    expect([400, 422]).toContain(res.status);
  });

  it('returns 401 without auth', async () => {
    const res = await api.post('/api/v1/sales', {
      items: [{ productId: validProductId, quantity: 1, discountInCents: 0 }],
      paymentMethod: 'cash',
      orderType: 'counter',
      globalDiscountInCents: 0,
      totalInCents: 100,
    });

    expect(res.status).toBe(401);
  });

  it('new sale should have status "preparing"', async () => {
    const body = {
      items: [{ productId: validProductId, quantity: 1, discountInCents: 0 }],
      paymentMethod: 'debit',
      orderType: 'counter',
      globalDiscountInCents: 0,
      totalInCents: 80,
    };

    const res = await api.post<Record<string, unknown>>('/api/v1/sales', body, attendantToken);
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('preparing');
  });
});

describe('Sales — GET /api/v1/sales/summary', () => {
  let adminToken: string;

  beforeAll(async () => {
    adminToken = (await loginAsAdmin()).accessToken;
  });

  it('returns 200 with summary for default period', async () => {
    const res = await api.get<Record<string, unknown>>('/api/v1/sales/summary', adminToken);

    expect(res.status).toBe(200);
    assertSalesSummary(res.body);
  });

  it('returns 200 for each valid period', async () => {
    for (const period of ['today', 'week', 'month']) {
      const res = await api.get<Record<string, unknown>>(
        '/api/v1/sales/summary', adminToken, { period },
      );
      expect(res.status, `period=${period} should return 200`).toBe(200);
      assertSalesSummary(res.body);
    }
  });

  it('averageTicket is consistent with total and count', async () => {
    const res = await api.get<Record<string, unknown>>('/api/v1/sales/summary', adminToken);
    expect(res.status).toBe(200);

    const { totalInCents, transactionCount, averageTicketInCents } = res.body;
    if ((transactionCount as number) > 0) {
      const expected = Math.round((totalInCents as number) / (transactionCount as number));
      // Allow ±1 rounding tolerance
      expect(Math.abs((averageTicketInCents as number) - expected),
        'averageTicketInCents should be totalInCents / transactionCount (±1 rounding)',
      ).toBeLessThanOrEqual(1);
    }
  });

  it('returns 401 without auth', async () => {
    const res = await api.get('/api/v1/sales/summary');
    expect(res.status).toBe(401);
  });
});

describe('Sales — GET /api/v1/sales/stats/payment-methods', () => {
  let adminToken: string;

  beforeAll(async () => {
    adminToken = (await loginAsAdmin()).accessToken;
  });

  it('returns 200 with stats array', async () => {
    const res = await api.get<Record<string, unknown>[]>(
      '/api/v1/sales/stats/payment-methods', adminToken,
    );

    expect(res.status).toBe(200);
    assertArray(res.body, 'paymentStats');
    res.body.forEach((stat) => assertPaymentMethodStat(stat));
  });

  it('covers all 4 payment methods', async () => {
    const res = await api.get<Record<string, unknown>[]>(
      '/api/v1/sales/stats/payment-methods', adminToken,
    );

    expect(res.status).toBe(200);
    const methods = res.body.map((s) => s.method);
    for (const method of PAYMENT_METHODS) {
      expect(methods, `Should include stats for ${method}`).toContain(method);
    }
  });

  it('stat totals should add up to summary total', async () => {
    const [statsRes, summaryRes] = await Promise.all([
      api.get<Record<string, unknown>[]>('/api/v1/sales/stats/payment-methods', adminToken),
      api.get<Record<string, unknown>>('/api/v1/sales/summary', adminToken),
    ]);

    expect(statsRes.status).toBe(200);
    expect(summaryRes.status).toBe(200);

    const statsTotal = statsRes.body.reduce((sum, s) => sum + (s.totalInCents as number), 0);
    expect(statsTotal, 'Sum of payment method totals should equal summary total').toBe(
      summaryRes.body.totalInCents as number,
    );
  });

  it('returns 401 without auth', async () => {
    const res = await api.get('/api/v1/sales/stats/payment-methods');
    expect(res.status).toBe(401);
  });
});

describe('Sales — GET /api/v1/sales/trend', () => {
  let adminToken: string;

  beforeAll(async () => {
    adminToken = (await loginAsAdmin()).accessToken;
  });

  it('returns 200 with trend array', async () => {
    const res = await api.get<Record<string, unknown>[]>('/api/v1/sales/trend', adminToken);

    expect(res.status).toBe(200);
    assertArray(res.body, 'trend');
    res.body.forEach((item) => {
      assertString(item.date, 'trendItem.date');
      assertNonNegativeInt(item.totalInCents, 'trendItem.totalInCents');
    });
  });

  it('dates are in chronological order', async () => {
    const res = await api.get<Record<string, unknown>[]>('/api/v1/sales/trend', adminToken);
    expect(res.status).toBe(200);

    if (res.body.length >= 2) {
      for (let i = 0; i < res.body.length - 1; i++) {
        const current = res.body[i].date as string;
        const next = res.body[i + 1].date as string;
        expect(current <= next, 'Trend dates should be chronological').toBe(true);
      }
    }
  });

  it('returns 401 without auth', async () => {
    const res = await api.get('/api/v1/sales/trend');
    expect(res.status).toBe(401);
  });
});
