import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Login from '../pages/Login';
import * as AuthHook from '../hooks/useAuth';
import * as SettingsHook from '../hooks/useSettings';

vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../hooks/useSettings', () => ({
  useSettings: vi.fn(),
  usePublicSettings: vi.fn(),
  useBranding: vi.fn(),
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

describe('Login Page Component', () => {
  it('renders login form inputs and submit button', () => {
    const mockLogin = vi.fn();
    vi.mocked(AuthHook.useAuth).mockReturnValue({
      login: mockLogin,
      user: null,
      loading: false,
    } as any);

    vi.mocked(SettingsHook.useSettings).mockReturnValue({
      branding: { institutionNameEn: 'EduManage Ethiopia' },
      logoUrl: '',
      isLoading: false,
    } as any);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(screen.getByPlaceholderText('abebe.balcha@school.et')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••••••')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument();
  });

  it('allows user to enter credentials and submit form', async () => {
    const mockLogin = vi.fn().mockResolvedValue({ role: 'SuperAdmin' });
    vi.mocked(AuthHook.useAuth).mockReturnValue({
      login: mockLogin,
      user: null,
      loading: false,
    } as any);

    vi.mocked(SettingsHook.useSettings).mockReturnValue({
      branding: { institutionNameEn: 'EduManage Ethiopia' },
      logoUrl: '',
      isLoading: false,
    } as any);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      </QueryClientProvider>
    );

    const identifierInput = screen.getByPlaceholderText('abebe.balcha@school.et');
    const passwordInput = screen.getByPlaceholderText('••••••••••••');
    const loginButton = screen.getByRole('button', { name: 'Login' });

    fireEvent.change(identifierInput, { target: { value: 'superadmin@school.com' } });
    fireEvent.change(passwordInput, { target: { value: 'superadmin' } });
    fireEvent.click(loginButton);

    expect(mockLogin).toHaveBeenCalledWith('superadmin@school.com', 'superadmin');
  });
});
