import { createContext, useState, useEffect } from 'react';
import api from '../api/axios';

export const AuthContext = createContext();

const DEFAULT_ORGANIZATION_SCOPE = 'organization';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [organizationScope, setOrganizationScopeState] = useState(DEFAULT_ORGANIZATION_SCOPE);

  const fetchPermissions = async () => {
    try {
      const res = await api.get('/auth/permissions/me');
      setPermissions(res.data.permissions || []);
    } catch {
      setPermissions([]);
    }
  };

  const setOrganizationScope = (scope = DEFAULT_ORGANIZATION_SCOPE) => {
    setOrganizationScopeState(scope);
  };

  // The JWT lives in an httpOnly cookie (not readable by JS). We persist only the
  // non-sensitive user object so the UI can restore state on reload.
  useEffect(() => {
    const loadState = async () => {
      const storedUser = localStorage.getItem('user');

      setOrganizationScopeState(DEFAULT_ORGANIZATION_SCOPE);

      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        try {
          const res = await api.get('/auth/permissions/me');
          setPermissions(res.data.permissions || []);
        } catch {
          setPermissions([]);
        }
      }
      setLoading(false);
    };
    loadState();
  }, []);

  const login = async (identifier, password) => {
    const response = await api.post('/auth/login', { identifier, password });
    const { user } = response.data;

    localStorage.setItem('user', JSON.stringify(user));
    setUser(user);
    
    // Fetch permissions right after login
    try {
      const res = await api.get('/auth/permissions/me');
      setPermissions(res.data.permissions || []);
    } catch {
      setPermissions([]);
    }
    
    return user;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout'); // clears the httpOnly cookie server-side
    } catch {
      // ignore network/cookie errors on logout
    }
    localStorage.removeItem('user');
    setUser(null);
    setPermissions([]);
    setOrganizationScopeState(DEFAULT_ORGANIZATION_SCOPE);
  };

  return (
    <AuthContext.Provider value={{ user, permissions, login, logout, loading, organizationScope, setOrganizationScope }}>
      {children}
    </AuthContext.Provider>
  );
};
