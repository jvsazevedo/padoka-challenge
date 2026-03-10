/**
 * Shared assertion helpers for strict but fair validation.
 *
 * - Validates REQUIRED fields exist and have correct types
 * - Does NOT fail on extra fields (backend may add fields)
 * - Validates formats (ISO 8601, enum values, positive integers)
 */

// ── Field validators ───────────────────────────────────

export function assertString(value: unknown, label: string): asserts value is string {
  expect(typeof value, `${label} should be a string`).toBe('string');
  expect((value as string).length, `${label} should not be empty`).toBeGreaterThan(0);
}

export function assertOptionalString(value: unknown, label: string) {
  if (value !== undefined && value !== null) {
    expect(typeof value, `${label} should be a string if present`).toBe('string');
  }
}

export function assertNumber(value: unknown, label: string): asserts value is number {
  expect(typeof value, `${label} should be a number`).toBe('number');
}

export function assertNonNegativeInt(value: unknown, label: string): asserts value is number {
  assertNumber(value, label);
  expect(Number.isInteger(value), `${label} should be an integer`).toBe(true);
  expect(value, `${label} should be >= 0`).toBeGreaterThanOrEqual(0);
}

export function assertBoolean(value: unknown, label: string): asserts value is boolean {
  expect(typeof value, `${label} should be a boolean`).toBe('boolean');
}

export function assertEnum<T extends string>(value: unknown, allowed: T[], label: string): asserts value is T {
  assertString(value, label);
  expect(
    allowed.includes(value as T),
    `${label} should be one of [${allowed.join(', ')}], got "${value}"`,
  ).toBe(true);
}

export function assertISODate(value: unknown, label: string): asserts value is string {
  assertString(value, label);
  const date = new Date(value as string);
  expect(
    !isNaN(date.getTime()),
    `${label} should be a valid ISO 8601 date, got "${value}"`,
  ).toBe(true);
}

export function assertArray(value: unknown, label: string): asserts value is unknown[] {
  expect(Array.isArray(value), `${label} should be an array`).toBe(true);
}

// ── Domain validators ──────────────────────────────────

const USER_ROLES = ['admin', 'manager', 'attendant'] as const;
const USER_STATUSES = ['active', 'inactive'] as const;
const PRODUCT_CATEGORIES = ['bread', 'pastry', 'beverage'] as const;
const PAYMENT_METHODS = ['cash', 'credit', 'debit', 'pix'] as const;
const SALE_STATUSES = ['preparing', 'ready_for_pickup', 'completed'] as const;
const ORDER_TYPES = ['counter', 'table'] as const;

export function assertUser(user: Record<string, unknown>) {
  assertString(user.id, 'user.id');
  assertString(user.name, 'user.name');
  assertString(user.email, 'user.email');
  assertEnum(user.role, [...USER_ROLES], 'user.role');
  assertEnum(user.status, [...USER_STATUSES], 'user.status');
  assertISODate(user.lastAccessAt, 'user.lastAccessAt');
}

export function assertProduct(product: Record<string, unknown>) {
  assertString(product.id, 'product.id');
  assertString(product.name, 'product.name');
  assertEnum(product.category, [...PRODUCT_CATEGORIES], 'product.category');
  assertNonNegativeInt(product.basePriceInCents, 'product.basePriceInCents');
  assertBoolean(product.promoActive, 'product.promoActive');
  assertNonNegativeInt(product.stock, 'product.stock');
  assertNonNegativeInt(product.minStock, 'product.minStock');
  assertBoolean(product.isCombo, 'product.isCombo');

  if (product.promoPriceInCents !== undefined && product.promoPriceInCents !== null) {
    assertNonNegativeInt(product.promoPriceInCents, 'product.promoPriceInCents');
  }
}

export function assertSaleItem(item: Record<string, unknown>) {
  assertString(item.productId, 'saleItem.productId');
  assertString(item.name, 'saleItem.name');
  assertNonNegativeInt(item.quantity, 'saleItem.quantity');
  assertNonNegativeInt(item.unitPriceInCents, 'saleItem.unitPriceInCents');
}

export function assertSale(sale: Record<string, unknown>) {
  assertString(sale.id, 'sale.id');
  assertISODate(sale.createdAt, 'sale.createdAt');
  assertString(sale.customer, 'sale.customer');
  assertArray(sale.items, 'sale.items');
  (sale.items as Record<string, unknown>[]).forEach(assertSaleItem);
  assertNonNegativeInt(sale.totalInCents, 'sale.totalInCents');
  assertEnum(sale.paymentMethod, [...PAYMENT_METHODS], 'sale.paymentMethod');
  assertEnum(sale.status, [...SALE_STATUSES], 'sale.status');
  assertString(sale.attendantId, 'sale.attendantId');
  assertString(sale.attendantName, 'sale.attendantName');
}

export function assertSalesSummary(summary: Record<string, unknown>) {
  assertNonNegativeInt(summary.totalInCents, 'summary.totalInCents');
  assertNonNegativeInt(summary.transactionCount, 'summary.transactionCount');
  assertNonNegativeInt(summary.averageTicketInCents, 'summary.averageTicketInCents');
  assertNonNegativeInt(summary.pendingCount, 'summary.pendingCount');
}

export function assertPaymentMethodStat(stat: Record<string, unknown>) {
  assertEnum(stat.method, [...PAYMENT_METHODS], 'stat.method');
  assertNonNegativeInt(stat.totalInCents, 'stat.totalInCents');
  assertNonNegativeInt(stat.transactionCount, 'stat.transactionCount');
}

export function assertPermission(perm: Record<string, unknown>) {
  assertString(perm.module, 'permission.module');
  assertBoolean(perm.view, 'permission.view');
  assertBoolean(perm.create, 'permission.create');
  assertBoolean(perm.edit, 'permission.edit');
  assertBoolean(perm.delete, 'permission.delete');
}

export function assertLoginResponse(res: Record<string, unknown>) {
  assertString(res.accessToken, 'loginResponse.accessToken');
  assertString(res.refreshToken, 'loginResponse.refreshToken');
  assertNumber(res.expiresIn, 'loginResponse.expiresIn');
  expect(res.expiresIn, 'expiresIn should be > 0').toBeGreaterThan(0);
  assertUser(res.user as Record<string, unknown>);
}

export function assertRefreshResponse(res: Record<string, unknown>) {
  assertString(res.accessToken, 'refreshResponse.accessToken');
  assertNumber(res.expiresIn, 'refreshResponse.expiresIn');
  expect(res.expiresIn, 'expiresIn should be > 0').toBeGreaterThan(0);
}

export function assertDashboardSummary(summary: Record<string, unknown>) {
  const revenue = summary.dailyRevenue as Record<string, unknown>;
  const ticket = summary.averageTicket as Record<string, unknown>;
  const orders = summary.orderCount as Record<string, unknown>;

  expect(revenue, 'dailyRevenue should exist').toBeDefined();
  assertNumber(revenue.valueInCents, 'dailyRevenue.valueInCents');
  assertNumber(revenue.changePercent, 'dailyRevenue.changePercent');

  expect(ticket, 'averageTicket should exist').toBeDefined();
  assertNumber(ticket.valueInCents, 'averageTicket.valueInCents');
  assertNumber(ticket.changePercent, 'averageTicket.changePercent');

  expect(orders, 'orderCount should exist').toBeDefined();
  assertNumber(orders.value, 'orderCount.value');
  assertNumber(orders.changePercent, 'orderCount.changePercent');
}

export { USER_ROLES, USER_STATUSES, PRODUCT_CATEGORIES, PAYMENT_METHODS, SALE_STATUSES, ORDER_TYPES };
