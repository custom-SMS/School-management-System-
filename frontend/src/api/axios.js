import axios from 'axios';

const getBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  const isBrowser = typeof window !== 'undefined';
  const isProductionDomain = isBrowser && !['localhost', '127.0.0.1'].includes(window.location.hostname);

  if (isProductionDomain && (!envUrl || envUrl.includes('localhost'))) {
    return 'https://school-management-system-1-bd84.onrender.com/api';
  }

  return envUrl || 'http://localhost:8000/api';
};

const api = axios.create({
  baseURL: getBaseUrl(),
  withCredentials: true, // send/receive the httpOnly auth cookie automatically
});

import { toast } from 'react-toastify';

api.interceptors.request.use(
  (config) => {
    const yearViewId = localStorage.getItem('superAdminYearViewId');
    if (yearViewId) {
      config.headers['x-super-admin-year-view-id'] = yearViewId;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const onLoginPage = window.location.pathname === '/login';
    // Allow individual requests to opt out of the global error toast
    // by passing { skipGlobalErrorToast: true } in the request config.
    const skip = error.config?.skipGlobalErrorToast;

    if (status === 400 && error.response?.data?.message?.includes('selected academic year does not exist')) {
      localStorage.removeItem('superAdminYearViewId');
      // Reload to clear stale context
      window.location.reload();
      return Promise.reject(error);
    }

    if (status === 401 && !onLoginPage) {
      localStorage.removeItem('user');
      window.location.assign('/login');
    } else if (!skip && status >= 500) {
      toast.error('Server error. Please try again later.');
    } else if (!error.response && error.code !== 'ERR_CANCELED') {
      toast.error('Network error. Please check your connection.');
    } else if (!skip && status >= 400 && status !== 401) {
      // Don't show toast for 400 if it's already handled, but for GET requests it's useful
      if (error.config?.method === 'get') {
         toast.error(error.response?.data?.message || 'Failed to fetch data.');
      }
    }
    return Promise.reject(error);
  },
);

export default api;
