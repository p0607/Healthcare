import axios from 'axios';

/** Dev: Vite proxies /api → localhost:5050. Override with VITE_API_URL if needed. */
const baseURL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL,
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('nc_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 401) {
      localStorage.removeItem('nc_token');
      localStorage.removeItem('nc_user');
    }
    return Promise.reject(err);
  }
);
