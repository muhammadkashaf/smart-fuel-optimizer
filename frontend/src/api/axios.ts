import axios from 'axios';

const TOKEN_KEY = 'smart_fuel_token';
const USER_KEY = 'smart_fuel_user';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api' });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
api.interceptors.response.use(
  (response) => {
    const method = response.config.method?.toLowerCase();
    const path = response.config.url ?? '';
    if (method && method !== 'get' && !path.endsWith('/route-options') &&
      /\/(?:fuel-records|budgets|trips|crisis-mode|vehicles)(?:\/|$)/.test(path)) {
      window.dispatchEvent(new Event('notifications:refresh'));
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      if (location.pathname !== '/login') location.assign('/login');
    }
    return Promise.reject(error);
  },
);
export default api;
