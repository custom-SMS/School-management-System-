/**
 * AcademicYearContext
 *
 * Provides academic year data and helpers to all components.
 * - Fetches the active academic year
 * - Exposes a year switcher for SuperAdmin (changes globally active year)
 * - Exposes a year viewer for SuperAdmin (views historical year without changing active)
 * - Injects X-Super-Admin-Year-View-Id header when SuperAdmin is viewing a non-active year
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import axios from '../api/axios';
import { toast } from 'react-toastify';

export const AcademicYearContext = createContext();

export function AcademicYearProvider({ children }) {
  const user = useSelector((state) => state.auth.user);

  const [activeYear, setActiveYear] = useState(null);
  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // viewYear: the year SuperAdmin is currently VIEWING (may differ from activeYear)
  const [viewYear, setViewYearState] = useState(null);

  // Fetch all academic years
  const fetchYears = useCallback(async () => {
    try {
      const response = await axios.get('/academic-years');
      setYears(response.data || []);
    } catch (err) {
      console.error('Error fetching academic years:', err);
      setError('Failed to load academic years');
    }
  }, []);

  // Fetch active academic year
  const fetchActiveYear = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get('/academic-years/active');
      setActiveYear(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching active academic year:', err);
      setError('Failed to load active academic year');
    } finally {
      setLoading(false);
    }
  }, []);

  // Switch academic year globally (SuperAdmin only) — changes the active year for everyone
  const switchYear = useCallback(async (yearId) => {
    if (user?.role !== 'SuperAdmin') {
      toast.error('Only Super Admin can switch academic years');
      return { ok: false };
    }

    try {
      await axios.patch(`/academic-years/${yearId}/active`);
      await fetchActiveYear();
      await fetchYears();
      // Reset view year to the new active year
      setViewYearState(null);
      toast.success('Academic year activated successfully');
      return { ok: true };
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to switch academic year';
      toast.error(message);
      return { ok: false, message };
    }
  }, [user, fetchActiveYear, fetchYears]);

  // Set the year SuperAdmin is VIEWING without changing the globally active year
  const setViewYear = useCallback((year) => {
    if (user?.role !== 'SuperAdmin') return;
    setViewYearState(year);
    if (year && activeYear && year.id !== activeYear.id) {
      toast.info(`Viewing historical data for ${year.year}`, {
        autoClose: 3000,
        toastId: 'view-year-toast'
      });
    }
  }, [user, activeYear]);

  // Reset view to current active year
  const resetViewYear = useCallback(() => {
    setViewYearState(null);
  }, []);

  // The year currently used for data queries:
  //   SuperAdmin: viewYear if set, else activeYear
  //   Everyone else: always activeYear
  const selectedYear = (user?.role === 'SuperAdmin' && viewYear) ? viewYear : activeYear;

  const isViewingHistory = Boolean(
    user?.role === 'SuperAdmin' &&
    viewYear &&
    activeYear &&
    viewYear.id !== activeYear.id
  );

  // Inject axios header when SuperAdmin is viewing a non-active year
  useEffect(() => {
    if (isViewingHistory && selectedYear) {
      axios.defaults.headers.common['X-Super-Admin-Year-View-Id'] = selectedYear.id;
    } else {
      delete axios.defaults.headers.common['X-Super-Admin-Year-View-Id'];
    }
    return () => {
      delete axios.defaults.headers.common['X-Super-Admin-Year-View-Id'];
    };
  }, [isViewingHistory, selectedYear]);

  // Can this user switch years globally?
  const canSwitchYear = user?.role === 'SuperAdmin';

  // Initial data fetch
  useEffect(() => {
    if (user) {
      fetchActiveYear();
      fetchYears();
    }
  }, [user, fetchActiveYear, fetchYears]);

  // Poll for active year changes every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchActiveYear();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchActiveYear]);

  // Reset viewYear when user logs out
  useEffect(() => {
    if (!user) {
      setViewYearState(null);
    }
  }, [user]);

  const value = {
    // Data
    activeYear,
    years,
    loading,
    error,

    // View year (SuperAdmin historical viewing)
    viewYear,
    selectedYear,
    isViewingHistory,
    setViewYear,
    resetViewYear,

    // Actions
    switchYear,
    refreshYears: fetchYears,
    refreshActiveYear: fetchActiveYear,

    // Helpers
    canSwitchYear,
  };

  return (
    <AcademicYearContext.Provider value={value}>
      {children}
    </AcademicYearContext.Provider>
  );
}

/**
 * Convenience hook to use academic year context
 */
export function useAcademicYear() {
  const context = useContext(AcademicYearContext);
  if (!context) {
    throw new Error('useAcademicYear must be used within AcademicYearProvider');
  }
  return context;
}
