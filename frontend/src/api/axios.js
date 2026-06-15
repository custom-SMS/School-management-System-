import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api',
  withCredentials: true, // send/receive the httpOnly auth cookie automatically
});

// If the session cookie is missing/expired, clear local user state and bounce to login.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const onLoginPage = window.location.pathname === '/login';
    if (status === 401 && !onLoginPage) {
      localStorage.removeItem('user');
      window.location.assign('/login');
    }
    return Promise.reject(error);
  },
);

export default api;
