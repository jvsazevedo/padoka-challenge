import { describe, it, expect, beforeAll } from 'vitest';
import { api } from './client';
import { loginAsAdmin } from './auth-helper';
import { assertDashboardSummary } from './assertions';

describe('Dashboard — GET /api/v1/dashboard/summary', () => {
  let adminToken: string;

  beforeAll(async () => {
    adminToken = (await loginAsAdmin()).accessToken;
  });

  it('returns 200 with dashboard summary', async () => {
    const res = await api.get<Record<string, unknown>>('/api/v1/dashboard/summary', adminToken);

    expect(res.status).toBe(200);
    assertDashboardSummary(res.body);
  });

  it('dailyRevenue valueInCents is non-negative', async () => {
    const res = await api.get<Record<string, unknown>>('/api/v1/dashboard/summary', adminToken);
    expect(res.status).toBe(200);

    const revenue = res.body.dailyRevenue as Record<string, unknown>;
    expect(revenue.valueInCents as number).toBeGreaterThanOrEqual(0);
  });

  it('orderCount value is non-negative', async () => {
    const res = await api.get<Record<string, unknown>>('/api/v1/dashboard/summary', adminToken);
    expect(res.status).toBe(200);

    const orders = res.body.orderCount as Record<string, unknown>;
    expect(orders.value as number).toBeGreaterThanOrEqual(0);
  });

  it('returns 401 without auth', async () => {
    const res = await api.get('/api/v1/dashboard/summary');
    expect(res.status).toBe(401);
  });
});
