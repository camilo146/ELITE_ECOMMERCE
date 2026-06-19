import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  // withCredentials envía la cookie HttpOnly automáticamente en cada request.
  // El token JWT nunca se toca desde JavaScript.
  withCredentials: true,
});

// ── Token refresh automático en 401 ──────────────────────────────────────────
let isRefreshing = false;
let refreshQueue = [];

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const isAuthEndpoint = originalRequest?.url?.includes('/auth/');

    // 401 en endpoint protegido → intentar refresh silencioso
    if (status === 401 && !isAuthEndpoint && !originalRequest._retried) {
      originalRequest._retried = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        })
          .then(() => api(originalRequest))
          .catch((e) => Promise.reject(e));
      }

      isRefreshing = true;

      try {
        await api.post('/auth/refresh');
        refreshQueue.forEach(({ resolve }) => resolve());
        refreshQueue = [];
        return api(originalRequest);
      } catch {
        refreshQueue.forEach(({ reject }) => reject());
        refreshQueue = [];
        _clearSessionAndRedirect();
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    // 403 en endpoint admin → sesión expirada o sin cookie (ej: primer login
    // después de migrar de localStorage a cookies).
    // Si el usuario cree que es admin pero el backend dice 403, la cookie no
    // está presente → limpiar y redirigir al login.
    if (status === 403 && !isAuthEndpoint) {
      const stored = localStorage.getItem('user');
      if (stored) {
        try {
          const user = JSON.parse(stored);
          if (user?.role?.toUpperCase() === 'ADMIN') {
            // Admin recibiendo 403 = cookie JWT ausente → forzar re-login
            _clearSessionAndRedirect();
          }
        } catch {
          _clearSessionAndRedirect();
        }
      }
    }

    return Promise.reject(error);
  }
);

function _clearSessionAndRedirect() {
  localStorage.removeItem('user');
  // Evitar bucle si ya estamos en /login
  if (!window.location.pathname.includes('/login')) {
    window.location.href = '/login';
  }
}

export default api;
