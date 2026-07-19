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

  // Resolve logo URL
  const logoUrl = branding.logo
    ? `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${branding.logo}`
    : '/logo.png';

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
