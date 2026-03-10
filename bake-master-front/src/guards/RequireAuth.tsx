import type { ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Lock } from 'lucide-react';

/** Maps module IDs to their Permission.module name and required action. */
const MODULE_PERMISSION_MAP: Record<string, { module: string; action: 'view' | 'create' }> = {
  dashboard: { module: 'Dashboard', action: 'view' },
  pdv: { module: 'Vendas', action: 'create' },
  products: { module: 'Produtos', action: 'view' },
  users: { module: 'Usuários', action: 'view' },
  sales: { module: 'Vendas', action: 'view' },
};

interface RequireAuthProps {
  module: string;
  children: ReactNode;
}

export default function RequireAuth({ module, children }: RequireAuthProps) {
  const { hasPermission } = useAuth();

  const mapping = MODULE_PERMISSION_MAP[module];
  if (!mapping) return <>{children}</>;

  if (!hasPermission(mapping.module, mapping.action)) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <Lock size={48} className="mb-4 text-gray-300" />
        <h3 className="text-lg font-semibold text-gray-700">Acesso Restrito</h3>
        <p className="text-sm mt-1">Você não tem permissão para acessar este módulo.</p>
      </div>
    );
  }

  return <>{children}</>;
}

export { MODULE_PERMISSION_MAP };
