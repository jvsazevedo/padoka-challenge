import { useState, useMemo } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './modules/Dashboard';
import Products from './modules/Products';
import Users from './modules/Users';
import Sales from './modules/Sales';
import PDV from './modules/PDV';
import Login from './modules/Login';
import RequireAuth from './guards/RequireAuth';
import { MODULE_PERMISSION_MAP } from './guards/RequireAuth';
import { Loader2 } from 'lucide-react';

const MODULE_ORDER = ['dashboard', 'pdv', 'products', 'sales', 'users'];
const BACK_FROM_PDV_ORDER = ['dashboard', 'sales', 'products'];

function AppContent() {
  const { isAuthenticated, isLoading, hasPermission } = useAuth();

  const defaultModule = useMemo(() => {
    for (const mod of MODULE_ORDER) {
      const mapping = MODULE_PERMISSION_MAP[mod];
      if (!mapping || hasPermission(mapping.module, mapping.action)) return mod;
    }
    return 'pdv';
  }, [hasPermission]);

  const pdvBackTarget = useMemo(() => {
    for (const mod of BACK_FROM_PDV_ORDER) {
      const mapping = MODULE_PERMISSION_MAP[mod];
      if (mapping && hasPermission(mapping.module, mapping.action)) return mod;
    }
    return null; // No back target — PDV is the home
  }, [hasPermission]);

  const [activeModule, setActiveModule] = useState(defaultModule);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-cream-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-bakery-500" size={40} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  const renderModule = () => {
    switch (activeModule) {
      case 'dashboard':
        return <Dashboard />;
      case 'pdv':
        return <PDV onBack={pdvBackTarget ? () => setActiveModule(pdvBackTarget) : undefined} />;
      case 'products':
        return <Products />;
      case 'users':
        return <Users />;
      case 'sales':
        return <Sales />;
      default:
        return <PDV onBack={pdvBackTarget ? () => setActiveModule(pdvBackTarget) : undefined} />;
    }
  };

  return (
    <div className="min-h-screen bg-cream-50">
      <Sidebar activeModule={activeModule} onModuleChange={setActiveModule} />
      <Header />
      <main className="ml-64 pt-20 p-8">
        <RequireAuth module={activeModule}>
          {renderModule()}
        </RequireAuth>
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
