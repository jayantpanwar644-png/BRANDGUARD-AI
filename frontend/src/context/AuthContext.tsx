import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Organisation, BrandProfile } from '../types';
import { apiRequest } from '../api/client';

interface AuthContextType {
  user: User | null;
  organisation: Organisation | null;
  brandProfile: BrandProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [organisation, setOrganisation] = useState<Organisation | null>(null);
  const [brandProfile, setBrandProfile] = useState<BrandProfile | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('brandguard_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchCurrentUser = async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }
    try {
      const data = await apiRequest('/auth/me');
      setUser(data.user);
      setOrganisation(data.organisation);
      setBrandProfile(data.brand_profile);
    } catch (err) {
      console.error('Failed to load user session', err);
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, [token]);

  const login = async (email: string, password: string) => {
    const data = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    localStorage.setItem('brandguard_token', data.access_token);
    setToken(data.access_token);
    setUser(data.user);
    setOrganisation(data.organisation);
    await refreshProfile();
  };

  const register = async (registerData: any) => {
    const data = await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(registerData),
    });
    localStorage.setItem('brandguard_token', data.access_token);
    setToken(data.access_token);
    setUser(data.user);
    setOrganisation(data.organisation);
    await refreshProfile();
  };

  const logout = () => {
    localStorage.removeItem('brandguard_token');
    setToken(null);
    setUser(null);
    setOrganisation(null);
    setBrandProfile(null);
  };

  const refreshProfile = async () => {
    try {
      const data = await apiRequest('/auth/me');
      setUser(data.user);
      setOrganisation(data.organisation);
      setBrandProfile(data.brand_profile);
    } catch (e) {
      console.error('Refresh profile error:', e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        organisation,
        brandProfile,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        register,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
