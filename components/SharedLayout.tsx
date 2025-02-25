import { StyleSheet, View, SafeAreaView } from 'react-native';
import { ReactNode } from 'react';

interface SharedLayoutProps {
  children: ReactNode;
  style?: any;
}

export default function SharedLayout({ children, style }: SharedLayoutProps) {
  return (
    <SafeAreaView style={[styles.container, style]}>
      <View style={styles.content}>
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    // Minimal horizontal padding so screens look good on all devices
    paddingHorizontal: 16,
  },
});