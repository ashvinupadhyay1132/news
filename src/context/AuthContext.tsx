
"use client";

import type { ReactNode } from 'react';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface User {
  email: string;
  // Add other user properties if needed
}

interface AuthContextType {
  user: User | null;
  // isAdmin: boolean; // Removed isAdmin
  isLoading: boolean;
  login: (emailValue: string, passwordValue: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  // const [isAdmin, setIsAdmin] = useState<boolean>(false); // Removed isAdmin
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { toast } = useToast();

  const checkSession = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/user');
      if (response.ok) {
        const data = await response.json();
        if (data.isLoggedIn && data.email) {
          setUser({ email: data.email });
          // setIsAdmin(data.isAdmin || false); // Removed isAdmin
          // console.log('[AuthContext] Session checked, user is logged in:', data.email);
        } else {
          setUser(null);
          // setIsAdmin(false); // Removed isAdmin
          // console.log('[AuthContext] Session checked, no active user.');
        }
      } else {
        console.error('[AuthContext] /api/auth/user call failed, status:', response.status, await response.text().catch(()=>""));
        setUser(null);
        // setIsAdmin(false); // Removed isAdmin
      }
    } catch (error) {
      console.error('[AuthContext] Error checking session:', error);
      setUser(null);
      // setIsAdmin(false); // Removed isAdmin
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const login = async (emailValue: string, passwordValue: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailValue, password: passwordValue }),
      });
      const data = await response.json();
      if (response.ok && data.success && data.user) {
        setUser({ email: data.user.email });
        // setIsAdmin(data.user.isAdmin || false); // Removed isAdmin
        toast({ title: 'Login Successful', description: `Welcome, ${data.user.email}!` });
        console.log('[AuthContext] Login successful:', data.user.email);
        setIsLoading(false);
        return true;
      } else {
        const errorMessage = data.message || 'Login failed. Please check your credentials.';
        toast({ title: 'Login Failed', description: errorMessage, variant: 'destructive' });
        console.error('[AuthContext] Login failed:', errorMessage);
        setUser(null);
        // setIsAdmin(false); // Removed isAdmin
        setIsLoading(false);
        return false;
      }
    } catch (error) {
      console.error('[AuthContext] Error during login:', error);
      toast({ title: 'Login Error', description: 'An unexpected error occurred.', variant: 'destructive' });
      setUser(null);
      // setIsAdmin(false); // Removed isAdmin
      setIsLoading(false);
      return false;
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      // setIsAdmin(false); // Removed isAdmin
      toast({ title: 'Logged Out', description: 'You have been successfully logged out.' });
      console.log('[AuthContext] User logged out.');
    } catch (error) {
      console.error('[AuthContext] Error during logout:', error);
      toast({ title: 'Logout Error', description: 'Failed to logout.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, /*isAdmin,*/ isLoading, login, logout, checkSession }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
