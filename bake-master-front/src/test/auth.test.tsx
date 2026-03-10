import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Login from '../modules/Login';
import { renderWithAuth } from './helpers';
import { MOCK_ADMIN, PERMISSIONS_BY_ROLE } from './mocks';

// Mock API modules
vi.mock('../api/auth', () => ({
  login: vi.fn(),
  logout: vi.fn(),
  refreshToken: vi.fn(),
  fetchMe: vi.fn(),
}));

vi.mock('../api/users', async (importOriginal) => {
  const original = await importOriginal<typeof import('../api/users')>();
  return {
    ...original,
    fetchPermissions: vi.fn(),
  };
});

import { login as apiLogin } from '../api/auth';
import { fetchPermissions } from '../api/users';

beforeEach(() => {
  vi.mocked(fetchPermissions).mockResolvedValue(PERMISSIONS_BY_ROLE.admin);
});

describe('Login', () => {
  it('renders login form with email and password fields', () => {
    renderWithAuth(<Login />);

    expect(screen.getByText('BakeMaster Pro')).toBeInTheDocument();
    expect(screen.getByText('Entrar no sistema')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('seu@email.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument();
  });

  it('displays test credentials', () => {
    renderWithAuth(<Login />);

    expect(screen.getByText(/joao@bakemaster.com/)).toBeInTheDocument();
    expect(screen.getByText(/maria@bakemaster.com/)).toBeInTheDocument();
    expect(screen.getByText(/carlos@bakemaster.com/)).toBeInTheDocument();
  });

  it('calls login API on form submit', async () => {
    const user = userEvent.setup();
    vi.mocked(apiLogin).mockResolvedValue({
      accessToken: 'token_123',
      refreshToken: 'refresh_123',
      expiresIn: 900,
      user: MOCK_ADMIN,
    });

    renderWithAuth(<Login />);

    await user.type(screen.getByPlaceholderText('seu@email.com'), 'joao@bakemaster.com');
    await user.type(screen.getByPlaceholderText('••••••••'), 'senha123');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => {
      expect(apiLogin).toHaveBeenCalledWith({
        email: 'joao@bakemaster.com',
        password: 'senha123',
      });
    });
  });

  it('shows error message on login failure', async () => {
    const user = userEvent.setup();
    vi.mocked(apiLogin).mockRejectedValue(new Error('Credenciais inválidas'));

    renderWithAuth(<Login />);

    await user.type(screen.getByPlaceholderText('seu@email.com'), 'wrong@email.com');
    await user.type(screen.getByPlaceholderText('••••••••'), 'wrongpass');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => {
      expect(screen.getByText('Credenciais inválidas')).toBeInTheDocument();
    });
  });

  it('shows error when inactive user tries to login', async () => {
    const user = userEvent.setup();
    vi.mocked(apiLogin).mockRejectedValue(
      new Error('Usuário inativo. Contate o administrador.'),
    );

    renderWithAuth(<Login />);

    await user.type(screen.getByPlaceholderText('seu@email.com'), 'ana@bakemaster.com');
    await user.type(screen.getByPlaceholderText('••••••••'), 'qualquer');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => {
      expect(screen.getByText('Usuário inativo. Contate o administrador.')).toBeInTheDocument();
    });
  });

  it('shows loading state during submission', async () => {
    const user = userEvent.setup();
    // Make login hang
    vi.mocked(apiLogin).mockImplementation(
      () => new Promise(() => {}),
    );

    renderWithAuth(<Login />);

    await user.type(screen.getByPlaceholderText('seu@email.com'), 'joao@bakemaster.com');
    await user.type(screen.getByPlaceholderText('••••••••'), 'senha');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => {
      expect(screen.getByText('Entrando...')).toBeInTheDocument();
    });
  });

  it('stores refresh token in sessionStorage on successful login', async () => {
    const user = userEvent.setup();
    vi.mocked(apiLogin).mockResolvedValue({
      accessToken: 'access_abc',
      refreshToken: 'refresh_xyz',
      expiresIn: 900,
      user: MOCK_ADMIN,
    });

    renderWithAuth(<Login />);

    await user.type(screen.getByPlaceholderText('seu@email.com'), 'joao@bakemaster.com');
    await user.type(screen.getByPlaceholderText('••••••••'), '123');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => {
      expect(sessionStorage.getItem('bm_refresh_token')).toBe('refresh_xyz');
    });
  });
});
