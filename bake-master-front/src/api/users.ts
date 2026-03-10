import { api } from './client';

// --- Types ---

export type UserRole = 'admin' | 'manager' | 'attendant';
export type UserStatus = 'active' | 'inactive';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  lastAccessAt: string;
}

export interface CreateUserBody {
  name: string;
  email: string;
  role: UserRole;
}

export type UpdateUserBody = Partial<CreateUserBody & { status: UserStatus }>;

export interface Permission {
  module: string;
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
}

// --- Mock Data ---

let MOCK_USERS: User[] = [
  { id: 'user_01', name: 'João Silva', email: 'joao@bakemaster.com', role: 'admin', status: 'active', lastAccessAt: '2026-03-10T10:30:00Z' },
  { id: 'user_02', name: 'Maria Santos', email: 'maria@bakemaster.com', role: 'manager', status: 'active', lastAccessAt: '2026-03-10T09:15:00Z' },
  { id: 'user_03', name: 'Carlos Oliveira', email: 'carlos@bakemaster.com', role: 'attendant', status: 'active', lastAccessAt: '2026-03-10T08:45:00Z' },
  { id: 'user_04', name: 'Ana Costa', email: 'ana@bakemaster.com', role: 'attendant', status: 'inactive', lastAccessAt: '2026-03-09T18:00:00Z' },
];

const MOCK_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    { module: 'Dashboard', view: true, create: true, edit: true, delete: true },
    { module: 'Produtos', view: true, create: true, edit: true, delete: true },
    { module: 'Vendas', view: true, create: true, edit: true, delete: true },
    { module: 'Usuários', view: true, create: true, edit: true, delete: true },
    { module: 'Relatórios Financeiros', view: true, create: true, edit: true, delete: true },
  ],
  manager: [
    { module: 'Dashboard', view: true, create: false, edit: false, delete: false },
    { module: 'Produtos', view: true, create: true, edit: true, delete: false },
    { module: 'Vendas', view: true, create: true, edit: true, delete: false },
    { module: 'Usuários', view: true, create: false, edit: false, delete: false },
    { module: 'Relatórios Financeiros', view: true, create: false, edit: false, delete: false },
  ],
  attendant: [
    { module: 'Dashboard', view: false, create: false, edit: false, delete: false },
    { module: 'Produtos', view: true, create: false, edit: false, delete: false },
    { module: 'Vendas', view: true, create: true, edit: false, delete: false },
    { module: 'Usuários', view: false, create: false, edit: false, delete: false },
    { module: 'Relatórios Financeiros', view: false, create: false, edit: false, delete: false },
  ],
};

let nextId = 5;

// --- API Flag ---

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';

function mockDelay<T>(data: T, ms = 300): Promise<T> {
  return new Promise((r) => setTimeout(() => r(structuredClone(data)), ms));
}

// --- API Functions ---

export interface FetchUsersParams {
  role?: UserRole;
  status?: UserStatus;
  limit?: number;
  offset?: number;
}

export async function fetchUsers(params: FetchUsersParams = {}): Promise<User[]> {
  if (USE_MOCK) {
    let result = [...MOCK_USERS];
    if (params.role) result = result.filter((u) => u.role === params.role);
    if (params.status) result = result.filter((u) => u.status === params.status);
    if (params.limit) {
      result = result.slice(params.offset ?? 0, (params.offset ?? 0) + params.limit);
    }
    return mockDelay(result);
  }

  const queryParams: Record<string, string> = {};
  if (params.role) queryParams.role = params.role;
  if (params.status) queryParams.status = params.status;
  if (params.limit) queryParams.limit = String(params.limit);
  if (params.offset) queryParams.offset = String(params.offset);

  return api.get<User[]>('/api/v1/users', { params: queryParams });
}

export async function createUser(body: CreateUserBody): Promise<User> {
  if (USE_MOCK) {
    const user: User = {
      ...body,
      id: `user_${String(nextId++).padStart(2, '0')}`,
      status: 'active',
      lastAccessAt: new Date().toISOString(),
    };
    MOCK_USERS = [...MOCK_USERS, user];
    return mockDelay(user);
  }
  return api.post<User>('/api/v1/users', body);
}

export async function updateUser(id: string, body: UpdateUserBody): Promise<User> {
  if (USE_MOCK) {
    const index = MOCK_USERS.findIndex((u) => u.id === id);
    if (index === -1) throw new Error('User not found');
    const updated = { ...MOCK_USERS[index], ...body };
    MOCK_USERS = MOCK_USERS.map((u) => (u.id === id ? updated : u));
    return mockDelay(updated);
  }
  return api.patch<User>(`/api/v1/users/${id}`, body);
}

export async function deleteUser(id: string): Promise<void> {
  if (USE_MOCK) {
    MOCK_USERS = MOCK_USERS.filter((u) => u.id !== id);
    return mockDelay(undefined);
  }
  return api.delete(`/api/v1/users/${id}`);
}

export async function fetchPermissions(role: UserRole): Promise<Permission[]> {
  if (USE_MOCK) return mockDelay(MOCK_PERMISSIONS[role]);
  return api.get<Permission[]>('/api/v1/users/permissions', { params: { role } });
}
