import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api',
  withCredentials: true, // send/receive the httpOnly auth cookie automatically
});

import { toast } from 'react-toastify';

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const onLoginPage = window.location.pathname === '/login';
    // Allow individual requests to opt out of the global error toast
    // by passing { skipGlobalErrorToast: true } in the request config.
    const skip = error.config?.skipGlobalErrorToast;

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
