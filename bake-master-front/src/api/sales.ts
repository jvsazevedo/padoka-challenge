import { api } from './client';

// --- Types ---

export type PaymentMethod = 'cash' | 'credit' | 'debit' | 'pix';
export type SaleStatus = 'preparing' | 'ready_for_pickup' | 'completed';
export type OrderType = 'counter' | 'table';

export interface SaleItem {
  productId: string;
  name: string;
  quantity: number;
  unitPriceInCents: number;
}

export interface Sale {
  id: string;
  createdAt: string;
  customer: string;
  items: SaleItem[];
  totalInCents: number;
  paymentMethod: PaymentMethod;
  status: SaleStatus;
  attendantId: string;
  /** Computed field — derived from attendantId on the backend. */
  attendantName: string;
}

export interface SalesSummary {
  totalInCents: number;
  transactionCount: number;
  averageTicketInCents: number;
  pendingCount: number;
}

export interface PaymentMethodStat {
  method: PaymentMethod;
  totalInCents: number;
  transactionCount: number;
}

export interface SalesTrendItem {
  date: string;
  totalInCents: number;
}

// --- Create Sale ---

export interface CreateSaleItem {
  productId: string;
  quantity: number;
  discountInCents: number;
}

export interface CreateSaleBody {
  items: CreateSaleItem[];
  paymentMethod: PaymentMethod;
  orderType: OrderType;
  tableNumber?: string;
  globalDiscountInCents: number;
  /**
   * Informational — the backend MUST recalculate from items.
   * Used only for client-side validation / reconciliation.
   */
  totalInCents: number;
}

// --- Mock Data ---

const MOCK_SALES: Sale[] = [
  {
    id: 'sale_001',
    createdAt: '2026-03-10T10:30:00Z',
    customer: 'Cliente Balcão',
    items: [
      { productId: 'prod_01', name: 'Pão Francês', quantity: 10, unitPriceInCents: 80 },
      { productId: 'prod_05', name: 'Café Expresso', quantity: 2, unitPriceInCents: 450 },
      { productId: 'prod_02', name: 'Pão de Forma Integral', quantity: 1, unitPriceInCents: 850 },
    ],
    totalInCents: 2850,
    paymentMethod: 'cash',
    status: 'completed',
    attendantId: 'user_03',
    attendantName: 'Carlos Oliveira',
  },
  {
    id: 'sale_002',
    createdAt: '2026-03-10T10:45:00Z',
    customer: 'Maria Silva',
    items: [
      { productId: 'prod_04', name: 'Bolo de Chocolate', quantity: 1, unitPriceInCents: 8500 },
    ],
    totalInCents: 8500,
    paymentMethod: 'credit',
    status: 'preparing',
    attendantId: 'user_04',
    attendantName: 'Ana Costa',
  },
  {
    id: 'sale_003',
    createdAt: '2026-03-10T11:00:00Z',
    customer: 'João Santos',
    items: [
      { productId: 'prod_06', name: 'Combo Café da Manhã', quantity: 1, unitPriceInCents: 2490 },
      { productId: 'prod_01', name: 'Pão Francês', quantity: 5, unitPriceInCents: 80 },
      { productId: 'prod_05', name: 'Café Expresso', quantity: 2, unitPriceInCents: 450 },
      { productId: 'prod_03', name: 'Croissant', quantity: 1, unitPriceInCents: 600 },
      { productId: 'prod_02', name: 'Pão de Forma Integral', quantity: 1, unitPriceInCents: 850 },
    ],
    totalInCents: 4200,
    paymentMethod: 'pix',
    status: 'ready_for_pickup',
    attendantId: 'user_03',
    attendantName: 'Carlos Oliveira',
  },
  {
    id: 'sale_004',
    createdAt: '2026-03-10T11:15:00Z',
    customer: 'Cliente Balcão',
    items: [
      { productId: 'prod_03', name: 'Croissant', quantity: 4, unitPriceInCents: 600 },
      { productId: 'prod_05', name: 'Café Expresso', quantity: 1, unitPriceInCents: 450 },
      { productId: 'prod_01', name: 'Pão Francês', quantity: 3, unitPriceInCents: 80 },
      { productId: 'prod_02', name: 'Pão de Forma Integral', quantity: 1, unitPriceInCents: 850 },
    ],
    totalInCents: 3500,
    paymentMethod: 'debit',
    status: 'completed',
    attendantId: 'user_04',
    attendantName: 'Ana Costa',
  },
  {
    id: 'sale_005',
    createdAt: '2026-03-10T11:30:00Z',
    customer: 'Pedro Costa',
    items: [
      { productId: 'prod_01', name: 'Pão Francês', quantity: 6, unitPriceInCents: 80 },
      { productId: 'prod_05', name: 'Café Expresso', quantity: 3, unitPriceInCents: 450 },
    ],
    totalInCents: 1950,
    paymentMethod: 'cash',
    status: 'completed',
    attendantId: 'user_03',
    attendantName: 'Carlos Oliveira',
  },
  {
    id: 'sale_006',
    createdAt: '2026-03-10T11:45:00Z',
    customer: 'Cliente Balcão',
    items: [
      { productId: 'prod_06', name: 'Combo Café da Manhã', quantity: 2, unitPriceInCents: 2490 },
      { productId: 'prod_03', name: 'Croissant', quantity: 2, unitPriceInCents: 600 },
      { productId: 'prod_05', name: 'Café Expresso', quantity: 1, unitPriceInCents: 450 },
      { productId: 'prod_01', name: 'Pão Francês', quantity: 4, unitPriceInCents: 80 },
      { productId: 'prod_04', name: 'Bolo de Chocolate', quantity: 1, unitPriceInCents: 3500 },
      { productId: 'prod_02', name: 'Pão de Forma Integral', quantity: 1, unitPriceInCents: 850 },
    ],
    totalInCents: 5800,
    paymentMethod: 'pix',
    status: 'ready_for_pickup',
    attendantId: 'user_04',
    attendantName: 'Ana Costa',
  },
];

const MOCK_SALES_TREND: SalesTrendItem[] = [
  { date: '2026-03-02', totalInCents: 85000 },
  { date: '2026-03-03', totalInCents: 92000 },
  { date: '2026-03-04', totalInCents: 110000 },
  { date: '2026-03-05', totalInCents: 98000 },
  { date: '2026-03-06', totalInCents: 135000 },
  { date: '2026-03-07', totalInCents: 180000 },
  { date: '2026-03-08', totalInCents: 120000 },
];

// --- API Flag ---

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';

function mockDelay<T>(data: T, ms = 300): Promise<T> {
  return new Promise((r) => setTimeout(() => r(structuredClone(data)), ms));
}

// --- API Functions ---

export interface FetchSalesParams {
  period?: string;
  paymentMethod?: PaymentMethod;
  status?: SaleStatus;
  sort?: string;
  limit?: number;
  offset?: number;
}

export async function fetchSales(params: FetchSalesParams = {}): Promise<Sale[]> {
  if (USE_MOCK) {
    let result = [...MOCK_SALES];
    if (params.paymentMethod) result = result.filter((s) => s.paymentMethod === params.paymentMethod);
    if (params.status) result = result.filter((s) => s.status === params.status);
    if (params.sort === '-createdAt') result = result.reverse();
    if (params.limit) {
      result = result.slice(params.offset ?? 0, (params.offset ?? 0) + params.limit);
    }
    return mockDelay(result);
  }

  const queryParams: Record<string, string> = {};
  if (params.period) queryParams.period = params.period;
  if (params.paymentMethod) queryParams.paymentMethod = params.paymentMethod;
  if (params.status) queryParams.status = params.status;
  if (params.sort) queryParams.sort = params.sort;
  if (params.limit) queryParams.limit = String(params.limit);
  if (params.offset) queryParams.offset = String(params.offset);

  return api.get<Sale[]>('/api/v1/sales', { params: queryParams });
}

export async function fetchSalesSummary(period = 'today'): Promise<SalesSummary> {
  if (USE_MOCK) {
    const totalInCents = MOCK_SALES.reduce((sum, s) => sum + s.totalInCents, 0);
    const transactionCount = MOCK_SALES.length;
    const pendingCount = MOCK_SALES.filter((s) => s.status === 'preparing' || s.status === 'ready_for_pickup').length;
    return mockDelay({
      totalInCents,
      transactionCount,
      averageTicketInCents: Math.round(totalInCents / transactionCount),
      pendingCount,
    });
  }
  return api.get<SalesSummary>('/api/v1/sales/summary', { params: { period } });
}

export async function fetchPaymentMethodStats(period = 'today'): Promise<PaymentMethodStat[]> {
  if (USE_MOCK) {
    const methods: PaymentMethod[] = ['cash', 'credit', 'debit', 'pix'];
    const stats = methods.map((method) => {
      const filtered = MOCK_SALES.filter((s) => s.paymentMethod === method);
      return {
        method,
        totalInCents: filtered.reduce((sum, s) => sum + s.totalInCents, 0),
        transactionCount: filtered.length,
      };
    });
    return mockDelay(stats);
  }
  return api.get<PaymentMethodStat[]>('/api/v1/sales/stats/payment-methods', { params: { period } });
}

export async function fetchSalesTrend(period = '7d'): Promise<SalesTrendItem[]> {
  if (USE_MOCK) return mockDelay(MOCK_SALES_TREND);
  return api.get<SalesTrendItem[]>('/api/v1/sales/trend', { params: { period } });
}

let nextSaleId = 7;

export async function createSale(body: CreateSaleBody): Promise<Sale> {
  if (USE_MOCK) {
    const sale: Sale = {
      id: `sale_${String(nextSaleId++).padStart(3, '0')}`,
      createdAt: new Date().toISOString(),
      customer: body.orderType === 'table' ? `Mesa ${body.tableNumber}` : 'Cliente Balcão',
      items: body.items.map((i) => ({
        productId: i.productId,
        name: i.productId,
        quantity: i.quantity,
        unitPriceInCents: 0,
      })),
      totalInCents: body.totalInCents,
      paymentMethod: body.paymentMethod,
      status: 'preparing',
      attendantId: 'user_01',
      attendantName: 'Admin',
    };
    MOCK_SALES.push(sale);
    return mockDelay(sale);
  }
  return api.post<Sale>('/api/v1/sales', body);
}
