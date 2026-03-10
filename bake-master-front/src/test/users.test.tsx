import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Users from '../modules/Users';
import { render } from './helpers';
import { MOCK_USERS, PERMISSIONS_BY_ROLE, makeHasPermission } from './mocks';
import type { UserRole, Permission } from '../api/users';

// Mock auth context
const mockHasPermission = vi.fn();
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user_01', name: 'Test', email: 'test@test.com', role: 'admin', status: 'active', lastAccessAt: '' },
    hasPermission: mockHasPermission,
  }),
}));

// Mock API
vi.mock('../api/users', async (importOriginal) => {
  const original = await importOriginal<typeof import('../api/users')>();
  return {
    ...original,
    fetchUsers: vi.fn(),
    fetchPermissions: vi.fn(),
    createUser: vi.fn(),
    updateUser: vi.fn(),
    deleteUser: vi.fn(),
  };
});

import { fetchUsers, fetchPermissions, createUser, updateUser, deleteUser } from '../api/users';

function setRole(role: UserRole) {
  mockHasPermission.mockImplementation(makeHasPermission(role));
}

beforeEach(() => {
  vi.mocked(fetchUsers).mockResolvedValue([...MOCK_USERS]);
  vi.mocked(fetchPermissions).mockResolvedValue(PERMISSIONS_BY_ROLE.admin);
});

describe('Users', () => {
  describe('Listing', () => {
    it('renders user list after loading', async () => {
      setRole('admin');
      render(<Users />);

      await waitFor(() => {
        expect(screen.getByText('João Silva')).toBeInTheDocument();
        expect(screen.getByText('Maria Santos')).toBeInTheDocument();
        expect(screen.getByText('Carlos Oliveira')).toBeInTheDocument();
      });
    });

    it('shows user count', async () => {
      setRole('admin');
      render(<Users />);

      await waitFor(() => {
        expect(screen.getByText('3 usuários no sistema')).toBeInTheDocument();
      });
    });

    it('displays role badges', async () => {
      setRole('admin');
      render(<Users />);

      await waitFor(() => {
        // Role labels appear both in the table badges AND in the permission matrix tabs
        expect(screen.getAllByText('Administrador').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('Gerente').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('Atendente').length).toBeGreaterThanOrEqual(1);
      });
    });

    it('displays status badges', async () => {
      setRole('admin');
      render(<Users />);

      await waitFor(() => {
        // All mock users are active
        const activeBadges = screen.getAllByText('Ativo');
        expect(activeBadges.length).toBeGreaterThan(0);
      });
    });

    it('shows user emails', async () => {
      setRole('admin');
      render(<Users />);

      await waitFor(() => {
        expect(screen.getByText('joao@bakemaster.com')).toBeInTheDocument();
        expect(screen.getByText('maria@bakemaster.com')).toBeInTheDocument();
        expect(screen.getByText('carlos@bakemaster.com')).toBeInTheDocument();
      });
    });

    it('displays user avatar with initials', async () => {
      setRole('admin');
      render(<Users />);

      await waitFor(() => {
        expect(screen.getByText('J')).toBeInTheDocument(); // João
        expect(screen.getByText('M')).toBeInTheDocument(); // Maria
        expect(screen.getByText('C')).toBeInTheDocument(); // Carlos
      });
    });

    it('shows loading spinner initially', () => {
      setRole('admin');
      vi.mocked(fetchUsers).mockImplementation(() => new Promise(() => {}));
      render(<Users />);

      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('shows error on fetch failure', async () => {
      setRole('admin');
      vi.mocked(fetchUsers).mockRejectedValue(new Error('Server error'));
      render(<Users />);

      await waitFor(() => {
        expect(screen.getByText(/Server error/)).toBeInTheDocument();
      });
    });
  });

  describe('Permission Matrix', () => {
    it('renders permission matrix card', async () => {
      setRole('admin');
      render(<Users />);

      await waitFor(() => {
        expect(screen.getByText('Matriz de Permissões')).toBeInTheDocument();
        expect(screen.getByText('Visualizar por perfil')).toBeInTheDocument();
      });
    });

    it('shows role selector buttons', async () => {
      setRole('admin');
      render(<Users />);

      await waitFor(() => {
        // The role buttons inside permission matrix
        const matrixButtons = screen.getAllByRole('button');
        const adminBtn = matrixButtons.find((b) => b.textContent === 'Administrador');
        expect(adminBtn).toBeDefined();
      });
    });

    it('fetches permissions when role changes', async () => {
      setRole('admin');
      const user = userEvent.setup();
      vi.mocked(fetchPermissions).mockResolvedValue(PERMISSIONS_BY_ROLE.manager);

      render(<Users />);
      await waitFor(() => expect(screen.getByText('João Silva')).toBeInTheDocument());

      // Click on "Gerente" tab
      const buttons = screen.getAllByRole('button');
      const gerenteBtn = buttons.find((b) => b.textContent === 'Gerente');
      expect(gerenteBtn).toBeDefined();

      await user.click(gerenteBtn!);

      await waitFor(() => {
        expect(fetchPermissions).toHaveBeenCalledWith('manager');
      });
    });
  });

  describe('RBAC - Admin', () => {
    beforeEach(() => setRole('admin'));

    it('shows "Novo Usuário" button', async () => {
      render(<Users />);
      await waitFor(() => {
        expect(screen.getByText('Novo Usuário')).toBeInTheDocument();
      });
    });

    it('shows edit and delete buttons per user row', async () => {
      render(<Users />);
      await waitFor(() => expect(screen.getByText('João Silva')).toBeInTheDocument());

      const tbody = screen.getAllByRole('row').slice(1);
      tbody.forEach((row) => {
        const editBtn = within(row).queryAllByRole('button').find((b) =>
          b.classList.contains('hover:text-bakery-500'),
        );
        const deleteBtn = within(row).queryAllByRole('button').find((b) =>
          b.classList.contains('hover:text-red-500'),
        );
        expect(editBtn).toBeDefined();
        expect(deleteBtn).toBeDefined();
      });
    });
  });

  describe('RBAC - Manager', () => {
    beforeEach(() => setRole('manager'));

    it('does NOT show "Novo Usuário" button', async () => {
      render(<Users />);
      await waitFor(() => expect(screen.getByText('João Silva')).toBeInTheDocument());
      expect(screen.queryByText('Novo Usuário')).not.toBeInTheDocument();
    });

    it('does NOT show edit or delete buttons', async () => {
      render(<Users />);
      await waitFor(() => expect(screen.getByText('João Silva')).toBeInTheDocument());

      const tbody = screen.getAllByRole('row').slice(1);
      tbody.forEach((row) => {
        const actionBtns = within(row).queryAllByRole('button').filter((b) =>
          b.classList.contains('hover:text-bakery-500') ||
          b.classList.contains('hover:text-red-500'),
        );
        expect(actionBtns).toHaveLength(0);
      });
    });
  });

  describe('Create User', () => {
    beforeEach(() => setRole('admin'));

    it('opens form when clicking "Novo Usuário"', async () => {
      const user = userEvent.setup();
      render(<Users />);
      await waitFor(() => expect(screen.getByText('Novo Usuário')).toBeInTheDocument());

      await user.click(screen.getByText('Novo Usuário'));
      expect(screen.getByText('Cadastrar Novo Usuário')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Ex: Maria Santos')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('maria@bakemaster.com')).toBeInTheDocument();
    });

    it('does NOT show status field in create mode', async () => {
      const user = userEvent.setup();
      render(<Users />);
      await waitFor(() => expect(screen.getByText('Novo Usuário')).toBeInTheDocument());

      await user.click(screen.getByText('Novo Usuário'));

      // Status select should not be visible for new users
      const selects = screen.getAllByRole('combobox');
      const statusSelect = selects.find((s) => {
        const options = within(s).queryAllByRole('option');
        return options.some((o) => o.textContent === 'Ativo');
      });
      expect(statusSelect).toBeUndefined();
    });

    it('submits new user', async () => {
      const user = userEvent.setup();
      const newUser = {
        id: 'user_05',
        name: 'Novo Teste',
        email: 'novo@bakemaster.com',
        role: 'attendant' as const,
        status: 'active' as const,
        lastAccessAt: new Date().toISOString(),
      };
      vi.mocked(createUser).mockResolvedValue(newUser);

      render(<Users />);
      await waitFor(() => expect(screen.getByText('Novo Usuário')).toBeInTheDocument());

      await user.click(screen.getByText('Novo Usuário'));
      await user.type(screen.getByPlaceholderText('Ex: Maria Santos'), 'Novo Teste');
      await user.type(screen.getByPlaceholderText('maria@bakemaster.com'), 'novo@bakemaster.com');

      await user.click(screen.getByText('Salvar Usuário'));

      await waitFor(() => {
        expect(createUser).toHaveBeenCalledWith({
          name: 'Novo Teste',
          email: 'novo@bakemaster.com',
          role: 'attendant',
        });
        expect(screen.getByText('Novo Teste')).toBeInTheDocument();
      });
    });
  });

  describe('Edit User', () => {
    beforeEach(() => setRole('admin'));

    it('opens edit form with pre-filled data and status field', async () => {
      const user = userEvent.setup();
      render(<Users />);
      await waitFor(() => expect(screen.getByText('João Silva')).toBeInTheDocument());

      const rows = screen.getAllByRole('row').slice(1);
      const editBtn = within(rows[0]).getAllByRole('button').find((b) =>
        b.classList.contains('hover:text-bakery-500'),
      );
      await user.click(editBtn!);

      expect(screen.getByText('Editar Usuário')).toBeInTheDocument();
      expect(screen.getByText('Atualizar Usuário')).toBeInTheDocument();

      // Status field should be visible in edit mode
      const selects = screen.getAllByRole('combobox');
      const statusSelect = selects.find((s) => {
        const options = within(s).queryAllByRole('option');
        return options.some((o) => o.textContent === 'Ativo') &&
               options.some((o) => o.textContent === 'Inativo');
      });
      expect(statusSelect).toBeDefined();
    });

    it('submits edit and updates list', async () => {
      const user = userEvent.setup();
      const updated = { ...MOCK_USERS[0], name: 'João Atualizado' };
      vi.mocked(updateUser).mockResolvedValue(updated);

      render(<Users />);
      await waitFor(() => expect(screen.getByText('João Silva')).toBeInTheDocument());

      const rows = screen.getAllByRole('row').slice(1);
      const editBtn = within(rows[0]).getAllByRole('button').find((b) =>
        b.classList.contains('hover:text-bakery-500'),
      );
      await user.click(editBtn!);

      const nameInput = screen.getByPlaceholderText('Ex: Maria Santos');
      await user.clear(nameInput);
      await user.type(nameInput, 'João Atualizado');

      await user.click(screen.getByText('Atualizar Usuário'));

      await waitFor(() => {
        expect(updateUser).toHaveBeenCalledWith('user_01', expect.objectContaining({
          name: 'João Atualizado',
        }));
        expect(screen.getByText('João Atualizado')).toBeInTheDocument();
      });
    });
  });

  describe('Delete User', () => {
    beforeEach(() => setRole('admin'));

    it('removes user from list', async () => {
      const user = userEvent.setup();
      vi.mocked(deleteUser).mockResolvedValue(undefined);

      render(<Users />);
      await waitFor(() => expect(screen.getByText('Carlos Oliveira')).toBeInTheDocument());

      const rows = screen.getAllByRole('row').slice(1);
      const lastRow = rows[rows.length - 1];
      const deleteBtn = within(lastRow).getAllByRole('button').find((b) =>
        b.classList.contains('hover:text-red-500'),
      );

      await user.click(deleteBtn!);

      await waitFor(() => {
        expect(deleteUser).toHaveBeenCalledWith('user_03');
        expect(screen.queryByText('Carlos Oliveira')).not.toBeInTheDocument();
      });
    });
  });
});
