import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services';
import { toast } from 'react-toastify';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (credentials) => {
    try {
      const data = await authService.login(credentials);
      setUser(data);
      localStorage.setItem('user', JSON.stringify(data));
      return data;
    } catch (error) {
      const status = error.response?.status;
      const msg = error.response?.data?.error || '';
      if (status === 401) {
        toast.error('Email o contraseña incorrectos');
      } else if (status === 403) {
        toast.warning('Debes verificar tu email antes de iniciar sesión. Revisa tu bandeja de entrada.');
      } else if (status === 429) {
        toast.error('Demasiados intentos. Intenta en 15 minutos.');
      } else {
        toast.error(msg || 'Error al iniciar sesión');
      }
      throw error;
    }
  };

  const register = async (userData) => {
    try {
      const data = await authService.register(userData);
      if (data?.emailVerificationRequired) {
        toast.info('¡Cuenta creada! Revisa tu email para verificar tu cuenta antes de iniciar sesión.');
        return data;
      }
      setUser(data);
      localStorage.setItem('user', JSON.stringify(data));
      toast.success('¡Registro exitoso! Bienvenido a ELITE.');
      return data;
    } catch (error) {
      // Muestra el primer error de validación del backend si existe
      const errors = error.response?.data?.errors;
      const backendMsg = errors?.[0] || error.response?.data?.error;
      toast.error(backendMsg || 'Error al registrarse. Verifica los datos.');
      throw error;
    }
  };

  const logout = async () => {
    try { await authService.logout(); } catch { /* ignore */ }
    setUser(null);
    localStorage.removeItem('user');
    toast.info('Sesión cerrada');
  };

  const logoutAll = async () => {
    try { await authService.logoutAll(); } catch { /* ignore */ }
    setUser(null);
    localStorage.removeItem('user');
    toast.info('Todas las sesiones cerradas');
  };

  const refreshSession = useCallback(async () => {
    try {
      const data = await authService.refresh();
      setUser(data);
      localStorage.setItem('user', JSON.stringify(data));
      return true;
    } catch {
      setUser(null);
      localStorage.removeItem('user');
      return false;
    }
  }, []);

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    logoutAll,
    refreshSession,
    isAuthenticated: !!user,
    isAdmin: user?.role?.toUpperCase() === 'ADMIN',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
