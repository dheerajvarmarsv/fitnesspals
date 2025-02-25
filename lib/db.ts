import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

// Use different storage implementations for web and native platforms
const storage = Platform.select({
  web: {
    init: async () => {
      // No initialization needed for AsyncStorage
      return Promise.resolve(true);
    },
    save: async (userId: string, settings: any) => {
      try {
        await AsyncStorage.setItem(
          `user_settings_${userId}`,
          JSON.stringify({
            settings,
            last_synced: Date.now(),
          })
        );
        return true;
      } catch (e) {
        console.error('Error saving settings:', e);
        return false;
      }
    },
    get: async (userId: string) => {
      try {
        const data = await AsyncStorage.getItem(`user_settings_${userId}`);
        if (data) {
          return JSON.parse(data).settings;
        }
        return null;
      } catch (e) {
        console.error('Error getting settings:', e);
        return null;
      }
    },
    delete: async (userId: string) => {
      try {
        await AsyncStorage.removeItem(`user_settings_${userId}`);
        return true;
      } catch (e) {
        console.error('Error deleting settings:', e);
        return false;
      }
    },
  },
  default: {
    init: () => {
      const db = SQLite.openDatabase('userSettings.db');
      return new Promise((resolve, reject) => {
        db.transaction(tx => {
          tx.executeSql(
            `CREATE TABLE IF NOT EXISTS user_settings (
              id TEXT PRIMARY KEY,
              settings TEXT NOT NULL,
              last_synced INTEGER
            );`,
            [],
            () => resolve(true),
            (_, error) => {
              reject(error);
              return false;
            }
          );
        });
      });
    },
    save: (userId: string, settings: any) => {
      const db = SQLite.openDatabase('userSettings.db');
      return new Promise((resolve, reject) => {
        db.transaction(tx => {
          tx.executeSql(
            `INSERT OR REPLACE INTO user_settings (id, settings, last_synced) VALUES (?, ?, ?);`,
            [userId, JSON.stringify(settings), Date.now()],
            (_, result) => resolve(true),
            (_, error) => {
              reject(error);
              return false;
            }
          );
        });
      });
    },
    get: (userId: string) => {
      const db = SQLite.openDatabase('userSettings.db');
      return new Promise((resolve, reject) => {
        db.transaction(tx => {
          tx.executeSql(
            `SELECT settings FROM user_settings WHERE id = ?;`,
            [userId],
            (_, { rows: { _array } }) => {
              if (_array.length > 0) {
                resolve(JSON.parse(_array[0].settings));
              } else {
                resolve(null);
              }
            },
            (_, error) => {
              reject(error);
              return false;
            }
          );
        });
      });
    },
    delete: (userId: string) => {
      const db = SQLite.openDatabase('userSettings.db');
      return new Promise((resolve, reject) => {
        db.transaction(tx => {
          tx.executeSql(
            `DELETE FROM user_settings WHERE id = ?;`,
            [userId],
            (_, result) => resolve(true),
            (_, error) => {
              reject(error);
              return false;
            }
          );
        });
      });
    },
  },
});

// Export unified API
export const initDatabase = storage.init;
export const saveLocalSettings = storage.save;
export const getLocalSettings = storage.get;
export const deleteLocalSettings = storage.delete;