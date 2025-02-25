import { useState, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SharedLayout from '../../../components/SharedLayout';
import { useUser } from '../../../components/UserContext';

// Fallback list of common timezones
const TIMEZONES = [
  'Pacific/Honolulu',
  'America/Anchorage',
  'America/Los_Angeles',
  'America/Phoenix',
  'America/Denver',
  'America/Chicago',
  'America/New_York',
  'America/Sao_Paulo',
  'Atlantic/Cape_Verde',
  'Europe/London',
  'Europe/Paris',
  'Europe/Istanbul',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Bangkok',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Perth',
  'Australia/Sydney',
  'Pacific/Auckland'
].map(tz => {
  try {
    return {
      id: tz,
      name: tz.replace(/_/g, ' ').split('/').pop() || tz,
      region: tz.split('/')[0],
      offset: new Date().toLocaleString('en-US', { timeZone: tz, timeZoneName: 'long' }).split(' ').pop(),
    };
  } catch (e) {
    return null;
  }
}).filter(Boolean);

export default function TimezoneSelection() {
  const { settings, updateSettings } = useUser();
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  
  const filteredTimezones = useCallback(() => {
    return TIMEZONES.filter(tz => 
      tz.name.toLowerCase().includes(search.toLowerCase()) ||
      tz.region.toLowerCase().includes(search.toLowerCase()) ||
      tz.id.toLowerCase().includes(search.toLowerCase())
    );
  }, [search]);

  const handleSelect = async (timezone: string) => {
    try {
      setLoading(true);
      await updateSettings({ timezone });
    } catch (e) {
      console.error('Error updating timezone:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SharedLayout style={styles.container}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search timezones..."
          value={search}
          onChangeText={setSearch}
          placeholderTextColor="#999"
          editable={!loading}
        />
      </View>

      <Text style={styles.subtitle}>Current timezone</Text>
      <View style={styles.currentTimezone}>
        <Text style={styles.currentTimezoneText}>
          {settings.timezone.replace(/_/g, ' ')}
        </Text>
      </View>

      <ScrollView style={styles.content}>
        {filteredTimezones().map((timezone) => (
          <TouchableOpacity
            key={timezone.id}
            style={[
              styles.timezoneItem,
              settings.timezone === timezone.id && styles.timezoneItemSelected,
            ]}
            onPress={() => handleSelect(timezone.id)}
            disabled={loading}
          >
            <View style={styles.timezoneInfo}>
              <Text style={styles.timezoneName}>{timezone.name}</Text>
              <Text style={styles.timezoneRegion}>{timezone.region}</Text>
            </View>
            <View style={styles.timezoneRight}>
              <Text style={styles.timezoneOffset}>{timezone.offset}</Text>
              {settings.timezone === timezone.id && (
                <Ionicons name="checkmark" size={24} color="#4A90E2" />
              )}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SharedLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    margin: 16,
    padding: 12,
    borderRadius: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginHorizontal: 16,
    marginBottom: 8,
  },
  currentTimezone: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    marginHorizontal: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  currentTimezoneText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  timezoneItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  timezoneItemSelected: {
    backgroundColor: '#EBF5FF',
  },
  timezoneInfo: {
    flex: 1,
  },
  timezoneName: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    marginBottom: 4,
  },
  timezoneRegion: {
    fontSize: 14,
    color: '#666',
  },
  timezoneRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timezoneOffset: {
    fontSize: 14,
    color: '#666',
  },
});