import {
  useCallback,
  createContext,
  startTransition,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { authService } from '../services/authService.js';
import { apiClient, setAuthToken } from '../services/http.js';

const AuthContext = createContext(null);
const TOKEN_KEY = 'chat-app-token';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || '');
  const [bootstrapping, setBootstrapping] = useState(true);

  useEffect(() => {
    setAuthToken(token);
  }, [token]);

  useEffect(() => {
    const restoreSession = async () => {
      if (!token) {
        setBootstrapping(false);
        return;
      }

      try {
        const profile = await authService.getMe();
        setUser(profile.user);
      } catch {
        localStorage.removeItem(TOKEN_KEY);
        setAuthToken('');
        setToken('');
      } finally {
        setBootstrapping(false);
      }
    };

    restoreSession();
  }, [token]);

  const persistAuth = useCallback(({ user: nextUser, token: nextToken }) => {
    localStorage.setItem(TOKEN_KEY, nextToken);
    setAuthToken(nextToken);
    startTransition(() => {
      setUser(nextUser);
      setToken(nextToken);
    });
  }, []);

  const login = useCallback(async (payload) => {
    const response = await authService.login(payload);
    persistAuth(response);
    return response;
  }, [persistAuth]);

  const signup = useCallback(async (payload) => {
    const response = await authService.signup(payload);
    persistAuth(response);
    return response;
  }, [persistAuth]);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setAuthToken('');
    startTransition(() => {
      setToken('');
      setUser(null);
    });
  }, []);

  const updateCurrentUser = useCallback((updates) => {
    setUser((current) => (current ? { ...current, ...updates } : current));
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      login,
      signup,
      logout,
      updateCurrentUser,
      isAuthenticated: Boolean(token && user),
      bootstrapping,
      apiClient,
    }),
    [user, token, login, signup, logout, updateCurrentUser, bootstrapping]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
