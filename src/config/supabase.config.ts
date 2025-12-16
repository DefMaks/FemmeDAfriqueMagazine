import Constants from 'expo-constants';

// Load from environment variables for security
// @ts-ignore - expo-constants types may not be complete
export const SUPABASE_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://hcpogyjdbtcxndzpyjvd.supabase.co';
// @ts-ignore
export const SUPABASE_ANON_KEY = Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjcG9neWpkYnRjeG5kenB5anZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4ODc2NjIsImV4cCI6MjA2ODQ2MzY2Mn0.Y-V4hPt_c1rl2ffYZ9nG53R4VuhzrmBIseJSlqJvaNo';

// Validation: Ensure environment variables are set
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ CRITICAL: Supabase credentials are missing!');
} else {
  console.log('✅ Supabase configured:', SUPABASE_URL.substring(0, 30) + '...');
}
