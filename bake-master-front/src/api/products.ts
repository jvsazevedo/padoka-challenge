import { api } from './client';

// --- Types ---

export type ProductCategory = 'bread' | 'pastry' | 'beverage';

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  basePriceInCents: number;
  promoPriceInCents?: number;
  promoActive: boolean;
  stock: number;
  minStock: number;
  isCombo: boolean;
}

export interface CreateProductBody {
  name: string;
  category: ProductCategory;
  basePriceInCents: number;
  promoPriceInCents?: number;
  promoActive: boolean;
  stock: number;
  minStock: number;
  isCombo: boolean;
}

export type UpdateProductBody = Partial<CreateProductBody>;

// --- Mock Data ---

let MOCK_PRODUCTS: Product[] = [
  { id: 'prod_01', name: 'Pão Francês', category: 'bread', basePriceInCents: 80, promoPriceInCents: 70, promoActive: true, stock: 150, minStock: 100, isCombo: false },
  { id: 'prod_02', name: 'Pão de Forma Integral', category: 'bread', basePriceInCents: 850, promoPriceInCents: undefined, promoActive: false, stock: 45, minStock: 30, isCombo: false },
  { id: 'prod_03', name: 'Croissant', category: 'pastry', basePriceInCents: 600, promoPriceInCents: 500, promoActive: true, stock: 32, minStock: 30, isCombo: false },
  { id: 'prod_04', name: 'Bolo de Chocolate', category: 'pastry', basePriceInCents: 3500, promoPriceInCents: undefined, promoActive: false, stock: 8, minStock: 10, isCombo: false },
  { id: 'prod_05', name: 'Café Expresso', category: 'beverage', basePriceInCents: 450, promoPriceInCents: undefined, promoActive: false, stock: 200, minStock: 50, isCombo: false },
  { id: 'prod_06', name: 'Combo Café da Manhã', category: 'bread', basePriceInCents: 2490, promoPriceInCents: undefined, promoActive: false, stock: 15, minStock: 10, isCombo: true },
];

let nextId = 7;

// --- API Flag ---

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';

function mockDelay<T>(data: T, ms = 300): Promise<T> {
  return new Promise((r) => setTimeout(() => r(structuredClone(data)), ms));
}

// --- API Functions ---

export interface FetchProductsParams {
  belowMinStock?: boolean;
  category?: ProductCategory;
  limit?: number;
  offset?: number;
}

export async function fetchProducts(params: FetchProductsParams = {}): Promise<Product[]> {
  if (USE_MOCK) {
    let result = [...MOCK_PRODUCTS];
    if (params.belowMinStock) {
      result = result.filter((p) => p.stock < p.minStock);
    }
    if (params.category) {
      result = result.filter((p) => p.category === params.category);
    }
    if (params.limit) {
      result = result.slice(params.offset ?? 0, (params.offset ?? 0) + params.limit);
    }
    return mockDelay(result);
  }

  const queryParams: Record<string, string> = {};
  if (params.belowMinStock) queryParams.belowMinStock = 'true';
  if (params.category) queryParams.category = params.category;
  if (params.limit) queryParams.limit = String(params.limit);
  if (params.offset) queryParams.offset = String(params.offset);

  return api.get<Product[]>('/api/v1/products', { params: queryParams });
}

export async function createProduct(body: CreateProductBody): Promise<Product> {
  if (USE_MOCK) {
    const product: Product = { ...body, id: `prod_${String(nextId++).padStart(2, '0')}` };
    MOCK_PRODUCTS = [...MOCK_PRODUCTS, product];
    return mockDelay(product);
  }
  return api.post<Product>('/api/v1/products', body);
}

export async function updateProduct(id: string, body: UpdateProductBody): Promise<Product> {
  if (USE_MOCK) {
    const index = MOCK_PRODUCTS.findIndex((p) => p.id === id);
    if (index === -1) throw new Error('Product not found');
    const updated = { ...MOCK_PRODUCTS[index], ...body };
    MOCK_PRODUCTS = MOCK_PRODUCTS.map((p) => (p.id === id ? updated : p));
    return mockDelay(updated);
  }
  return api.patch<Product>(`/api/v1/products/${id}`, body);
}

export async function deleteProduct(id: string): Promise<void> {
  if (USE_MOCK) {
    MOCK_PRODUCTS = MOCK_PRODUCTS.filter((p) => p.id !== id);
    return mockDelay(undefined);
  }
  return api.delete(`/api/v1/products/${id}`);
}
