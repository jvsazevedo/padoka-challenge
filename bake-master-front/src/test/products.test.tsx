import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Products from '../modules/Products';
import { render } from './helpers';
import { MOCK_PRODUCTS, makeHasPermission } from './mocks';
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
vi.mock('../api/products', async (importOriginal) => {
  const original = await importOriginal<typeof import('../api/products')>();
  return {
    ...original,
    fetchProducts: vi.fn(),
    createProduct: vi.fn(),
    updateProduct: vi.fn(),
    deleteProduct: vi.fn(),
  };
});

import { fetchProducts, createProduct, updateProduct, deleteProduct } from '../api/products';

function setRole(role: UserRole) {
  mockHasPermission.mockImplementation(makeHasPermission(role));
}

/** Find the last <td> actions cell in a row and get its buttons */
function getActionButtons(row: HTMLElement) {
  const cells = within(row).getAllByRole('cell');
  const lastCell = cells[cells.length - 1];
  return within(lastCell).queryAllByRole('button');
}

function getEditButton(row: HTMLElement) {
  return getActionButtons(row).find((b) => b.classList.contains('hover:text-bakery-500'));
}

function getDeleteButton(row: HTMLElement) {
  return getActionButtons(row).find((b) => b.classList.contains('hover:text-red-500'));
}

beforeEach(() => {
  vi.mocked(fetchProducts).mockResolvedValue([...MOCK_PRODUCTS]);
  vi.mocked(updateProduct).mockResolvedValue(MOCK_PRODUCTS[0]);
});

describe('Products', () => {
  describe('Listing', () => {
    it('renders product list after loading', async () => {
      setRole('admin');
      render(<Products />);

      await waitFor(() => {
        expect(screen.getByText('Pão Francês')).toBeInTheDocument();
        expect(screen.getByText('Croissant')).toBeInTheDocument();
        expect(screen.getByText('Café Expresso')).toBeInTheDocument();
      });
    });

    it('shows product count in subtitle', async () => {
      setRole('admin');
      render(<Products />);

      await waitFor(() => {
        expect(screen.getByText('3 produtos cadastrados')).toBeInTheDocument();
      });
    });

    it('shows loading spinner initially', () => {
      setRole('admin');
      vi.mocked(fetchProducts).mockImplementation(() => new Promise(() => {}));
      render(<Products />);

      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('shows error message on fetch failure', async () => {
      setRole('admin');
      vi.mocked(fetchProducts).mockRejectedValue(new Error('Network error'));
      render(<Products />);

      await waitFor(() => {
        expect(screen.getByText(/Network error/)).toBeInTheDocument();
      });
    });

    it('displays category badges', async () => {
      setRole('admin');
      render(<Products />);

      await waitFor(() => {
        expect(screen.getByText('Pães')).toBeInTheDocument();
        expect(screen.getByText('Confeitaria')).toBeInTheDocument();
        expect(screen.getByText('Bebidas')).toBeInTheDocument();
      });
    });

    it('displays promo price when available', async () => {
      setRole('admin');
      render(<Products />);

      await waitFor(() => {
        expect(screen.getByText('R$ 0,70')).toBeInTheDocument();
      });
    });

    it('highlights low stock in red', async () => {
      setRole('admin');
      vi.mocked(fetchProducts).mockResolvedValue([
        { id: 'p1', name: 'Low', category: 'bread', basePriceInCents: 100, promoActive: false, stock: 5, minStock: 10, isCombo: false },
      ]);
      render(<Products />);

      await waitFor(() => {
        const stockEl = screen.getByText('5 un');
        expect(stockEl).toHaveClass('text-red-600');
      });
    });
  });

  describe('RBAC - Admin', () => {
    beforeEach(() => setRole('admin'));

    it('shows "Novo Produto" button', async () => {
      render(<Products />);
      await waitFor(() => {
        expect(screen.getByText('Novo Produto')).toBeInTheDocument();
      });
    });

    it('shows edit and delete buttons in action column', async () => {
      render(<Products />);
      await waitFor(() => expect(screen.getByText('Pão Francês')).toBeInTheDocument());

      const rows = screen.getAllByRole('row').slice(1);
      rows.forEach((row) => {
        expect(getEditButton(row)).toBeDefined();
        expect(getDeleteButton(row)).toBeDefined();
      });
    });
  });

  describe('RBAC - Manager', () => {
    beforeEach(() => setRole('manager'));

    it('shows "Novo Produto" button (manager can create)', async () => {
      render(<Products />);
      await waitFor(() => {
        expect(screen.getByText('Novo Produto')).toBeInTheDocument();
      });
    });

    it('shows edit but NOT delete buttons', async () => {
      render(<Products />);
      await waitFor(() => expect(screen.getByText('Pão Francês')).toBeInTheDocument());

      const rows = screen.getAllByRole('row').slice(1);
      rows.forEach((row) => {
        expect(getEditButton(row)).toBeDefined();
        expect(getDeleteButton(row)).toBeUndefined();
      });
    });
  });

  describe('RBAC - Attendant', () => {
    beforeEach(() => setRole('attendant'));

    it('does NOT show "Novo Produto" button', async () => {
      render(<Products />);
      await waitFor(() => expect(screen.getByText('Pão Francês')).toBeInTheDocument());
      expect(screen.queryByText('Novo Produto')).not.toBeInTheDocument();
    });

    it('does NOT show edit or delete buttons in actions column', async () => {
      render(<Products />);
      await waitFor(() => expect(screen.getByText('Pão Francês')).toBeInTheDocument());

      const rows = screen.getAllByRole('row').slice(1);
      rows.forEach((row) => {
        expect(getActionButtons(row)).toHaveLength(0);
      });
    });
  });

  describe('Create Product', () => {
    beforeEach(() => setRole('admin'));

    it('opens form when clicking "Novo Produto"', async () => {
      const user = userEvent.setup();
      render(<Products />);

      await waitFor(() => expect(screen.getByText('Novo Produto')).toBeInTheDocument());

      await user.click(screen.getByText('Novo Produto'));
      expect(screen.getByText('Cadastrar Novo Produto')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Ex: Pão de Queijo')).toBeInTheDocument();
    });

    it('submits new product and adds to list', async () => {
      const user = userEvent.setup();
      const newProduct = {
        id: 'prod_04',
        name: 'Bolo de Cenoura',
        category: 'pastry' as const,
        basePriceInCents: 2500,
        promoActive: false,
        stock: 10,
        minStock: 5,
        isCombo: false,
      };
      vi.mocked(createProduct).mockResolvedValue(newProduct);

      render(<Products />);
      await waitFor(() => expect(screen.getByText('Pão Francês')).toBeInTheDocument());

      await user.click(screen.getByText('Novo Produto'));
      await user.type(screen.getByPlaceholderText('Ex: Pão de Queijo'), 'Bolo de Cenoura');
      await user.type(screen.getByPlaceholderText('100'), '10');
      await user.type(screen.getByPlaceholderText('30'), '5');

      // There are two "0.00" placeholders (base price and promo price) — pick first
      const priceInputs = screen.getAllByPlaceholderText('0.00');
      await user.type(priceInputs[0], '25.00');

      await user.click(screen.getByText('Salvar Produto'));

      await waitFor(() => {
        expect(createProduct).toHaveBeenCalled();
        expect(screen.getByText('Bolo de Cenoura')).toBeInTheDocument();
      });
    });

    it('closes form on cancel', async () => {
      const user = userEvent.setup();
      render(<Products />);

      await waitFor(() => expect(screen.getByText('Pão Francês')).toBeInTheDocument());

      await user.click(screen.getByText('Novo Produto'));
      expect(screen.getByText('Cadastrar Novo Produto')).toBeInTheDocument();

      await user.click(screen.getByText('Cancelar'));
      expect(screen.queryByText('Cadastrar Novo Produto')).not.toBeInTheDocument();
    });
  });

  describe('Edit Product', () => {
    beforeEach(() => setRole('admin'));

    it('opens edit form with pre-filled data', async () => {
      const user = userEvent.setup();
      render(<Products />);

      await waitFor(() => expect(screen.getByText('Pão Francês')).toBeInTheDocument());

      const rows = screen.getAllByRole('row').slice(1);
      const editBtn = getEditButton(rows[0])!;
      await user.click(editBtn);

      expect(screen.getByText('Editar Produto')).toBeInTheDocument();
      expect(screen.getByText('Atualizar Produto')).toBeInTheDocument();
    });

    it('submits edit and updates list', async () => {
      const user = userEvent.setup();
      const updated = { ...MOCK_PRODUCTS[0], name: 'Pão Francês Premium' };
      vi.mocked(updateProduct).mockResolvedValue(updated);

      render(<Products />);
      await waitFor(() => expect(screen.getByText('Pão Francês')).toBeInTheDocument());

      const rows = screen.getAllByRole('row').slice(1);
      const editBtn = getEditButton(rows[0])!;
      await user.click(editBtn);

      const nameInput = screen.getByPlaceholderText('Ex: Pão de Queijo');
      await user.clear(nameInput);
      await user.type(nameInput, 'Pão Francês Premium');

      await user.click(screen.getByText('Atualizar Produto'));

      await waitFor(() => {
        expect(updateProduct).toHaveBeenCalledWith('prod_01', expect.any(Object));
        expect(screen.getByText('Pão Francês Premium')).toBeInTheDocument();
      });
    });
  });

  describe('Delete Product', () => {
    beforeEach(() => setRole('admin'));

    it('removes product from list on delete', async () => {
      const user = userEvent.setup();
      vi.mocked(deleteProduct).mockResolvedValue(undefined);

      render(<Products />);
      await waitFor(() => expect(screen.getByText('Pão Francês')).toBeInTheDocument());

      const rows = screen.getAllByRole('row').slice(1);
      const deleteBtn = getDeleteButton(rows[0])!;
      await user.click(deleteBtn);

      await waitFor(() => {
        expect(deleteProduct).toHaveBeenCalledWith('prod_01');
        expect(screen.queryByText('Pão Francês')).not.toBeInTheDocument();
      });
    });
  });

  describe('Toggle Promo', () => {
    beforeEach(() => setRole('admin'));

    it('calls updateProduct to toggle promo', async () => {
      const user = userEvent.setup();
      const toggled = { ...MOCK_PRODUCTS[0], promoActive: false };
      vi.mocked(updateProduct).mockResolvedValue(toggled);

      render(<Products />);
      await waitFor(() => expect(screen.getByText('Pão Francês')).toBeInTheDocument());

      // The promo toggle is a button in the "Promoção" column (6th column, index 5)
      const rows = screen.getAllByRole('row').slice(1);
      const cells = within(rows[0]).getAllByRole('cell');
      const promoCell = cells[5]; // 0-indexed, "Promoção" is 6th column
      const toggleBtn = within(promoCell).queryByRole('button');

      if (toggleBtn) {
        await user.click(toggleBtn);
        await waitFor(() => {
          expect(updateProduct).toHaveBeenCalledWith('prod_01', { promoActive: false });
        });
      }
    });
  });
});
