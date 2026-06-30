import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

export const SettingsContext = createContext();

// Mirrors the backend defaults so the UI renders sensibly before the
// public settings request resolves (and if it ever fails).
const DEFAULT_BRANDING = {
  institutionNameEn: 'National Academy of Addis Ababa',
  institutionNameAm: 'ብሔራዊ የአዲስ አበባ አካዳሚ',
  brandColor: '#080845',
  headerTitle: 'Institutional Excellence Dashboard',
  logo: '',
};

const DEFAULT_GRADING = {
  gpaEnabled: false,
  passMark: 50,
};

const DEFAULT_LOCALIZATION = {
  currency: 'ETB Ethiopian Birr',
  timezone: '(GMT+03:00) East Africa Time - Addis Ababa',
  dateFormat: 'DD/MM/YYYY (Day-Month-Year)',
  calendarType: 'Ethiopian Calendar (EC)',
};

const DEFAULT_NOTIFICATIONS = {
  maintenanceBroadcasts: false,
};

// Static uploads are served from the API origin (without the trailing /api).
const API_ORIGIN = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api').replace(/\/api\/?$/, '');

const FALLBACK_CONTEXT = {
  branding: DEFAULT_BRANDING,
  grading: DEFAULT_GRADING,
  localization: DEFAULT_LOCALIZATION,
  notifications: DEFAULT_NOTIFICATIONS,
  logoUrl: null,
  refresh: async () => {},
  formatDateTime: (value) => {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
  },
};

const getDateLocale = (dateFormat) => {
  switch (dateFormat) {
    case 'MM/DD/YYYY (Month-Day-Year)':
      return 'en-US';
    case 'YYYY-MM-DD (ISO Format)':
      return 'sv-SE';
    case 'DD/MM/YYYY (Day-Month-Year)':
    default:
      return 'en-GB';
  }
};

export const SettingsProvider = ({ children }) => {
  const [branding, setBranding] = useState(DEFAULT_BRANDING);
  const [grading, setGrading] = useState(DEFAULT_GRADING);
  const [localization, setLocalization] = useState(DEFAULT_LOCALIZATION);
  const [notifications, setNotifications] = useState(DEFAULT_NOTIFICATIONS);

  const refresh = useCallback(async () => {
    try {
      const res = await api.get('/settings/public');
      if (res.data?.branding) {
        setBranding({ ...DEFAULT_BRANDING, ...res.data.branding });
      }
      if (res.data?.grading) {
        setGrading({ ...DEFAULT_GRADING, ...res.data.grading });
      }
      if (res.data?.localization) {
        setLocalization({ ...DEFAULT_LOCALIZATION, ...res.data.localization });
      }
      if (res.data?.notifications) {
        setNotifications({ ...DEFAULT_NOTIFICATIONS, ...res.data.notifications });
      }
    } catch {
      // Keep defaults on failure (e.g. backend offline) — non-critical UI settings.
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Ready-to-use absolute logo URL (or null when no logo is configured).
  const logoUrl = branding.logo ? `${API_ORIGIN}${branding.logo}` : null;

  const formatDateTime = useCallback((value) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';

    const locale = getDateLocale(localization.dateFormat);
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }, [localization.dateFormat]);

  return (
    <SettingsContext.Provider value={{ branding, grading, localization, notifications, logoUrl, refresh, formatDateTime }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useBranding = () => {
  const ctx = useContext(SettingsContext);
  if (!ctx) return FALLBACK_CONTEXT;
  return ctx;
};

export const usePublicSettings = () => {
  const ctx = useContext(SettingsContext);
  if (!ctx) return FALLBACK_CONTEXT;
  return ctx;
};
