import { fetchProducts, type Product } from './products';
import { fetchSales, fetchSalesTrend, type Sale, type SalesTrendItem } from './sales';
import { api } from './client';

// --- Types ---

export interface DashboardSummary {
  dailyRevenue: { valueInCents: number; changePercent: number };
  averageTicket: { valueInCents: number; changePercent: number };
  orderCount: { value: number; changePercent: number };
}

export interface DashboardData {
  summary: DashboardSummary;
  salesTrend: SalesTrendItem[];
  lowStockProducts: Product[];
  recentSales: Sale[];
}

// --- Mock Data ---

const MOCK_SUMMARY: DashboardSummary = {
  dailyRevenue: { valueInCents: 324000, changePercent: 12.5 },
  averageTicket: { valueInCents: 4780, changePercent: 8.2 },
  orderCount: { value: 68, changePercent: -3.1 },
};

// --- API Flag ---

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';

function mockDelay<T>(data: T, ms = 300): Promise<T> {
  return new Promise((r) => setTimeout(() => r(data), ms));
}

// --- API Functions ---

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  if (USE_MOCK) return mockDelay(MOCK_SUMMARY);
  return api.get<DashboardSummary>('/api/v1/dashboard/summary');
}

// --- Convenience: fetch all dashboard data in parallel ---

export async function fetchDashboardData(): Promise<DashboardData> {
  const [summary, salesTrend, lowStockProducts, recentSales] = await Promise.all([
    fetchDashboardSummary(),
    fetchSalesTrend('7d'),
    fetchProducts({ belowMinStock: true }),
    fetchSales({ sort: '-createdAt', limit: 10 }),
  ]);

  return { summary, salesTrend, lowStockProducts, recentSales };
}
