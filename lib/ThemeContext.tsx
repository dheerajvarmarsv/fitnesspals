import React, { createContext, useContext, ReactNode } from 'react';
import { lightTheme } from './theme';

interface ThemeContextType {
  theme: typeof lightTheme; // Current theme object (always light)
  isDark: boolean; // Always false since we're always using light theme
  themeType: 'light'; // Always light
  setThemeType: (type: 'light') => void; // No-op function since we only use light theme
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // Always use light theme
  const theme = lightTheme;
  const isDark = false;
  const themeType = 'light';
  const setThemeType = () => {}; // No-op function since we only use light theme

  return (
    <ThemeContext.Provider value={{ theme, themeType, setThemeType, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook to use the theme context
export const useTheme = () => {
  const context = useContext(ThemeContext);
  
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  
  return context;
};