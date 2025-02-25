import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

interface DatePickerFieldProps {
  label: string;
  value: Date | null;
  onChange: (date: Date | null) => void;
  minimumDate?: Date;
  disabled?: boolean;
}

export default function DatePickerField({ 
  label, 
  value, 
  onChange, 
  minimumDate,
  disabled = false 
}: DatePickerFieldProps) {
  const [show, setShow] = useState(false);

  const handleChange = (event: any, selectedDate?: Date) => {
    setShow(Platform.OS === 'ios');
    if (selectedDate) {
      onChange(selectedDate);
    }
  };

  const formattedDate = value ? value.toLocaleDateString() : 'Select date';

  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <Text style={styles.label}>{label}</Text>
        <input
          type="date"
          value={value ? value.toISOString().split('T')[0] : ''}
          onChange={(e) => {
            const date = e.target.value ? new Date(e.target.value) : null;
            onChange(date);
          }}
          min={minimumDate ? minimumDate.toISOString().split('T')[0] : undefined}
          style={webInputStyle}
          disabled={disabled}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Pressable 
        style={[styles.button, disabled && styles.buttonDisabled]} 
        onPress={() => !disabled && setShow(true)}
      >
        <Text style={[styles.buttonText, disabled && styles.buttonTextDisabled]}>
          {formattedDate}
        </Text>
      </Pressable>
      {show && (
        <DateTimePicker
          value={value || new Date()}
          onChange={handleChange}
          minimumDate={minimumDate}
          mode="date"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  button: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 16,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    color: '#333',
  },
  buttonTextDisabled: {
    color: '#999',
  },
});

const webInputStyle = {
  backgroundColor: '#f5f5f5',
  borderRadius: '8px',
  padding: '16px',
  fontSize: '16px',
  color: '#333',
  border: 'none',
  width: '100%',
  cursor: 'pointer',
};