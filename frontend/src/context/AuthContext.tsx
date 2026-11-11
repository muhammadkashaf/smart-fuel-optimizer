import { createContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { logoutRequest } from '@/api/authApi';
import type { User } from '@/types';

const TOKEN_KEY = 'smart_fuel_token';
const USER_KEY = 'smart_fuel_user';

type AuthValue = {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  login: (token: string, user: User) => void;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
};

export const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    try {
      const t = localStorage.getItem(TOKEN_KEY);
      const u = localStorage.getItem(USER_KEY);
      if (t && u) {
        setToken(t);
        setUser(JSON.parse(u));
      }
    } catch {
      localStorage.clear();
      setToken(null);
      setUser(null);
    } finally {
      setIsInitializing(false);
    }
  }, []);

  const login = (nextToken: string, nextUser: User) => {
    localStorage.setItem(TOKEN_KEY, nextToken);
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    setToken(nextToken);
    setUser(nextUser);
  };

  const updateUser = (nextUser: User) => {
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    setUser(nextUser);
  };

  const logout = async () => {
    try {
      await logoutRequest();
    } catch {
      // Local sign-out still completes when the server session is unavailable.
    } finally {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      setToken(null);
      setUser(null);
    }
  };
  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token && user),
      isInitializing,
      login,
      logout,
      updateUser,
    }),
    [token, user, isInitializing],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
