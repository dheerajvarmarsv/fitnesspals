import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { useColorScheme, Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightTheme, darkTheme } from './theme';

export type ThemeType = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: typeof lightTheme; // Current theme object
  themeType: ThemeType; // Current theme type
  setThemeType: (type: ThemeType) => void; // Function to change theme
  isDark: boolean; // Is the current theme dark?
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const colorScheme = useColorScheme();
  const [themeType, setThemeType] = useState<ThemeType>('system');
  const [isDark, setIsDark] = useState(colorScheme === 'dark');

  // Load saved theme type from AsyncStorage on initial render
  useEffect(() => {
    const loadThemeType = async () => {
      try {
        const savedThemeType = await AsyncStorage.getItem('themeType');
        if (savedThemeType) {
          setThemeType(savedThemeType as ThemeType);
        }
      } catch (error) {
        console.log('Error loading theme:', error);
      }
    };
    
    loadThemeType();
  }, []);

  // Save theme type to AsyncStorage when it changes
  useEffect(() => {
    const saveThemeType = async () => {
      try {
        await AsyncStorage.setItem('themeType', themeType);
      } catch (error) {
        console.log('Error saving theme:', error);
      }
    };
    
    saveThemeType();
  }, [themeType]);

  // Update isDark state based on theme type and system preference
  useEffect(() => {
    const updateIsDark = () => {
      if (themeType === 'system') {
        setIsDark(Appearance.getColorScheme() === 'dark');
      } else {
        setIsDark(themeType === 'dark');
      }
    };

    updateIsDark();

    // Listen for system theme changes
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      if (themeType === 'system') {
        setIsDark(colorScheme === 'dark');
      }
    });

    return () => {
      subscription.remove();
    };
  }, [themeType]);

  // Get the current theme object based on isDark
  const theme = isDark ? darkTheme : lightTheme;

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