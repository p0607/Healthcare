import axios from 'axios';

/** Namespaced under /healthcare so it doesn't collide with other apps sharing this domain (q9lab.in/lms, /vms, ...). Override with VITE_API_URL if needed. */
const baseURL = import.meta.env.VITE_API_URL || '/healthcare/api';

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
