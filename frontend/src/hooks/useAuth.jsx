import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Clear legacy storage items
    localStorage.removeItem('offlineUser');
    localStorage.removeItem('refreshToken');
    
    const token = localStorage.getItem('accessToken');
    if (token && token !== 'mock-access-token') {
      authApi.me()
        .then((res) => setUser(res.data))
        .catch(async () => {
          // Access token might be expired — attempt silent cookie refresh
          try {
            const refreshRes = await authApi.refresh();
            if (refreshRes.data?.accessToken) {
              localStorage.setItem('accessToken', refreshRes.data.accessToken);
              const meRes = await authApi.me();
              setUser(meRes.data);
            } else {
              localStorage.removeItem('accessToken');
              setUser(null);
            }
          } catch {
            localStorage.removeItem('accessToken');
            setUser(null);
          }
        })
        .finally(() => setLoading(false));
    } else {
      // No access token — attempt silent cookie refresh (user returning to tab)
      authApi.refresh()
        .then(async (refreshRes) => {
          if (refreshRes.data?.accessToken) {
            localStorage.setItem('accessToken', refreshRes.data.accessToken);
            const meRes = await authApi.me();
            setUser(meRes.data);
          } else {
            setUser(null);
          }
        })
        .catch(() => {
          setUser(null);
        })
        .finally(() => setLoading(false));
    }
  }, []);

  const login = useCallback(async ({ email, password }) => {
    const res = await authApi.login({ email, password });
    const { user, accessToken } = res.data;
    localStorage.setItem('accessToken', accessToken);
    setUser(user);
    return user;
  }, []);

  const register = useCallback(async ({ email, password, name }) => {
    const res = await authApi.register({ email, password, name });
    const { user, accessToken } = res.data;
    localStorage.setItem('accessToken', accessToken);
    setUser(user);
    return user;
  }, []);

  const logout = useCallback(() => {
    authApi.logout().catch(() => {});
    localStorage.removeItem('accessToken');
    localStorage.removeItem('offlineUser');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
