/**
 * useSettings
 * 
 * Replaces usePublicSettings and useBranding contexts by calling
 * usePublicSettingsQuery directly from TanStack Query.
 */
import { usePublicSettingsQuery } from '../queries/settingsQueries';

export function useSettings() {
  const { data: settings, isLoading } = usePublicSettingsQuery();

  const branding = settings?.branding || {};
  const grading = settings?.grading || {};
  const localization = settings?.localization || {};
  const notifications = settings?.notifications || {};

  // Resolve logo URL — derive the server origin from VITE_API_BASE_URL (same
  // variable the axios instance uses), stripping the trailing /api path so we
  // get just the host (e.g. http://localhost:8000) for static file serving.
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
  const serverOrigin = apiBase.replace(/\/api\/?$/, '');
  const logoUrl = branding.logo
    ? (branding.logo.startsWith('http') ? branding.logo : `${serverOrigin}${branding.logo}`)
    : null;

  // Format date helper
  const formatDateTime = (dateStr) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return {
    settings,
    branding,
    grading,
    localization,
    notifications,
    logoUrl,
    formatDateTime,
    isLoading,
  };
}

export const usePublicSettings = useSettings;
export const useBranding = useSettings;
