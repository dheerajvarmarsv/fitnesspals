import React, { ReactNode } from 'react';
import { StyleSheet, View, SafeAreaView, Platform, StatusBar } from 'react-native';
import { lightTheme } from '../lib/theme';

interface SharedLayoutProps {
  children: ReactNode;
  style?: any;
  useSafeArea?: boolean;
  noHorizontalPadding?: boolean;
}

// This component provides a consistent layout for screens with proper
// handling of safe areas and styling
export default function SharedLayout({ 
  children, 
  style, 
  useSafeArea = true,
  noHorizontalPadding = false,
}: SharedLayoutProps) {
  // Use light theme by default for now
  const theme = lightTheme;
  const isDark = false;

  const Container = useSafeArea ? SafeAreaView : View;

  return (
    <>
      <StatusBar 
        barStyle={isDark ? 'light-content' : 'dark-content'} 
        backgroundColor={theme.colors.background}
      />
      <Container style={[
        styles.container, 
        { backgroundColor: theme.colors.background },
        style
      ]}>
        <View style={[
          styles.content,
          !noHorizontalPadding && { paddingHorizontal: theme.spacing.medium },
        ]}>
          {children}
        </View>
      </Container>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});