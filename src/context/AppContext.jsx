import {
  createContext,
  startTransition,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

const AppContext = createContext(null);

const THEME_KEY = 'chat-app-theme';

export function AppProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_KEY) || 'dark');
  const [toasts, setToasts] = useState([]);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(THEME_KEY, theme);
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const toggleTheme = () => {
    startTransition(() => {
      setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
    });
  };

  const pushToast = ({ title, description, tone = 'info' }) => {
    const id = crypto.randomUUID();

    setToasts((current) => [...current, { id, title, description, tone }]);

    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 3400);
  };

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      toggleTheme,
      toasts,
      pushToast,
      isMobileSidebarOpen,
      setIsMobileSidebarOpen,
    }),
    [theme, toasts, isMobileSidebarOpen]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }

  return context;
}
