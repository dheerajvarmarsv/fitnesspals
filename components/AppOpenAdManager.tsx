import React from 'react';
import { Platform } from 'react-native';

interface AppOpenAdManagerProps {
  children: React.ReactNode;
}

export const AppOpenAdManager: React.FC<AppOpenAdManagerProps> = ({ children }) => {
  // In development on web or without native modules, just render children
  return <>{children}</>;
};

export default AppOpenAdManager;