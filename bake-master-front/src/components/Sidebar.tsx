import { LayoutDashboard, Package, Users, ShoppingCart, Store } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface SidebarProps {
  activeModule: string;
  onModuleChange: (module: string) => void;
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  manager: 'Gerente',
  attendant: 'Atendente',
};

const allMenuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, permModule: 'Dashboard', permAction: 'view' as const },
  { id: 'pdv', label: 'PDV (Balcão)', icon: Store, permModule: 'Vendas', permAction: 'create' as const },
  { id: 'products', label: 'Produtos', icon: Package, permModule: 'Produtos', permAction: 'view' as const },
  { id: 'users', label: 'Usuários', icon: Users, permModule: 'Usuários', permAction: 'view' as const },
  { id: 'sales', label: 'Vendas', icon: ShoppingCart, permModule: 'Vendas', permAction: 'view' as const },
];

export default function Sidebar({ activeModule, onModuleChange }: SidebarProps) {
  const { user, hasPermission } = useAuth();

  const menuItems = allMenuItems.filter((item) => hasPermission(item.permModule, item.permAction));

  const initials = user?.name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() ?? '?';

  return (
    <aside className="w-64 bg-wheat-800 text-cream-50 h-screen fixed left-0 top-0 flex flex-col">
      <div className="p-6 border-b border-wheat-700">
        <h1 className="text-2xl font-bold text-bakery-400">BakeMaster Pro</h1>
        <p className="text-xs text-wheat-400 mt-1">Gestão Comercial</p>
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeModule === item.id;

            return (
              <li key={item.id}>
                <button
                  onClick={() => onModuleChange(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    isActive
                      ? 'bg-bakery-500 text-white shadow-lg'
                      : 'text-cream-200 hover:bg-wheat-700 hover:text-white'
                  }`}
                >
                  <Icon size={20} />
                  <span className="font-medium">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-wheat-700">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="w-10 h-10 rounded-full bg-bakery-500 flex items-center justify-center text-white font-bold">
            {initials}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-cream-100">{user?.name ?? 'Usuário'}</p>
            <p className="text-xs text-wheat-400">{ROLE_LABELS[user?.role ?? ''] ?? user?.role}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
