/**
 * Configuration centralisée des variables d'environnement
 * 
 * Ce fichier centralise toutes les configurations de l'application
 * pour faciliter la gestion et le débogage.
 */

// Supabase Configuration
export const SUPABASE_CONFIG = {
  url: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
  anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
};

// WordPress API Configuration
export const WORDPRESS_CONFIG = {
  apiUrl: process.env.EXPO_PUBLIC_WORDPRESS_API_URL || 'https://femmedafrique.net/wp-json/wp/v2/',
};

// TwigaPaie Payment Gateway Configuration
export const TWIGAPAIE_CONFIG = {
  apiUrl: process.env.EXPO_PUBLIC_TWIGAPAIE_API_URL || '',
  apiKey: process.env.EXPO_PUBLIC_TWIGAPAIE_API_KEY || '',
};

// OneSignal Push Notifications Configuration
export const ONESIGNAL_CONFIG = {
  appId: process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID || '',
};

// Firebase Analytics Configuration
export const FIREBASE_CONFIG = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || '',
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || '',
};

// Validation function to check if all required configurations are present
export const validateConfig = (): { isValid: boolean; missingConfigs: string[] } => {
  const missingConfigs: string[] = [];

  // Check Supabase
  if (!SUPABASE_CONFIG.url) missingConfigs.push('EXPO_PUBLIC_SUPABASE_URL');
  if (!SUPABASE_CONFIG.anonKey) missingConfigs.push('EXPO_PUBLIC_SUPABASE_ANON_KEY');

  // Check TwigaPaie
  if (!TWIGAPAIE_CONFIG.apiUrl) missingConfigs.push('EXPO_PUBLIC_TWIGAPAIE_API_URL');
  if (!TWIGAPAIE_CONFIG.apiKey) missingConfigs.push('EXPO_PUBLIC_TWIGAPAIE_API_KEY');

  return {
    isValid: missingConfigs.length === 0,
    missingConfigs,
  };
};

// Log configuration status in development mode
if (__DEV__) {
  const { isValid, missingConfigs } = validateConfig();
  if (!isValid) {
    console.warn('⚠️ Configuration Warning: Missing environment variables:', missingConfigs.join(', '));
    console.warn('Please ensure your .env file contains all required variables.');
  } else {
    console.log('✅ All required configurations are present.');
  }
}
