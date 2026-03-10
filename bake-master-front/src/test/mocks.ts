import type { User, Permission, UserRole } from '../api/users';
import type { Product } from '../api/products';
import type { Sale, SalesSummary, PaymentMethodStat } from '../api/sales';
import type { DashboardSummary } from '../api/dashboard';

// ── Users ──────────────────────────────────────────────

export const MOCK_ADMIN: User = {
  id: 'user_01',
  name: 'João Silva',
  email: 'joao@bakemaster.com',
  role: 'admin',
  status: 'active',
  lastAccessAt: '2026-03-10T10:30:00Z',
};

export const MOCK_MANAGER: User = {
  id: 'user_02',
  name: 'Maria Santos',
  email: 'maria@bakemaster.com',
  role: 'manager',
  status: 'active',
  lastAccessAt: '2026-03-10T09:15:00Z',
};

export const MOCK_ATTENDANT: User = {
  id: 'user_03',
  name: 'Carlos Oliveira',
  email: 'carlos@bakemaster.com',
  role: 'attendant',
  status: 'active',
  lastAccessAt: '2026-03-10T08:45:00Z',
};

export const MOCK_USERS: User[] = [MOCK_ADMIN, MOCK_MANAGER, MOCK_ATTENDANT];

// ── Permissions ────────────────────────────────────────

const ADMIN_PERMISSIONS: Permission[] = [
  { module: 'Dashboard', view: true, create: true, edit: true, delete: true },
  { module: 'Produtos', view: true, create: true, edit: true, delete: true },
  { module: 'Vendas', view: true, create: true, edit: true, delete: true },
  { module: 'Usuários', view: true, create: true, edit: true, delete: true },
  { module: 'Relatórios Financeiros', view: true, create: true, edit: true, delete: true },
];

const MANAGER_PERMISSIONS: Permission[] = [
  { module: 'Dashboard', view: true, create: false, edit: false, delete: false },
  { module: 'Produtos', view: true, create: true, edit: true, delete: false },
  { module: 'Vendas', view: true, create: true, edit: true, delete: false },
  { module: 'Usuários', view: true, create: false, edit: false, delete: false },
  { module: 'Relatórios Financeiros', view: true, create: false, edit: false, delete: false },
];

const ATTENDANT_PERMISSIONS: Permission[] = [
  { module: 'Dashboard', view: false, create: false, edit: false, delete: false },
  { module: 'Produtos', view: true, create: false, edit: false, delete: false },
  { module: 'Vendas', view: true, create: true, edit: false, delete: false },
  { module: 'Usuários', view: false, create: false, edit: false, delete: false },
  { module: 'Relatórios Financeiros', view: false, create: false, edit: false, delete: false },
];

export const PERMISSIONS_BY_ROLE: Record<UserRole, Permission[]> = {
  admin: ADMIN_PERMISSIONS,
  manager: MANAGER_PERMISSIONS,
  attendant: ATTENDANT_PERMISSIONS,
};

export function makeHasPermission(role: UserRole) {
  const perms = PERMISSIONS_BY_ROLE[role];
  return (module: string, action: 'view' | 'create' | 'edit' | 'delete') => {
    const perm = perms.find((p) => p.module === module);
    return perm ? perm[action] : false;
  };
}

// ── Products ───────────────────────────────────────────

export const MOCK_PRODUCTS: Product[] = [
  { id: 'prod_01', name: 'Pão Francês', category: 'bread', basePriceInCents: 80, promoPriceInCents: 70, promoActive: true, stock: 150, minStock: 100, isCombo: false },
  { id: 'prod_02', name: 'Croissant', category: 'pastry', basePriceInCents: 600, promoPriceInCents: 500, promoActive: true, stock: 32, minStock: 30, isCombo: false },
  { id: 'prod_03', name: 'Café Expresso', category: 'beverage', basePriceInCents: 450, promoActive: false, stock: 200, minStock: 50, isCombo: false },
];

// ── Sales ──────────────────────────────────────────────

export const MOCK_SALES: Sale[] = [
  {
    id: 'sale_001',
    createdAt: '2026-03-10T10:30:00Z',
    customer: 'Cliente Balcão',
    items: [{ productId: 'prod_01', name: 'Pão Francês', quantity: 10, unitPriceInCents: 80 }],
    totalInCents: 800,
    paymentMethod: 'cash',
    status: 'completed',
    attendantId: 'user_03',
    attendantName: 'Carlos Oliveira',
  },
  {
    id: 'sale_002',
    createdAt: '2026-03-10T10:45:00Z',
    customer: 'Maria Silva',
    items: [{ productId: 'prod_02', name: 'Croissant', quantity: 2, unitPriceInCents: 600 }],
    totalInCents: 1200,
    paymentMethod: 'pix',
    status: 'preparing',
    attendantId: 'user_04',
    attendantName: 'Ana Costa',
  },
];

export const MOCK_SUMMARY: SalesSummary = {
  totalInCents: 2000,
  transactionCount: 2,
  averageTicketInCents: 1000,
  pendingCount: 1,
};

export const MOCK_PAYMENT_STATS: PaymentMethodStat[] = [
  { method: 'cash', totalInCents: 800, transactionCount: 1 },
  { method: 'pix', totalInCents: 1200, transactionCount: 1 },
  { method: 'credit', totalInCents: 0, transactionCount: 0 },
  { method: 'debit', totalInCents: 0, transactionCount: 0 },
];

export const MOCK_DASHBOARD_SUMMARY: DashboardSummary = {
  dailyRevenue: { valueInCents: 324000, changePercent: 12.5 },
  averageTicket: { valueInCents: 4780, changePercent: 8.2 },
  orderCount: { value: 68, changePercent: -3.1 },
};
