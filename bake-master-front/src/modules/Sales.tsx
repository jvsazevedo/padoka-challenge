import { Download, CreditCard, Wallet, Banknote, Clock, CheckCircle, Package, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import {
  fetchSales,
  fetchSalesSummary,
  fetchPaymentMethodStats,
  type Sale,
  type SalesSummary,
  type PaymentMethodStat,
  type PaymentMethod,
  type SaleStatus,
} from '../api/sales';
import { useAuth } from '../contexts/AuthContext';

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cash: 'Dinheiro',
  credit: 'Cartão de Crédito',
  debit: 'Cartão de Débito',
  pix: 'PIX',
};

const PAYMENT_ICONS: Record<PaymentMethod, typeof CreditCard> = {
  cash: Banknote,
  credit: CreditCard,
  debit: CreditCard,
  pix: Wallet,
};

const STATUS_LABELS: Record<SaleStatus, string> = {
  preparing: 'Em preparo',
  ready_for_pickup: 'Pronto para retirada',
  completed: 'Finalizado',
};

const STATUS_ICONS: Record<SaleStatus, typeof Clock> = {
  preparing: Clock,
  ready_for_pickup: Package,
  completed: CheckCircle,
};

const STATUS_VARIANT: Record<SaleStatus, 'success' | 'warning' | 'default'> = {
  completed: 'success',
  ready_for_pickup: 'default',
  preparing: 'warning',
};

function centsToReais(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDateTime(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString('pt-BR'),
    time: d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
  };
}

export default function Sales() {
  const { hasPermission } = useAuth();
  const canExportReport = hasPermission('Relatórios Financeiros', 'view');

  const [sales, setSales] = useState<Sale[]>([]);
  const [summary, setSummary] = useState<SalesSummary | null>(null);
  const [paymentStats, setPaymentStats] = useState<PaymentMethodStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedPeriod, setSelectedPeriod] = useState('today');
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod | 'all'>('all');

  function loadData() {
    setLoading(true);
    setError(null);

    const paymentFilter = selectedPayment !== 'all' ? selectedPayment : undefined;

    Promise.all([
      fetchSales({ period: selectedPeriod, paymentMethod: paymentFilter, sort: '-createdAt' }),
      fetchSalesSummary(selectedPeriod),
      fetchPaymentMethodStats(selectedPeriod),
    ])
      .then(([salesData, summaryData, statsData]) => {
        setSales(salesData);
        setSummary(summaryData);
        setPaymentStats(statsData);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadData();
  }, [selectedPeriod, selectedPayment]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-bakery-500" size={32} />
      </div>
    );
  }

  if (error || !summary) {
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
          <h2 className="text-2xl font-bold text-gray-900">Gestão de Vendas</h2>
          <p className="text-gray-600 mt-1">Fluxo de caixa e transações</p>
        </div>
        {canExportReport && (
          <Button icon={<Download size={18} />} variant="secondary">
            Exportar Relatório
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-1">Total de Vendas</p>
            <h3 className="text-2xl font-bold text-gray-900">{centsToReais(summary.totalInCents)}</h3>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-1">Transações</p>
            <h3 className="text-2xl font-bold text-gray-900">{summary.transactionCount}</h3>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-1">Ticket Médio</p>
            <h3 className="text-2xl font-bold text-gray-900">{centsToReais(summary.averageTicketInCents)}</h3>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-1">Em Preparo</p>
            <h3 className="text-2xl font-bold text-bakery-500">{summary.pendingCount}</h3>
          </div>
        </Card>
      </div>

      <Card title="Distribuição por Forma de Pagamento">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {paymentStats.map((stat) => {
            const Icon = PAYMENT_ICONS[stat.method];
            return (
              <div key={stat.method} className="border border-gray-200 rounded-lg p-4 hover:border-bakery-300 transition-colors">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-bakery-50 rounded-lg">
                    <Icon size={20} className="text-bakery-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">
                    {PAYMENT_LABELS[stat.method]}
                  </span>
                </div>
                <p className="text-xl font-bold text-gray-900">{centsToReais(stat.totalInCents)}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {stat.transactionCount} transações
                </p>
              </div>
            );
          })}
        </div>
      </Card>

      <Card
        title="Transações Recentes"
        subtitle="Histórico completo de vendas"
        action={
          <div className="flex gap-2">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-bakery-500 focus:border-transparent"
            >
              <option value="today">Hoje</option>
              <option value="week">Esta Semana</option>
              <option value="month">Este Mês</option>
            </select>
            <select
              value={selectedPayment}
              onChange={(e) => setSelectedPayment(e.target.value as PaymentMethod | 'all')}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-bakery-500 focus:border-transparent"
            >
              <option value="all">Todas as Formas</option>
              <option value="cash">Dinheiro</option>
              <option value="credit">Crédito</option>
              <option value="debit">Débito</option>
              <option value="pix">PIX</option>
            </select>
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Pedido</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Data/Hora</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Cliente</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Itens</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Total</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Pagamento</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Atendente</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => {
                const PaymentIcon = PAYMENT_ICONS[sale.paymentMethod];
                const StatusIcon = STATUS_ICONS[sale.status];
                const { date, time } = formatDateTime(sale.createdAt);

                return (
                  <tr key={sale.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm font-medium text-gray-900">#{sale.id.replace('sale_', '')}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      <div className="flex flex-col">
                        <span>{date}</span>
                        <span className="text-xs text-gray-500">{time}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-900">{sale.customer}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{sale.items.length} itens</td>
                    <td className="py-3 px-4 text-sm font-semibold text-gray-900">{centsToReais(sale.totalInCents)}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <PaymentIcon size={16} className="text-gray-500" />
                        <span className="text-sm text-gray-600">
                          {PAYMENT_LABELS[sale.paymentMethod]}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={STATUS_VARIANT[sale.status]} size="sm">
                        <StatusIcon size={12} className="mr-1" />
                        {STATUS_LABELS[sale.status]}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">{sale.attendantName}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
