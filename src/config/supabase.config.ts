// Load from environment variables for security
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Validation: Ensure environment variables are set
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('⚠️ CRITICAL: Supabase credentials are missing! Please check your .env file.');
}
