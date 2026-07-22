import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import Login from '../pages/Login';
import * as AuthHook from '../hooks/useAuth';

vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

describe('Login Page Component', () => {
  it('renders login form inputs and test account buttons', () => {
    const mockLogin = vi.fn();
    vi.mocked(AuthHook.useAuth).mockReturnValue({
      login: mockLogin,
      user: null,
      loading: false,
    } as any);

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    expect(screen.getByPlaceholderText('abebe.balcha@school.et')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••••••')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument();
  });

  it('populates credentials when clicking quick test account chip', () => {
    vi.mocked(AuthHook.useAuth).mockReturnValue({
      login: vi.fn(),
      user: null,
      loading: false,
    } as any);

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    const superAdminChip = screen.getByRole('button', { name: 'Super Admin' });
    fireEvent.click(superAdminChip);

    const identifierInput = screen.getByPlaceholderText('abebe.balcha@school.et') as HTMLInputElement;
    expect(identifierInput.value).toBe('superadmin@school.test');
  });
});
