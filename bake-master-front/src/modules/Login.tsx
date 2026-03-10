import { useState } from 'react';
import { Loader2, LogIn } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/ui/Button';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login({ email, password });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-cream-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-bakery-500">BakeMaster Pro</h1>
          <p className="text-wheat-600 mt-2">Gestão Comercial para Padarias</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Entrar no sistema</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bakery-500 focus:border-transparent"
                placeholder="seu@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Senha</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bakery-500 focus:border-transparent"
                placeholder="••••••••"
              />
            </div>

            <Button
              variant="primary"
              type="submit"
              disabled={loading}
              icon={loading ? <Loader2 size={18} className="animate-spin" /> : <LogIn size={18} />}
            >
              <span className="w-full text-center">{loading ? 'Entrando...' : 'Entrar'}</span>
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-xs text-gray-400 text-center mb-3">Credenciais de teste</p>
            <div className="space-y-1 text-xs text-gray-500">
              <p><span className="font-medium">Admin:</span> joao@bakemaster.com</p>
              <p><span className="font-medium">Gerente:</span> maria@bakemaster.com</p>
              <p><span className="font-medium">Atendente:</span> carlos@bakemaster.com</p>
              <p className="text-gray-400 italic">Qualquer senha</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
