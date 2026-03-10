import { Plus, Pencil, Trash2, Tag, ToggleLeft, ToggleRight, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import {
  fetchProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  type Product,
  type ProductCategory,
  type CreateProductBody,
} from '../api/products';
import { useAuth } from '../contexts/AuthContext';

const CATEGORY_LABELS: Record<ProductCategory, string> = {
  bread: 'Pães',
  pastry: 'Confeitaria',
  beverage: 'Bebidas',
};

const CATEGORY_VARIANTS: Record<ProductCategory, 'bread' | 'pastry' | 'beverage'> = {
  bread: 'bread',
  pastry: 'pastry',
  beverage: 'beverage',
};

function centsToReais(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function centsToInputValue(cents: number): string {
  return (cents / 100).toFixed(2);
}

function reaisToCents(reais: string): number {
  const parsed = parseFloat(reais);
  return isNaN(parsed) ? 0 : Math.round(parsed * 100);
}

const EMPTY_FORM: CreateProductBody = {
  name: '',
  category: 'bread',
  basePriceInCents: 0,
  promoPriceInCents: undefined,
  promoActive: false,
  stock: 0,
  minStock: 0,
  isCombo: false,
};

export default function Products() {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('Produtos', 'create');
  const canEdit = hasPermission('Produtos', 'edit');
  const canDelete = hasPermission('Produtos', 'delete');

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateProductBody>({ ...EMPTY_FORM });
  const [submitting, setSubmitting] = useState(false);

  function loadProducts() {
    setLoading(true);
    fetchProducts()
      .then(setProducts)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadProducts();
  }, []);

  function openCreateForm() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setShowForm(true);
  }

  function openEditForm(product: Product) {
    setEditingId(product.id);
    setForm({
      name: product.name,
      category: product.category,
      basePriceInCents: product.basePriceInCents,
      promoPriceInCents: product.promoPriceInCents,
      promoActive: product.promoActive,
      stock: product.stock,
      minStock: product.minStock,
      isCombo: product.isCombo,
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
        const updated = await updateProduct(editingId, form);
        setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      } else {
        const created = await createProduct(form);
        setProducts((prev) => [...prev, created]);
      }
      closeForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar produto');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteProduct(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao remover produto');
    }
  }

  async function handleTogglePromo(product: Product) {
    try {
      const updated = await updateProduct(product.id, { promoActive: !product.promoActive });
      setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao alterar promoção');
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
          <h2 className="text-2xl font-bold text-gray-900">Gestão de Produtos</h2>
          <p className="text-gray-600 mt-1">Cadastro e controle de cardápio</p>
        </div>
        {canCreate && (
          <Button icon={<Plus size={18} />} onClick={openCreateForm}>
            Novo Produto
          </Button>
        )}
      </div>

      {showForm && (
        <Card title={editingId ? 'Editar Produto' : 'Cadastrar Novo Produto'}>
          <form className="grid grid-cols-1 md:grid-cols-2 gap-6" onSubmit={handleSubmit}>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Nome do Produto</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bakery-500 focus:border-transparent"
                placeholder="Ex: Pão de Queijo"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Categoria</label>
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as ProductCategory }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bakery-500 focus:border-transparent"
              >
                <option value="bread">Pães</option>
                <option value="pastry">Confeitaria</option>
                <option value="beverage">Bebidas</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Estoque</label>
              <input
                type="number"
                min={0}
                required
                value={form.stock || ''}
                onChange={(e) => setForm((f) => ({ ...f, stock: parseInt(e.target.value) || 0 }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bakery-500 focus:border-transparent"
                placeholder="100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Estoque Mínimo</label>
              <input
                type="number"
                min={0}
                required
                value={form.minStock || ''}
                onChange={(e) => setForm((f) => ({ ...f, minStock: parseInt(e.target.value) || 0 }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bakery-500 focus:border-transparent"
                placeholder="30"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Preço Base</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">R$</span>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  required
                  value={form.basePriceInCents ? centsToInputValue(form.basePriceInCents) : ''}
                  onChange={(e) => setForm((f) => ({ ...f, basePriceInCents: reaisToCents(e.target.value) }))}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bakery-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Preço de Promoção</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">R$</span>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={form.promoPriceInCents ? centsToInputValue(form.promoPriceInCents) : ''}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      promoPriceInCents: e.target.value ? reaisToCents(e.target.value) : undefined,
                    }))
                  }
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bakery-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.promoActive}
                  onChange={(e) => setForm((f) => ({ ...f, promoActive: e.target.checked }))}
                  className="w-5 h-5 text-bakery-500 rounded focus:ring-bakery-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-700">Ativar Promoção</span>
                  <p className="text-xs text-gray-500">O preço promocional será exibido no sistema</p>
                </div>
              </label>
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isCombo}
                  onChange={(e) => setForm((f) => ({ ...f, isCombo: e.target.checked }))}
                  className="w-5 h-5 text-bakery-500 rounded focus:ring-bakery-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-700">Produto é um Combo</span>
                  <p className="text-xs text-gray-500">Marque se este produto é composto por outros itens</p>
                </div>
              </label>
            </div>

            <div className="md:col-span-2 flex gap-3">
              <Button variant="primary" type="submit" disabled={submitting}>
                {submitting ? 'Salvando...' : editingId ? 'Atualizar Produto' : 'Salvar Produto'}
              </Button>
              <Button variant="ghost" onClick={closeForm}>Cancelar</Button>
            </div>
          </form>
        </Card>
      )}

      <Card title="Lista de Produtos" subtitle={`${products.length} produtos cadastrados`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Produto</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Categoria</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Preço Base</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Preço Promo</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Estoque</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Promoção</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Ações</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{product.name}</span>
                      {product.isCombo && (
                        <Badge variant="warning" size="sm">
                          <Tag size={12} className="mr-1" />
                          Combo
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant={CATEGORY_VARIANTS[product.category]} size="sm">
                      {CATEGORY_LABELS[product.category]}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-900">{centsToReais(product.basePriceInCents)}</td>
                  <td className="py-3 px-4">
                    {product.promoPriceInCents ? (
                      <span className="text-sm font-semibold text-bakery-600">{centsToReais(product.promoPriceInCents)}</span>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`text-sm font-medium ${product.stock < product.minStock ? 'text-red-600' : 'text-gray-900'}`}>
                      {product.stock} un
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {canEdit ? (
                      <button
                        className="text-gray-400 hover:text-bakery-500 transition-colors"
                        onClick={() => handleTogglePromo(product)}
                      >
                        {product.promoActive ? (
                          <ToggleRight size={24} className="text-bakery-500" />
                        ) : (
                          <ToggleLeft size={24} />
                        )}
                      </button>
                    ) : (
                      product.promoActive ? (
                        <ToggleRight size={24} className="text-bakery-500" />
                      ) : (
                        <ToggleLeft size={24} className="text-gray-300" />
                      )
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-2">
                      {canEdit && (
                        <button
                          className="p-2 text-gray-600 hover:text-bakery-500 hover:bg-bakery-50 rounded-lg transition-colors"
                          onClick={() => openEditForm(product)}
                        >
                          <Pencil size={16} />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          className="p-2 text-gray-600 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          onClick={() => handleDelete(product.id)}
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
  );
}
