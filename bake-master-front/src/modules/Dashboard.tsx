import { useEffect, useState } from 'react';
import { TrendingUp, ShoppingBag, DollarSign, AlertTriangle, Package, Loader2 } from 'lucide-react';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import { fetchDashboardData, type DashboardData } from '../api/dashboard';
import type { Sale } from '../api/sales';

interface MetricCardProps {
  title: string;
  value: string;
  change: string;
  icon: React.ReactNode;
  trend: 'up' | 'down';
}

function MetricCard({ title, value, change, icon, trend }: MetricCardProps) {
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <h3 className="text-3xl font-bold text-gray-900">{value}</h3>
          <div className="flex items-center gap-1 mt-2">
            <TrendingUp size={14} className={trend === 'up' ? 'text-green-500' : 'text-red-500 rotate-180'} />
            <span className={`text-xs font-medium ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
              {change}
            </span>
            <span className="text-xs text-gray-500">vs. semana passada</span>
          </div>
        </div>
        <div className="p-3 bg-bakery-50 rounded-lg">
          {icon}
        </div>
      </div>
    </Card>
  );
}

function centsToReais(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value}%`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function formatDayOfWeek(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
}

const STATUS_LABEL: Record<Sale['status'], string> = {
  completed: 'Finalizado',
  preparing: 'Em preparo',
  ready_for_pickup: 'Pronto para retirada',
};

const STATUS_VARIANT: Record<Sale['status'], 'success' | 'warning' | 'default'> = {
  completed: 'success',
  preparing: 'warning',
  ready_for_pickup: 'default',
};

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData()
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-bakery-500" size={32} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-red-600">Erro ao carregar dados: {error}</p>
      </div>
    );
  }

  const { summary, salesTrend, lowStockProducts, recentSales } = data;
  const maxTrendValue = Math.max(...salesTrend.map(d => d.totalInCents));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-gray-600 mt-1">Visão geral do desempenho comercial</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          title="Faturamento Diário"
          value={centsToReais(summary.dailyRevenue.valueInCents)}
          change={formatPercent(summary.dailyRevenue.changePercent)}
          trend={summary.dailyRevenue.changePercent >= 0 ? 'up' : 'down'}
          icon={<DollarSign className="text-bakery-600" size={24} />}
        />
        <MetricCard
          title="Ticket Médio"
          value={centsToReais(summary.averageTicket.valueInCents)}
          change={formatPercent(summary.averageTicket.changePercent)}
          trend={summary.averageTicket.changePercent >= 0 ? 'up' : 'down'}
          icon={<ShoppingBag className="text-bakery-600" size={24} />}
        />
        <MetricCard
          title="Quantidade de Pedidos"
          value={String(summary.orderCount.value)}
          change={formatPercent(summary.orderCount.changePercent)}
          trend={summary.orderCount.changePercent >= 0 ? 'up' : 'down'}
          icon={<Package className="text-bakery-600" size={24} />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card title="Tendência de Vendas" subtitle="Últimos 7 dias">
            <div className="h-64 flex items-end justify-between gap-3">
              {salesTrend.map((day, index) => {
                const height = (day.totalInCents / maxTrendValue) * 100;
                return (
                  <div key={index} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full bg-gray-100 rounded-t-lg relative group cursor-pointer hover:bg-gray-200 transition-colors" style={{ height: `${height}%`, minHeight: '20px' }}>
                      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                        {centsToReais(day.totalInCents)}
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-bakery-500 to-bakery-400 rounded-t-lg"></div>
                    </div>
                    <span className="text-xs text-gray-600 font-medium">{formatDayOfWeek(day.date)}</span>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        <Card title="Produtos com Estoque Baixo" subtitle="Requer atenção">
          <div className="space-y-4">
            {lowStockProducts.map((product) => {
              const percentage = Math.round((product.stock / product.minStock) * 100);
              return (
                <div key={product.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={16} className="text-red-500" />
                      <span className="text-sm font-medium text-gray-900">{product.name}</span>
                    </div>
                    <span className="text-xs text-gray-600">{product.stock}/{product.minStock}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-red-500 h-2 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <Card title="Vendas Recentes" subtitle="Atualizações em tempo real">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Pedido</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Hora</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Itens</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Total</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentSales.map((sale) => (
                <tr key={sale.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 text-sm font-medium text-gray-900">#{sale.id.replace('sale_', '')}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{formatTime(sale.createdAt)}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {sale.items.map((i) => `${i.name} (${i.quantity}x)`).join(', ')}
                  </td>
                  <td className="py-3 px-4 text-sm font-semibold text-gray-900">{centsToReais(sale.totalInCents)}</td>
                  <td className="py-3 px-4">
                    <Badge variant={STATUS_VARIANT[sale.status]} size="sm">
                      {STATUS_LABEL[sale.status]}
                    </Badge>
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
