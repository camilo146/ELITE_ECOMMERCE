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
    // Only the non-sensitive profile (id, username, role) is in localStorage.
    // The JWT lives in an HttpOnly cookie — JS cannot read or steal it.
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
    const data = await authService.login(credentials);
    setUser(data);
    localStorage.setItem('user', JSON.stringify(data));
    return data;
  };

  const register = async (userData) => {
    const data = await authService.register(userData);
    if (data.emailVerificationRequired) {
      // Don't set user — they must verify email before accessing the app
      toast.info('Registration successful! Please check your email to verify your account.');
      return data;
    }
    setUser(data);
    localStorage.setItem('user', JSON.stringify(data));
    toast.success('Registration successful!');
    return data;
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
    localStorage.removeItem('user');
    toast.info('Session closed');
  };

  const logoutAll = async () => {
    await authService.logoutAll();
    setUser(null);
    localStorage.removeItem('user');
    toast.info('All sessions closed');
  };

  /**
   * Called by the Axios interceptor when a 401 is received.
   * Attempts to refresh the access token using the refresh token cookie.
   * If refresh succeeds, updates the stored user profile.
   * If refresh fails, clears state and redirects to login.
   */
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
