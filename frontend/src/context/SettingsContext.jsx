import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

export const SettingsContext = createContext();

// Mirrors the backend branding defaults so the UI renders sensibly before the
// public settings request resolves (and if it ever fails).
const DEFAULT_BRANDING = {
  institutionNameEn: 'National Academy of Addis Ababa',
  institutionNameAm: 'ብሔራዊ የአዲስ አበባ አካዳሚ',
  brandColor: '#080845',
  headerTitle: 'Institutional Excellence Dashboard',
  logo: '',
};

// Static uploads are served from the API origin (without the trailing /api).
const API_ORIGIN = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api').replace(/\/api\/?$/, '');

export const SettingsProvider = ({ children }) => {
  const [branding, setBranding] = useState(DEFAULT_BRANDING);

  const refresh = useCallback(async () => {
    try {
      const res = await api.get('/settings/public');
      if (res.data?.branding) {
        setBranding({ ...DEFAULT_BRANDING, ...res.data.branding });
      }
    } catch {
      // Keep defaults on failure (e.g. backend offline) — branding is non-critical.
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Ready-to-use absolute logo URL (or null when no logo is configured).
  const logoUrl = branding.logo ? `${API_ORIGIN}${branding.logo}` : null;

  return (
    <SettingsContext.Provider value={{ branding, logoUrl, refresh }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useBranding = () => {
  const ctx = useContext(SettingsContext);
  // Safe fallback if a component renders outside the provider.
  if (!ctx) return { branding: DEFAULT_BRANDING, logoUrl: null, refresh: () => {} };
  return ctx;
};
