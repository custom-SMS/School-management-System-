import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import ProtectedRoute from '../components/ProtectedRoute';
import * as AuthHook from '../hooks/useAuth';

vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

describe('ProtectedRoute Component', () => {
  it('renders loading state when auth is loading', () => {
    vi.mocked(AuthHook.useAuth).mockReturnValue({
      user: null,
      permissions: [],
      loading: true,
    } as any);

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <ProtectedRoute allowedRoles={['Admin']}>
          <div>Admin Dashboard</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });

  it('redirects unauthenticated users to /login', () => {
    vi.mocked(AuthHook.useAuth).mockReturnValue({
      user: null,
      permissions: [],
      loading: false,
    } as any);

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route path="/login" element={<div>Login Screen</div>} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['Admin']}>
                <div>Admin Dashboard</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Login Screen')).toBeInTheDocument();
  });

  it('renders Access Denied screen when role is insufficient', () => {
    vi.mocked(AuthHook.useAuth).mockReturnValue({
      user: { role: 'Student', scopeType: null },
      permissions: [],
      loading: false,
    } as any);

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <ProtectedRoute allowedRoles={['Admin']}>
          <div>Admin Dashboard</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.getByText('Access Denied')).toBeInTheDocument();
  });

  it('allows SuperAdmin to bypass role checks', () => {
    vi.mocked(AuthHook.useAuth).mockReturnValue({
      user: { role: 'SuperAdmin', scopeType: null },
      permissions: [],
      loading: false,
    } as any);

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <ProtectedRoute allowedRoles={['Admin']}>
          <div>Admin Dashboard Content</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.getByText('Admin Dashboard Content')).toBeInTheDocument();
  });
});
