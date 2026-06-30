import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const ThemeContext = createContext(null);

function applyTheme() {
  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add('light');
  root.style.colorScheme = 'light';
}

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState('light');

  useEffect(() => {
    applyTheme();
    try {
      localStorage.setItem('nc_theme', 'light');
    } catch {
      /* ignore */
    }
  }, [theme]);

  const setTheme = useCallback(() => {
    setThemeState('light');
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState('light');
  }, []);

  const value = useMemo(
    () => ({ theme, setTheme, toggleTheme, isDark: theme === 'dark' }),
    [theme, setTheme, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};
