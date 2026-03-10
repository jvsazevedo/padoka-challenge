import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Sales from '../modules/Sales';
import { render } from './helpers';
import { MOCK_SALES, MOCK_SUMMARY, MOCK_PAYMENT_STATS, makeHasPermission } from './mocks';
import type { UserRole } from '../api/users';

// Mock auth context
const mockHasPermission = vi.fn();
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user_01', name: 'Test', email: 'test@test.com', role: 'admin', status: 'active', lastAccessAt: '' },
    hasPermission: mockHasPermission,
  }),
}));

// Mock API
vi.mock('../api/sales', async (importOriginal) => {
  const original = await importOriginal<typeof import('../api/sales')>();
  return {
    ...original,
    fetchSales: vi.fn(),
    fetchSalesSummary: vi.fn(),
    fetchPaymentMethodStats: vi.fn(),
  };
});

import { fetchSales, fetchSalesSummary, fetchPaymentMethodStats } from '../api/sales';

function setRole(role: UserRole) {
  mockHasPermission.mockImplementation(makeHasPermission(role));
}

beforeEach(() => {
  vi.mocked(fetchSales).mockResolvedValue([...MOCK_SALES]);
  vi.mocked(fetchSalesSummary).mockResolvedValue({ ...MOCK_SUMMARY });
  vi.mocked(fetchPaymentMethodStats).mockResolvedValue([...MOCK_PAYMENT_STATS]);
});

describe('Sales', () => {
  describe('Summary Cards', () => {
    it('renders summary metrics', async () => {
      setRole('admin');
      render(<Sales />);

      await waitFor(() => {
        expect(screen.getByText('Total de Vendas')).toBeInTheDocument();
        expect(screen.getByText('Transações')).toBeInTheDocument();
        expect(screen.getByText('Ticket Médio')).toBeInTheDocument();
        expect(screen.getByText('Em Preparo')).toBeInTheDocument();
      });
    });

    it('displays transaction count', async () => {
      setRole('admin');
      render(<Sales />);

      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument(); // transactionCount
      });
    });

    it('displays pending count', async () => {
      setRole('admin');
      render(<Sales />);

      await waitFor(() => {
        expect(screen.getByText('1')).toBeInTheDocument(); // pendingCount
      });
    });
  });

  describe('Sales Table', () => {
    it('renders sales list', async () => {
      setRole('admin');
      render(<Sales />);

      await waitFor(() => {
        expect(screen.getByText('Cliente Balcão')).toBeInTheDocument();
        expect(screen.getByText('Maria Silva')).toBeInTheDocument();
      });
    });

    it('shows payment method labels', async () => {
      setRole('admin');
      render(<Sales />);

      await waitFor(() => {
        // "Dinheiro" appears in both stats card and table, so use getAllByText
        expect(screen.getAllByText('Dinheiro').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('PIX').length).toBeGreaterThanOrEqual(1);
      });
    });

    it('shows sale status badges', async () => {
      setRole('admin');
      render(<Sales />);

      await waitFor(() => {
        expect(screen.getByText('Finalizado')).toBeInTheDocument();
        expect(screen.getByText('Em preparo')).toBeInTheDocument();
      });
    });

    it('shows attendant names', async () => {
      setRole('admin');
      render(<Sales />);

      await waitFor(() => {
        expect(screen.getByText('Carlos Oliveira')).toBeInTheDocument();
        expect(screen.getByText('Ana Costa')).toBeInTheDocument();
      });
    });

    it('shows item count per sale', async () => {
      setRole('admin');
      render(<Sales />);

      await waitFor(() => {
        const itemCounts = screen.getAllByText(/\d+ itens?/);
        expect(itemCounts.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Payment Stats', () => {
    it('renders payment method distribution card', async () => {
      setRole('admin');
      render(<Sales />);

      await waitFor(() => {
        expect(screen.getByText('Distribuição por Forma de Pagamento')).toBeInTheDocument();
      });
    });

    it('shows transaction counts per method', async () => {
      setRole('admin');
      render(<Sales />);

      await waitFor(() => {
        // Multiple methods show "X transações"
        const items = screen.getAllByText(/\d+ transações/);
        expect(items.length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe('Filters', () => {
    it('renders period filter', async () => {
      setRole('admin');
      render(<Sales />);

      await waitFor(() => {
        const selects = screen.getAllByRole('combobox');
        expect(selects.length).toBeGreaterThanOrEqual(2);
      });
    });

    it('refetches data when period changes', async () => {
      setRole('admin');
      const user = userEvent.setup();
      render(<Sales />);

      await waitFor(() => expect(screen.getByText('Cliente Balcão')).toBeInTheDocument());

      // Change period to "Esta Semana"
      const selects = screen.getAllByRole('combobox');
      const periodSelect = selects[0];
      await user.selectOptions(periodSelect, 'week');

      await waitFor(() => {
        expect(fetchSales).toHaveBeenCalledWith(
          expect.objectContaining({ period: 'week' }),
        );
        expect(fetchSalesSummary).toHaveBeenCalledWith('week');
      });
    });

    it('refetches data when payment method changes', async () => {
      setRole('admin');
      const user = userEvent.setup();
      render(<Sales />);

      await waitFor(() => expect(screen.getByText('Cliente Balcão')).toBeInTheDocument());

      const selects = screen.getAllByRole('combobox');
      const paymentSelect = selects[1];
      await user.selectOptions(paymentSelect, 'pix');

      await waitFor(() => {
        expect(fetchSales).toHaveBeenCalledWith(
          expect.objectContaining({ paymentMethod: 'pix' }),
        );
      });
    });
  });

  describe('RBAC - Export Report', () => {
    it('admin can see "Exportar Relatório" button', async () => {
      setRole('admin');
      render(<Sales />);

      await waitFor(() => {
        expect(screen.getByText('Exportar Relatório')).toBeInTheDocument();
      });
    });

    it('manager can see "Exportar Relatório" button', async () => {
      setRole('manager');
      render(<Sales />);

      await waitFor(() => {
        expect(screen.getByText('Exportar Relatório')).toBeInTheDocument();
      });
    });

    it('attendant cannot see "Exportar Relatório" button', async () => {
      setRole('attendant');
      render(<Sales />);

      await waitFor(() => {
        expect(screen.getByText('Gestão de Vendas')).toBeInTheDocument();
      });
      expect(screen.queryByText('Exportar Relatório')).not.toBeInTheDocument();
    });
  });

  describe('Loading & Error', () => {
    it('shows spinner while loading', () => {
      setRole('admin');
      vi.mocked(fetchSales).mockImplementation(() => new Promise(() => {}));
      vi.mocked(fetchSalesSummary).mockImplementation(() => new Promise(() => {}));
      vi.mocked(fetchPaymentMethodStats).mockImplementation(() => new Promise(() => {}));
      render(<Sales />);

      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('shows error on fetch failure', async () => {
      setRole('admin');
      vi.mocked(fetchSales).mockRejectedValue(new Error('Connection failed'));
      render(<Sales />);

      await waitFor(() => {
        expect(screen.getByText(/Connection failed/)).toBeInTheDocument();
      });
    });
  });
});
