import { Search, Calendar, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Header() {
  const { logout } = useAuth();

  const today = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <header className="bg-white border-b border-gray-200 px-8 py-4 ml-64 fixed top-0 right-0 left-64 z-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar produtos, vendas, clientes..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-bakery-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar size={18} />
            <span className="text-sm capitalize">{today}</span>
          </div>

          <button
            onClick={logout}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Sair"
          >
            <LogOut size={18} />
            <span>Sair</span>
          </button>
        </div>
      </div>
    </header>
  );
}
