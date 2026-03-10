import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import {
  login as apiLogin,
  logout as apiLogout,
  refreshToken as apiRefresh,
  fetchMe,
  type LoginBody,
} from '../api/auth';
import { fetchPermissions, type Permission } from '../api/users';
import type { User } from '../api/users';
import { setTokenAccessor } from '../api/client';

interface AuthState {
  user: User | null;
  permissions: Permission[];
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (body: LoginBody) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (module: string, action: 'view' | 'create' | 'edit' | 'delete') => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    permissions: [],
    isAuthenticated: false,
    isLoading: true,
  });

  const accessTokenRef = useRef<string | null>(null);
  const refreshTokenRef = useRef<string | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAuth = useCallback(() => {
    accessTokenRef.current = null;
    refreshTokenRef.current = null;
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
    setState({ user: null, permissions: [], isAuthenticated: false, isLoading: false });
  }, []);

  const scheduleRefresh = useCallback((expiresIn: number) => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);

    // Refresh 60s before expiry (or at half-life if expiresIn < 120s)
    const refreshInMs = Math.max((expiresIn - 60) * 1000, (expiresIn / 2) * 1000);

    refreshTimerRef.current = setTimeout(async () => {
      try {
        if (!refreshTokenRef.current) return;
        const res = await apiRefresh(refreshTokenRef.current);
        accessTokenRef.current = res.accessToken;
        scheduleRefresh(res.expiresIn);
      } catch {
        clearAuth();
      }
    }, refreshInMs);
  }, [clearAuth]);

  // Register token accessor so client.ts can inject Authorization header
  useEffect(() => {
    setTokenAccessor(() => accessTokenRef.current);
  }, []);

  // Try to restore session on mount
  useEffect(() => {
    const storedRefresh = sessionStorage.getItem('bm_refresh_token');
    if (!storedRefresh) {
      setState((s) => ({ ...s, isLoading: false }));
      return;
    }

    (async () => {
      try {
        const refreshRes = await apiRefresh(storedRefresh);
        accessTokenRef.current = refreshRes.accessToken;
        refreshTokenRef.current = storedRefresh;

        const user = await fetchMe();
        const permissions = await fetchPermissions(user.role);

        scheduleRefresh(refreshRes.expiresIn);
        setState({ user, permissions, isAuthenticated: true, isLoading: false });
      } catch {
        sessionStorage.removeItem('bm_refresh_token');
        clearAuth();
      }
    })();
  }, [clearAuth, scheduleRefresh]);

  const login = useCallback(async (body: LoginBody) => {
    const res = await apiLogin(body);

    accessTokenRef.current = res.accessToken;
    refreshTokenRef.current = res.refreshToken;
    sessionStorage.setItem('bm_refresh_token', res.refreshToken);

    const permissions = await fetchPermissions(res.user.role);

    scheduleRefresh(res.expiresIn);
    setState({ user: res.user, permissions, isAuthenticated: true, isLoading: false });
  }, [scheduleRefresh]);

  const logoutFn = useCallback(async () => {
    try {
      if (refreshTokenRef.current) {
        await apiLogout(refreshTokenRef.current);
      }
    } finally {
      sessionStorage.removeItem('bm_refresh_token');
      clearAuth();
    }
  }, [clearAuth]);

  const hasPermission = useCallback(
    (module: string, action: 'view' | 'create' | 'edit' | 'delete') => {
      const perm = state.permissions.find((p) => p.module === module);
      return perm ? perm[action] : false;
    },
    [state.permissions],
  );

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        logout: logoutFn,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
