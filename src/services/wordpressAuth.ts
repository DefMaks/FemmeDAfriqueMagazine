import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const WP_API_URL = (Constants.expoConfig?.extra?.EXPO_PUBLIC_WORDPRESS_API_URL || 'https://femmedafrique.net/wp-json/wp/v2').replace(/\/$/, '');
const JWT_AUTH_URL = WP_API_URL.replace('/wp/v2', '/jwt-auth/v1');

const STORAGE_KEYS = {
  JWT_TOKEN: '@fda_jwt_token',
  USER_DATA: '@fda_wp_user',
};

interface WPUser {
  id: number;
  user_email: string;
  user_nicename: string;
  user_display_name: string;
}

interface AuthResponse {
  token: string;
  user_email: string;
  user_nicename: string;
  user_display_name: string;
}

// État de l'authentification
let cachedToken: string | null = null;
let cachedUser: WPUser | null = null;

/**
 * Authentification WordPress via JWT
 */
export const loginWordPress = async (username: string, password: string): Promise<AuthResponse> => {
  try {
    const response = await fetch(`${JWT_AUTH_URL}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Sauvegarder le token
    await AsyncStorage.setItem(STORAGE_KEYS.JWT_TOKEN, data.token);
    await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify({
      user_email: data.user_email,
      user_nicename: data.user_nicename,
      user_display_name: data.user_display_name,
    }));

    cachedToken = data.token;

    return data;
  } catch (error: any) {
    console.error('Erreur login WordPress:', error.message);
    throw new Error(error.message || 'Échec de la connexion');
  }
};

/**
 * Valider le token JWT
 */
export const validateToken = async (): Promise<boolean> => {
  try {
    const token = await getToken();
    if (!token) return false;

    const response = await fetch(`${JWT_AUTH_URL}/token/validate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
    });

    if (!response.ok) return false;

    const data = await response.json();
    return data.code === 'jwt_auth_valid_token';
  } catch (error) {
    console.log('Token invalide ou expiré');
    await logout();
    return false;
  }
};

/**
 * Récupérer le token stocké
 */
export const getToken = async (): Promise<string | null> => {
  if (cachedToken) return cachedToken;

  try {
    const token = await AsyncStorage.getItem(STORAGE_KEYS.JWT_TOKEN);
    cachedToken = token;
    return token;
  } catch (error) {
    return null;
  }
};

/**
 * Récupérer les données utilisateur
 */
export const getUser = async (): Promise<WPUser | null> => {
  if (cachedUser) return cachedUser;

  try {
    const userData = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
    if (userData) {
      cachedUser = JSON.parse(userData);
      return cachedUser;
    }
    return null;
  } catch (error) {
    return null;
  }
};

/**
 * Vérifier si l'utilisateur est connecté
 */
export const isLoggedIn = async (): Promise<boolean> => {
  const token = await getToken();
  return token !== null;
};

/**
 * Déconnexion
 */
export const logout = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.JWT_TOKEN);
    await AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA);
    cachedToken = null;
    cachedUser = null;
  } catch (error) {
    console.error('Erreur déconnexion:', error);
  }
};

/**
 * Récupérer les headers d'authentification
 */
export const getAuthHeaders = async (): Promise<{ Authorization: string } | {}> => {
  const token = await getToken();
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
};
