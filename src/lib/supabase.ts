import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Load directly from environment variables
// Utilise la bonne URL Supabase DefMaks
const SUPABASE_URL = process.env.EXPO_PUBLIC_DEFMAKS_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://hcpogyjdbtcxndzpyjvd.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_DEFMAKS_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Validation: Ensure environment variables are set
if (!SUPABASE_ANON_KEY) {
  console.warn('⚠️ Supabase anon key missing - some features may not work');
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
