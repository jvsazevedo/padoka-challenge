import { api } from './client';
import type { User, UserRole } from './users';

// --- Types ---

export interface LoginBody {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginResponse extends AuthTokens {
  user: User;
}

export interface RefreshResponse {
  accessToken: string;
  expiresIn: number;
}

// --- Mock Data ---

const MOCK_CREDENTIALS: Record<string, { user: User; role: UserRole }> = {
  'joao@bakemaster.com': {
    role: 'admin',
    user: {
      id: 'user_01',
      name: 'João Silva',
      email: 'joao@bakemaster.com',
      role: 'admin',
      status: 'active',
      lastAccessAt: new Date().toISOString(),
    },
  },
  'maria@bakemaster.com': {
    role: 'manager',
    user: {
      id: 'user_02',
      name: 'Maria Santos',
      email: 'maria@bakemaster.com',
      role: 'manager',
      status: 'active',
      lastAccessAt: new Date().toISOString(),
    },
  },
  'carlos@bakemaster.com': {
    role: 'attendant',
    user: {
      id: 'user_03',
      name: 'Carlos Oliveira',
      email: 'carlos@bakemaster.com',
      role: 'attendant',
      status: 'active',
      lastAccessAt: new Date().toISOString(),
    },
  },
  'ana@bakemaster.com': {
    role: 'attendant',
    user: {
      id: 'user_04',
      name: 'Ana Costa',
      email: 'ana@bakemaster.com',
      role: 'attendant',
      status: 'inactive',
      lastAccessAt: new Date().toISOString(),
    },
  },
};

let mockAccessToken: string | null = null;
let mockRefreshToken: string | null = null;
let mockCurrentUser: User | null = null;

function generateMockToken(): string {
  return `mock_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

// --- API Flag ---

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';

function mockDelay<T>(data: T, ms = 300): Promise<T> {
  return new Promise((r) => setTimeout(() => r(structuredClone(data)), ms));
}

// --- API Functions ---

export async function login(body: LoginBody): Promise<LoginResponse> {
  if (USE_MOCK) {
    const credential = MOCK_CREDENTIALS[body.email];
    if (!credential) {
      throw new Error('Credenciais inválidas');
    }
    if (credential.user.status === 'inactive') {
      throw new Error('Usuário inativo. Contate o administrador.');
    }

    mockAccessToken = generateMockToken();
    mockRefreshToken = generateMockToken();
    mockCurrentUser = credential.user;

    return mockDelay({
      accessToken: mockAccessToken,
      refreshToken: mockRefreshToken,
      expiresIn: 900, // 15 min
      user: credential.user,
    });
  }

  return api.post<LoginResponse>('/api/v1/auth/login', body);
}

export async function refreshToken(token: string): Promise<RefreshResponse> {
  if (USE_MOCK) {
    if (!mockRefreshToken || token !== mockRefreshToken) {
      throw new Error('Refresh token inválido');
    }
    mockAccessToken = generateMockToken();
    return mockDelay({
      accessToken: mockAccessToken,
      expiresIn: 900,
    });
  }

  return api.post<RefreshResponse>('/api/v1/auth/refresh', { refreshToken: token });
}

export async function logout(token: string): Promise<void> {
  if (USE_MOCK) {
    mockAccessToken = null;
    mockRefreshToken = null;
    mockCurrentUser = null;
    return mockDelay(undefined);
  }

  return api.post('/api/v1/auth/logout', { refreshToken: token });
}

export async function fetchMe(): Promise<User> {
  if (USE_MOCK) {
    if (!mockAccessToken || !mockCurrentUser) {
      throw new Error('Não autenticado');
    }
    return mockDelay(mockCurrentUser);
  }

  return api.get<User>('/api/v1/auth/me');
}
