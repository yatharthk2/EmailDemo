import { useState, useEffect } from 'react';

interface GmailAuthState {
  accessToken: string | null;
  refreshToken: string | null;
  userEmail: string | null;
  userName: string | null;
  isAuthenticated: boolean;
  expiresAt: number | null;
}

interface UseGmailAuthReturn extends GmailAuthState {
  login: (authData: {
    access_token: string;
    refresh_token?: string;
    email: string;
    name?: string;
    expires_in?: number;
  }) => void;
  logout: () => void;
  isTokenExpired: () => boolean;
  refreshAccessToken: () => Promise<boolean>;
}

const STORAGE_KEY = 'gmail_auth_data';

export const useGmailAuth = (): UseGmailAuthReturn => {
  const [authState, setAuthState] = useState<GmailAuthState>({
    accessToken: null,
    refreshToken: null,
    userEmail: null,
    userName: null,
    isAuthenticated: false,
    expiresAt: null,
  });

  // Load auth state from localStorage on mount
  useEffect(() => {
    const savedAuth = localStorage.getItem(STORAGE_KEY);
    if (savedAuth) {
      try {
        const parsedAuth = JSON.parse(savedAuth);
        setAuthState(parsedAuth);
      } catch (error) {
        console.error('Error parsing saved auth data:', error);
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  // Save auth state to localStorage whenever it changes
  useEffect(() => {
    if (authState.isAuthenticated) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(authState));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [authState]);

  const login = (authData: {
    access_token: string;
    refresh_token?: string;
    email: string;
    name?: string;
    expires_in?: number;
  }) => {
    const expiresAt = authData.expires_in 
      ? Date.now() + (authData.expires_in * 1000)
      : null;

    setAuthState({
      accessToken: authData.access_token,
      refreshToken: authData.refresh_token || null,
      userEmail: authData.email,
      userName: authData.name || null,
      isAuthenticated: true,
      expiresAt,
    });
  };

  const logout = () => {
    setAuthState({
      accessToken: null,
      refreshToken: null,
      userEmail: null,
      userName: null,
      isAuthenticated: false,
      expiresAt: null,
    });
  };

  const isTokenExpired = (): boolean => {
    if (!authState.expiresAt) return false;
    return Date.now() >= authState.expiresAt;
  };

  const refreshAccessToken = async (): Promise<boolean> => {
    if (!authState.refreshToken) return false;

    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refresh_token: authState.refreshToken,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const expiresAt = data.expires_in 
          ? Date.now() + (data.expires_in * 1000)
          : null;

        setAuthState(prev => ({
          ...prev,
          accessToken: data.access_token,
          expiresAt,
        }));

        return true;
      }
    } catch (error) {
      console.error('Error refreshing token:', error);
    }

    return false;
  };

  return {
    ...authState,
    login,
    logout,
    isTokenExpired,
    refreshAccessToken,
  };
};
