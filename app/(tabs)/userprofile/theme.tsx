import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SharedLayout from '../../../components/SharedLayout';
import { useTheme, ThemeType } from '../../../lib/ThemeContext';

export default function ThemeSettings() {
  const { themeType, setThemeType, theme } = useTheme();

  const themeOptions: { value: ThemeType; label: string; icon: string }[] = [
    { value: 'light', label: 'Light Theme', icon: 'sunny-outline' },
    { value: 'dark', label: 'Dark Theme', icon: 'moon-outline' },
    { value: 'system', label: 'System Default', icon: 'settings-outline' },
  ];

  return (
    <SharedLayout style={{ 
      flex: 1, 
      backgroundColor: theme.colors.background 
    }}>
      <View style={styles.content}>
        <Text style={[
          styles.title,
          { color: theme.colors.textPrimary }
        ]}>
          Choose Theme
        </Text>
        
        <Text style={[
          styles.description,
          { color: theme.colors.textSecondary }
        ]}>
          Select a theme for the app or use your device's theme settings.
        </Text>

        <View style={[
          styles.optionsContainer,
          { borderColor: theme.colors.border }
        ]}>
          {themeOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.option,
                {
                  backgroundColor: 
                    themeType === option.value 
                      ? theme.colors.cardAlt 
                      : theme.colors.card,
                  borderColor: theme.colors.border,
                  ...(themeType === option.value && {
                    borderColor: theme.colors.primary,
                    borderWidth: 2,
                  }),
                }
              ]}
              onPress={() => setThemeType(option.value)}
            >
              <View style={[
                styles.iconContainer,
                {
                  backgroundColor: themeType === option.value 
                    ? theme.colors.primary 
                    : theme.colors.background
                }
              ]}>
                <Ionicons
                  name={option.icon as any}
                  size={24}
                  color={themeType === option.value ? '#fff' : theme.colors.textSecondary}
                />
              </View>
              
              <View style={styles.optionTextContainer}>
                <Text style={[
                  styles.optionTitle,
                  { color: theme.colors.textPrimary }
                ]}>
                  {option.label}
                </Text>
                
                {option.value === 'system' && (
                  <Text style={[
                    styles.optionDescription,
                    { color: theme.colors.textSecondary }
                  ]}>
                    Follows your device settings
                  </Text>
                )}
              </View>
              
              {themeType === option.value && (
                <Ionicons
                  name="checkmark-circle"
                  size={24}
                  color={theme.colors.primary}
                />
              )}
            </TouchableOpacity>
          ))}
        </View>
        
        <Text style={[
          styles.note,
          { color: theme.colors.textTertiary }
        ]}>
          Changes are applied immediately and will persist across app restarts.
        </Text>
      </View>
    </SharedLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    marginBottom: 24,
    lineHeight: 22,
  },
  optionsContainer: {
    borderRadius: 12,
    marginBottom: 20,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: 14,
  },
  note: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 20,
    fontStyle: 'italic',
  },
});