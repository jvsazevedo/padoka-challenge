import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from './helpers';
import RequireAuth from '../guards/RequireAuth';
import { makeHasPermission } from './mocks';
import type { UserRole } from '../api/users';

// Mock auth context
const mockHasPermission = vi.fn();
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    hasPermission: mockHasPermission,
  }),
}));

function setRole(role: UserRole) {
  mockHasPermission.mockImplementation(makeHasPermission(role));
}

describe('RequireAuth Guard', () => {
  describe('Admin', () => {
    it('allows access to dashboard', () => {
      setRole('admin');
      render(<RequireAuth module="dashboard"><div>Dashboard Content</div></RequireAuth>);
      expect(screen.getByText('Dashboard Content')).toBeInTheDocument();
    });

    it('allows access to pdv', () => {
      setRole('admin');
      render(<RequireAuth module="pdv"><div>PDV Content</div></RequireAuth>);
      expect(screen.getByText('PDV Content')).toBeInTheDocument();
    });

    it('allows access to products', () => {
      setRole('admin');
      render(<RequireAuth module="products"><div>Products Content</div></RequireAuth>);
      expect(screen.getByText('Products Content')).toBeInTheDocument();
    });

    it('allows access to users', () => {
      setRole('admin');
      render(<RequireAuth module="users"><div>Users Content</div></RequireAuth>);
      expect(screen.getByText('Users Content')).toBeInTheDocument();
    });

    it('allows access to sales', () => {
      setRole('admin');
      render(<RequireAuth module="sales"><div>Sales Content</div></RequireAuth>);
      expect(screen.getByText('Sales Content')).toBeInTheDocument();
    });
  });

  describe('Manager', () => {
    it('allows access to dashboard', () => {
      setRole('manager');
      render(<RequireAuth module="dashboard"><div>Dashboard Content</div></RequireAuth>);
      expect(screen.getByText('Dashboard Content')).toBeInTheDocument();
    });

    it('allows access to pdv', () => {
      setRole('manager');
      render(<RequireAuth module="pdv"><div>PDV Content</div></RequireAuth>);
      expect(screen.getByText('PDV Content')).toBeInTheDocument();
    });

    it('allows access to products', () => {
      setRole('manager');
      render(<RequireAuth module="products"><div>Products Content</div></RequireAuth>);
      expect(screen.getByText('Products Content')).toBeInTheDocument();
    });

    it('allows access to users (view only)', () => {
      setRole('manager');
      render(<RequireAuth module="users"><div>Users Content</div></RequireAuth>);
      expect(screen.getByText('Users Content')).toBeInTheDocument();
    });

    it('allows access to sales', () => {
      setRole('manager');
      render(<RequireAuth module="sales"><div>Sales Content</div></RequireAuth>);
      expect(screen.getByText('Sales Content')).toBeInTheDocument();
    });
  });

  describe('Attendant', () => {
    it('BLOCKS access to dashboard', () => {
      setRole('attendant');
      render(<RequireAuth module="dashboard"><div>Dashboard Content</div></RequireAuth>);
      expect(screen.queryByText('Dashboard Content')).not.toBeInTheDocument();
      expect(screen.getByText('Acesso Restrito')).toBeInTheDocument();
    });

    it('allows access to pdv', () => {
      setRole('attendant');
      render(<RequireAuth module="pdv"><div>PDV Content</div></RequireAuth>);
      expect(screen.getByText('PDV Content')).toBeInTheDocument();
    });

    it('allows access to products (view only)', () => {
      setRole('attendant');
      render(<RequireAuth module="products"><div>Products Content</div></RequireAuth>);
      expect(screen.getByText('Products Content')).toBeInTheDocument();
    });

    it('BLOCKS access to users', () => {
      setRole('attendant');
      render(<RequireAuth module="users"><div>Users Content</div></RequireAuth>);
      expect(screen.queryByText('Users Content')).not.toBeInTheDocument();
      expect(screen.getByText('Acesso Restrito')).toBeInTheDocument();
    });

    it('allows access to sales (view)', () => {
      setRole('attendant');
      render(<RequireAuth module="sales"><div>Sales Content</div></RequireAuth>);
      expect(screen.getByText('Sales Content')).toBeInTheDocument();
    });
  });

  describe('Unknown module', () => {
    it('allows access when module has no mapping', () => {
      setRole('attendant');
      render(<RequireAuth module="unknown_module"><div>Content</div></RequireAuth>);
      expect(screen.getByText('Content')).toBeInTheDocument();
    });
  });

  describe('Restricted page UI', () => {
    it('shows lock icon and restriction message', () => {
      setRole('attendant');
      render(<RequireAuth module="dashboard"><div>Hidden</div></RequireAuth>);

      expect(screen.getByText('Acesso Restrito')).toBeInTheDocument();
      expect(screen.getByText('Você não tem permissão para acessar este módulo.')).toBeInTheDocument();
    });
  });
});
