/**
 * Configuration centralisée des variables d'environnement
 * 
 * Compatible avec les builds natifs EAS et les mises à jour OTA (Over-The-Air) :
 * Vérifie d'abord process.env (injecté à la compilation du bundle JS / OTA)
 * puis bascule sur Constants.expoConfig?.extra (intégré dans le binaire natif).
 */
import Constants from 'expo-constants';

function getEnvVar(name: string, fallback: string = ''): string {
  if (typeof process !== 'undefined' && process.env && process.env[name]) {
    return process.env[name] as string;
  }
  const extraVal = Constants.expoConfig?.extra?.[name];
  if (extraVal !== undefined && extraVal !== null && extraVal !== '') {
    return String(extraVal);
  }
  return fallback;
}

// Supabase Configuration (Femme d'Afrique unifié)
export const SUPABASE_CONFIG = {
  url: getEnvVar('EXPO_PUBLIC_SUPABASE_URL', 'https://yccuwumyebbstwvjbnwr.supabase.co'),
  anonKey: getEnvVar('EXPO_PUBLIC_SUPABASE_ANON_KEY', ''),
  publishableKey: getEnvVar('EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY', ''),
  dmksUrl: getEnvVar('EXPO_PUBLIC_SUPABASE_DMKS_URL', 'https://hcpogyjdbtcxndzpyjvd.supabase.co'),
  dmksAnonKey: getEnvVar('EXPO_PUBLIC_SUPABASE_DMKS_ANON_KEY', ''),
};

// WordPress API Configuration
export const WORDPRESS_CONFIG = {
  apiUrl: getEnvVar('EXPO_PUBLIC_WORDPRESS_API_URL', 'https://femmedafrique.net/wp-json/wp/v2/'),
};

// TwigaPaie Payment Gateway Configuration
export const TWIGAPAIE_CONFIG = {
  apiUrl: getEnvVar('EXPO_PUBLIC_TWIGAPAIE_API_URL', 'https://api-gateway-production-9ad5.up.railway.app/api'),
  apiKey: getEnvVar('EXPO_PUBLIC_TWIGAPAIE_API_KEY', ''),
  walletId: getEnvVar('EXPO_PUBLIC_WALLET_ID', '840e8cd1-d4b2-4bdf-afb7-d5fe5f35bfc9'),
};

// OneSignal Push Notifications Configuration
export const ONESIGNAL_CONFIG = {
  appId: getEnvVar('EXPO_PUBLIC_ONESIGNAL_APP_ID', ''),
};

// Firebase Analytics Configuration
export const FIREBASE_CONFIG = {
  apiKey: getEnvVar('EXPO_PUBLIC_FIREBASE_API_KEY', ''),
  projectId: getEnvVar('EXPO_PUBLIC_FIREBASE_PROJECT_ID', ''),
  storageBucket: getEnvVar('EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET', ''),
  appId: getEnvVar('EXPO_PUBLIC_FIREBASE_APP_ID', ''),
  measurementId: getEnvVar('EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID', ''),
  ga4ApiSecret: getEnvVar('EXPO_PUBLIC_GA4_API_SECRET', ''),
};

// Uploadcare Configuration
export const UPLOADCARE_CONFIG = {
  apiKey: getEnvVar('EXPO_PUBLIC_UPLOADCARE_API_KEY', '6bc8aff457485b40878e'),
};

// Contexte Applicatif & Agent
export const APP_CONFIG = {
  media: getEnvVar('EXPO_PUBLIC_MEDIA', 'FDA'),
  agent: getEnvVar('EXPO_PUBLIC_AGENT', 'agent@defmaks.com'),
  agentPass: getEnvVar('EXPO_PUBLIC_AGENT_PASS', 'Twa7achtek++'),
  isProd: getEnvVar('EXPO_PUBLIC_IS_PROD', 'false').toLowerCase() === 'true',
};

// Validation function to check if all required configurations are present
export const validateConfig = (): { isValid: boolean; missingConfigs: string[] } => {
  const missingConfigs: string[] = [];

  if (!SUPABASE_CONFIG.url) missingConfigs.push('EXPO_PUBLIC_SUPABASE_URL');
  if (!SUPABASE_CONFIG.anonKey) missingConfigs.push('EXPO_PUBLIC_SUPABASE_ANON_KEY');
  if (!TWIGAPAIE_CONFIG.apiUrl) missingConfigs.push('EXPO_PUBLIC_TWIGAPAIE_API_URL');
  if (!TWIGAPAIE_CONFIG.apiKey) missingConfigs.push('EXPO_PUBLIC_TWIGAPAIE_API_KEY');

  return {
    isValid: missingConfigs.length === 0,
    missingConfigs,
  };
};

if (__DEV__) {
  const { isValid, missingConfigs } = validateConfig();
  if (!isValid) {
    console.warn('⚠️ Configuration Warning: Missing environment variables:', missingConfigs.join(', '));
  } else {
    console.log('✅ Configuration validée (environnement prêt).');
  }
}
