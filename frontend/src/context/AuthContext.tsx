import { createContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { logoutRequest } from '@/api/authApi';
import type { User } from '@/types';
type AuthValue = {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
};
export const AuthContext = createContext<AuthValue | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    const t = localStorage.getItem('fleet_token');
    const u = localStorage.getItem('fleet_user');
    if (t && u) {
      try {
        setToken(t);
        setUser(JSON.parse(u));
      } catch {
        localStorage.clear();
      }
    }
  }, []);
  const login = (nextToken: string, nextUser: User) => {
    localStorage.setItem('fleet_token', nextToken);
    localStorage.setItem('fleet_user', JSON.stringify(nextUser));
    setToken(nextToken);
    setUser(nextUser);
  };
  const updateUser = (nextUser: User) => {
    localStorage.setItem('fleet_user', JSON.stringify(nextUser));
    setUser(nextUser);
  };
  const logout = async () => {
    try {
      await logoutRequest();
    } catch {
      /* token is cleared client-side regardless */
    } finally {
      localStorage.removeItem('fleet_token');
      localStorage.removeItem('fleet_user');
      setToken(null);
      setUser(null);
    }
  };
  const value = useMemo(
    () => ({ user, token, isAuthenticated: Boolean(token && user), login, logout, updateUser }),
    [token, user],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
