import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const storedTheme = typeof window !== 'undefined' ? localStorage.getItem('theme') : null;
    return (storedTheme === 'dark' || storedTheme === 'light') ? storedTheme : 'light';
  });

  useEffect(() => {
    const isDark = theme === 'system' 
      ? window.matchMedia('(prefers-color-scheme: dark)').matches 
      : theme === 'dark';
    
    const resolvedTheme = isDark ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', resolvedTheme);
    
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    if (theme === 'system') {
      localStorage.removeItem('theme');
    } else {
      localStorage.setItem('theme', theme);
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => {
      if (prev === 'dark') return 'light';
      return 'dark';
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
