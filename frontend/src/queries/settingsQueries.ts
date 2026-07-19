import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';

export interface BrandingSettings {
  institutionNameEn: string;
  institutionNameAm: string;
  brandColor: string;
  headerTitle: string;
  logo: string;
}

export interface GradingSettings {
  gpaEnabled: boolean;
  passMark: number;
}

export interface LocalizationSettings {
  currency: string;
  timezone: string;
  dateFormat: string;
  calendarType: string;
}

export interface NotificationSettings {
  maintenanceBroadcasts: boolean;
}

export interface PublicSettings {
  branding?: BrandingSettings;
  grading?: GradingSettings;
  localization?: LocalizationSettings;
  notifications?: NotificationSettings;
}

export function usePublicSettingsQuery() {
  return useQuery<PublicSettings>({
    queryKey: ['settings', 'public'],
    queryFn: async () => {
      const res = await api.get('/settings/public');
      return res.data || {};
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 35 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}
