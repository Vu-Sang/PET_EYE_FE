import React, { createContext, useContext, useState } from 'react';
import { User } from '../types';
import { authService } from '../services/auth.service';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  isLoggedIn: boolean;
  setUserSession: (user: User) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: async () => { throw new Error('Not implemented'); },
  logout: () => {},
  isLoggedIn: false,
  setUserSession: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem('Peteye_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const login = async (email: string, password: string): Promise<User> => {
    try {
      const userData = await authService.login(email, password);
      setUser(userData);
      localStorage.setItem('Peteye_user', JSON.stringify(userData));
      return userData;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const logout = () => {
    const token = user?.token;
    
    // 1. Clear local state IMMEDIATELY for snappy UI
    setUser(null);
    localStorage.removeItem('Peteye_user');

    // 2. Notify server in the background
    if (token) {
      authService.logout(token).catch(err => console.error('Background logout error:', err));
    }
  };

  const setUserSession = (userData: User) => {
    setUser(userData);
    localStorage.setItem('Peteye_user', JSON.stringify(userData));
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoggedIn: !!user, setUserSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

