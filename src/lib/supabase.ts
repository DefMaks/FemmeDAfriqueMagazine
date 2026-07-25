import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Load directly from environment variables
const SUPABASE_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Validation: Ensure environment variables are set
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('⚠️ CRITICAL: Supabase credentials are missing! Please check your .env file.');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

let deviceId: string | null = null;

export const getDeviceId = async (): Promise<string> => {
  if (deviceId) return deviceId;

  try {
    const stored = await AsyncStorage.getItem('device_id');
    if (stored) {
      deviceId = stored;
      return stored;
    }

    const newId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await AsyncStorage.setItem('device_id', newId);
    deviceId = newId;
    return newId;
  } catch (error) {
    console.error('Error getting device ID:', error);
    return `temp_${Date.now()}`;
  }
};
