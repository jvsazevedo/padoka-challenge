import { UserPlus, Shield, Pencil, Trash2, Check, X, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import {
  fetchUsers,
  fetchPermissions,
  createUser,
  updateUser,
  deleteUser,
  type User,
  type UserRole,
  type UserStatus,
  type Permission,
  type CreateUserBody,
} from '../api/users';
import { useAuth } from '../contexts/AuthContext';

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrador',
  manager: 'Gerente',
  attendant: 'Atendente',
};

const ROLE_BADGE_VARIANT: Record<UserRole, 'danger' | 'warning' | 'default'> = {
  admin: 'danger',
  manager: 'warning',
  attendant: 'default',
};

const STATUS_LABELS: Record<UserStatus, string> = {
  active: 'Ativo',
  inactive: 'Inativo',
};

const STATUS_VARIANT: Record<UserStatus, 'success' | 'default'> = {
  active: 'success',
  inactive: 'default',
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface UserForm {
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
}

const EMPTY_FORM: UserForm = {
  name: '',
  email: '',
  role: 'attendant',
  status: 'active',
};

export default function Users() {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('Usuários', 'create');
  const canEdit = hasPermission('Usuários', 'edit');
  const canDelete = hasPermission('Usuários', 'delete');

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<UserForm>({ ...EMPTY_FORM });
  const [submitting, setSubmitting] = useState(false);

  const [selectedRole, setSelectedRole] = useState<UserRole>('admin');
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loadingPermissions, setLoadingPermissions] = useState(false);

  useEffect(() => {
    fetchUsers()
      .then(setUsers)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setLoadingPermissions(true);
    fetchPermissions(selectedRole)
      .then(setPermissions)
      .catch((err) => setError(err.message))
      .finally(() => setLoadingPermissions(false));
  }, [selectedRole]);

  function openCreateForm() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setShowForm(true);
  }

  function openEditForm(user: User) {
    setEditingId(user.id);
    setForm({
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
    });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingId) {
        const updated = await updateUser(editingId, form);
        setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      } else {
        const created = await createUser({ name: form.name, email: form.email, role: form.role });
        setUsers((prev) => [...prev, created]);
      }
      closeForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar usuário');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteUser(id);
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao remover usuário');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-bakery-500" size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-red-600">Erro ao carregar dados: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestão de Usuários</h2>
          <p className="text-gray-600 mt-1">Controle de acesso e permissões (IAM)</p>
        </div>
        {canCreate && (
          <Button icon={<UserPlus size={18} />} onClick={openCreateForm}>
            Novo Usuário
          </Button>
        )}
      </div>

      {showForm && (
        <Card title={editingId ? 'Editar Usuário' : 'Cadastrar Novo Usuário'}>
          <form className="grid grid-cols-1 md:grid-cols-2 gap-6" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nome</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bakery-500 focus:border-transparent"
                placeholder="Ex: Maria Santos"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bakery-500 focus:border-transparent"
                placeholder="maria@bakemaster.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Perfil</label>
              <select
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as UserRole }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bakery-500 focus:border-transparent"
              >
                <option value="admin">Administrador</option>
                <option value="manager">Gerente</option>
                <option value="attendant">Atendente</option>
              </select>
            </div>

            {editingId && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as UserStatus }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bakery-500 focus:border-transparent"
                >
                  <option value="active">Ativo</option>
                  <option value="inactive">Inativo</option>
                </select>
              </div>
            )}

            <div className={`flex items-end ${editingId ? 'md:col-span-2' : ''}`}>
              <div className="flex gap-3">
                <Button variant="primary" type="submit" disabled={submitting}>
                  {submitting ? 'Salvando...' : editingId ? 'Atualizar Usuário' : 'Salvar Usuário'}
                </Button>
                <Button variant="ghost" onClick={closeForm}>Cancelar</Button>
              </div>
            </div>
          </form>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card title="Usuários Cadastrados" subtitle={`${users.length} usuários no sistema`}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Nome</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Email</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Perfil</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Último Acesso</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-bakery-400 to-bakery-600 flex items-center justify-center text-white font-bold text-sm">
                            {user.name.charAt(0)}
                          </div>
                          <span className="text-sm font-medium text-gray-900">{user.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">{user.email}</td>
                      <td className="py-3 px-4">
                        <Badge variant={ROLE_BADGE_VARIANT[user.role]} size="sm">
                          <Shield size={12} className="mr-1" />
                          {ROLE_LABELS[user.role]}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={STATUS_VARIANT[user.status]} size="sm">
                          {STATUS_LABELS[user.status]}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">{formatDateTime(user.lastAccessAt)}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-2">
                          {canEdit && (
                            <button
                              className="p-2 text-gray-600 hover:text-bakery-500 hover:bg-bakery-50 rounded-lg transition-colors"
                              onClick={() => openEditForm(user)}
                            >
                              <Pencil size={16} />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              className="p-2 text-gray-600 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              onClick={() => handleDelete(user.id)}
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div>
          <Card title="Matriz de Permissões" subtitle="Visualizar por perfil">
            <div className="space-y-4">
              <div className="flex gap-2">
                {(['admin', 'manager', 'attendant'] as const).map((role) => (
                  <button
                    key={role}
                    onClick={() => setSelectedRole(role)}
                    className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      selectedRole === role
                        ? 'bg-bakery-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {ROLE_LABELS[role]}
                  </button>
                ))}
              </div>

              {loadingPermissions ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="animate-spin text-bakery-500" size={24} />
                </div>
              ) : (
                <div className="space-y-3">
                  {permissions.map((permission, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">{permission.module}</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { label: 'Visualizar', value: permission.view },
                          { label: 'Criar', value: permission.create },
                          { label: 'Editar', value: permission.edit },
                          { label: 'Excluir', value: permission.delete },
                        ].map((action, i) => (
                          <div key={i} className="flex items-center gap-2">
                            {action.value ? (
                              <Check size={14} className="text-green-500" />
                            ) : (
                              <X size={14} className="text-red-500" />
                            )}
                            <span className="text-xs text-gray-600">{action.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
