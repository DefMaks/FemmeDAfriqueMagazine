// src/services/userProfileAPI.ts
// Service pour gérer le profil utilisateur via l'API WordPress DefMaks

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getToken, getAuthHeaders, isLoggedIn, getUser } from './wordpressAuth';

const WP_BASE_URL = process.env.EXPO_PUBLIC_WORDPRESS_API_URL || 'https://femmedafrique.net/wp-json';
const DEFMAKS_API = `${WP_BASE_URL.replace('/wp/v2', '')}/defmaks/v1`;

// Types
export interface UserProfile {
  id: number;
  email: string;
  name: string;
  phone: string;
  facebook: string;
  twitter: string;
  tiktok: string;
  photo: string;
  favorites: number[];
  read_articles: ReadArticle[];
  active_days: string[];
  purchase_history: Purchase[];
}

export interface ReadArticle {
  post_id: number;
  date_read: string;
}

export interface Purchase {
  product: string;
  amount: number;
  date: string;
}

export interface ProfileUpdateData {
  user_phone?: string;
  user_facebook?: string;
  user_twitter?: string;
  user_tiktok?: string;
  user_photo?: string;
}

// Cache local pour le profil
let cachedProfile: UserProfile | null = null;
const CACHE_KEY = '@fda_user_profile_cache';

/**
 * Récupérer les headers d'authentification
 */
const getHeaders = async (): Promise<HeadersInit> => {
  const token = await getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

/**
 * Récupérer le profil utilisateur complet
 */
export const getUserProfile = async (): Promise<UserProfile | null> => {
  try {
    const loggedIn = await isLoggedIn();
    if (!loggedIn) {
      console.log('ℹ️ Utilisateur non connecté');
      return getCachedProfile();
    }

    const headers = await getHeaders();
    const response = await fetch(`${DEFMAKS_API}/user/profile`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      console.warn('⚠️ Erreur API profil:', response.status);
      return getCachedProfile();
    }

    const data = await response.json();
    console.log('✅ Profil récupéré:', data.name);

    // Mettre en cache
    cachedProfile = data;
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data));

    return data;
  } catch (error) {
    console.error('❌ Erreur getUserProfile:', error);
    return getCachedProfile();
  }
};

/**
 * Récupérer le profil depuis le cache
 */
const getCachedProfile = async (): Promise<UserProfile | null> => {
  if (cachedProfile) return cachedProfile;

  try {
    const cached = await AsyncStorage.getItem(CACHE_KEY);
    if (cached) {
      cachedProfile = JSON.parse(cached);
      return cachedProfile;
    }
  } catch (error) {
    console.error('Erreur lecture cache profil:', error);
  }
  return null;
};

/**
 * Mettre à jour le profil utilisateur
 */
export const updateUserProfile = async (data: ProfileUpdateData): Promise<{ success: boolean; updated?: any }> => {
  try {
    const loggedIn = await isLoggedIn();
    if (!loggedIn) {
      console.warn('⚠️ Utilisateur non connecté');
      return { success: false };
    }

    const headers = await getHeaders();
    const response = await fetch(`${DEFMAKS_API}/user/profile`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Profil mis à jour');
      // Rafraîchir le cache
      await getUserProfile();
    }

    return result;
  } catch (error) {
    console.error('❌ Erreur updateUserProfile:', error);
    return { success: false };
  }
};

/**
 * Supprimer le profil (effacer les données)
 */
export const deleteUserProfile = async (): Promise<{ success: boolean; message?: string }> => {
  try {
    const headers = await getHeaders();
    const response = await fetch(`${DEFMAKS_API}/user/profile`, {
      method: 'DELETE',
      headers,
    });

    const result = await response.json();
    
    if (result.success) {
      // Effacer le cache local
      cachedProfile = null;
      await AsyncStorage.removeItem(CACHE_KEY);
    }

    return result;
  } catch (error) {
    console.error('❌ Erreur deleteUserProfile:', error);
    return { success: false, message: 'Erreur réseau' };
  }
};

/**
 * Ajouter/Retirer un article des favoris
 */
export const toggleFavorite = async (postId: number): Promise<{ success: boolean; favorites: number[]; isFavorite: boolean }> => {
  try {
    const loggedIn = await isLoggedIn();
    if (!loggedIn) {
      // Mode hors-ligne : sauvegarder localement
      return toggleLocalFavorite(postId);
    }

    const headers = await getHeaders();
    const response = await fetch(`${DEFMAKS_API}/user/favorites`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ post_id: postId }),
    });

    const result = await response.json();
    
    if (result.success) {
      // Mettre à jour le cache
      if (cachedProfile) {
        cachedProfile.favorites = result.favorites;
      }
      
      const isFavorite = result.favorites.includes(postId);
      console.log(`${isFavorite ? '❤️' : '💔'} Article ${postId} ${isFavorite ? 'ajouté aux' : 'retiré des'} favoris`);
      
      return { success: true, favorites: result.favorites, isFavorite };
    }

    return { success: false, favorites: [], isFavorite: false };
  } catch (error) {
    console.error('❌ Erreur toggleFavorite:', error);
    return toggleLocalFavorite(postId);
  }
};

/**
 * Gestion locale des favoris (fallback)
 */
const LOCAL_FAVORITES_KEY = '@fda_local_favorites';

const toggleLocalFavorite = async (postId: number): Promise<{ success: boolean; favorites: number[]; isFavorite: boolean }> => {
  try {
    const stored = await AsyncStorage.getItem(LOCAL_FAVORITES_KEY);
    let favorites: number[] = stored ? JSON.parse(stored) : [];

    const index = favorites.indexOf(postId);
    const isFavorite = index === -1;

    if (isFavorite) {
      favorites.push(postId);
    } else {
      favorites.splice(index, 1);
    }

    await AsyncStorage.setItem(LOCAL_FAVORITES_KEY, JSON.stringify(favorites));
    console.log(`${isFavorite ? '❤️' : '💔'} Favori local: Article ${postId}`);

    return { success: true, favorites, isFavorite };
  } catch (error) {
    console.error('Erreur favoris locaux:', error);
    return { success: false, favorites: [], isFavorite: false };
  }
};

/**
 * Vérifier si un article est en favori
 */
export const isFavorite = async (postId: number): Promise<boolean> => {
  try {
    // Vérifier d'abord le cache
    if (cachedProfile?.favorites) {
      return cachedProfile.favorites.includes(postId);
    }

    // Sinon vérifier le stockage local
    const stored = await AsyncStorage.getItem(LOCAL_FAVORITES_KEY);
    if (stored) {
      const favorites: number[] = JSON.parse(stored);
      return favorites.includes(postId);
    }

    return false;
  } catch (error) {
    return false;
  }
};

/**
 * Récupérer tous les favoris
 */
export const getFavorites = async (): Promise<number[]> => {
  try {
    // Profil connecté
    if (cachedProfile?.favorites) {
      return cachedProfile.favorites;
    }

    // Stockage local
    const stored = await AsyncStorage.getItem(LOCAL_FAVORITES_KEY);
    if (stored) {
      return JSON.parse(stored);
    }

    return [];
  } catch (error) {
    return [];
  }
};

/**
 * Marquer un article comme lu
 */
export const markArticleAsRead = async (postId: number): Promise<{ success: boolean }> => {
  try {
    const loggedIn = await isLoggedIn();
    if (!loggedIn) {
      // Mode local
      return markLocalArticleAsRead(postId);
    }

    const headers = await getHeaders();
    const response = await fetch(`${DEFMAKS_API}/user/read`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ post_id: postId }),
    });

    const result = await response.json();
    
    if (result.success && cachedProfile) {
      cachedProfile.read_articles = result.read_articles;
    }

    return { success: result.success };
  } catch (error) {
    console.error('❌ Erreur markArticleAsRead:', error);
    return markLocalArticleAsRead(postId);
  }
};

const LOCAL_READ_KEY = '@fda_local_read';

const markLocalArticleAsRead = async (postId: number): Promise<{ success: boolean }> => {
  try {
    const stored = await AsyncStorage.getItem(LOCAL_READ_KEY);
    let readArticles: ReadArticle[] = stored ? JSON.parse(stored) : [];

    // Éviter les doublons
    if (!readArticles.find(r => r.post_id === postId)) {
      readArticles.push({
        post_id: postId,
        date_read: new Date().toISOString(),
      });
      await AsyncStorage.setItem(LOCAL_READ_KEY, JSON.stringify(readArticles));
    }

    return { success: true };
  } catch (error) {
    return { success: false };
  }
};

/**
 * Vérifier si un article a été lu
 */
export const isArticleRead = async (postId: number): Promise<boolean> => {
  try {
    if (cachedProfile?.read_articles) {
      return cachedProfile.read_articles.some(r => r.post_id === postId);
    }

    const stored = await AsyncStorage.getItem(LOCAL_READ_KEY);
    if (stored) {
      const readArticles: ReadArticle[] = JSON.parse(stored);
      return readArticles.some(r => r.post_id === postId);
    }

    return false;
  } catch (error) {
    return false;
  }
};

/**
 * Enregistrer un jour d'activité
 */
export const addActiveDay = async (): Promise<{ success: boolean; active_days?: string[] }> => {
  try {
    const loggedIn = await isLoggedIn();
    if (!loggedIn) {
      return { success: false };
    }

    const headers = await getHeaders();
    const response = await fetch(`${DEFMAKS_API}/user/active`, {
      method: 'POST',
      headers,
    });

    const result = await response.json();
    
    if (result.success && cachedProfile) {
      cachedProfile.active_days = result.active_days;
    }

    return result;
  } catch (error) {
    console.error('❌ Erreur addActiveDay:', error);
    return { success: false };
  }
};

/**
 * Ajouter un achat à l'historique
 */
export const addPurchase = async (product: string, amount: number): Promise<{ success: boolean; purchase_history?: Purchase[] }> => {
  try {
    const loggedIn = await isLoggedIn();
    if (!loggedIn) {
      // Sauvegarder localement
      return addLocalPurchase(product, amount);
    }

    const headers = await getHeaders();
    const response = await fetch(`${DEFMAKS_API}/user/purchase`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ product, amount }),
    });

    const result = await response.json();
    
    if (result.success && cachedProfile) {
      cachedProfile.purchase_history = result.purchase_history;
    }

    return result;
  } catch (error) {
    console.error('❌ Erreur addPurchase:', error);
    return addLocalPurchase(product, amount);
  }
};

const LOCAL_PURCHASES_KEY = '@fda_local_purchases';

const addLocalPurchase = async (product: string, amount: number): Promise<{ success: boolean; purchase_history: Purchase[] }> => {
  try {
    const stored = await AsyncStorage.getItem(LOCAL_PURCHASES_KEY);
    let purchases: Purchase[] = stored ? JSON.parse(stored) : [];

    purchases.push({
      product,
      amount,
      date: new Date().toISOString(),
    });

    await AsyncStorage.setItem(LOCAL_PURCHASES_KEY, JSON.stringify(purchases));
    return { success: true, purchase_history: purchases };
  } catch (error) {
    return { success: false, purchase_history: [] };
  }
};

/**
 * Récupérer l'historique des achats
 */
export const getPurchaseHistory = async (): Promise<Purchase[]> => {
  try {
    if (cachedProfile?.purchase_history) {
      return cachedProfile.purchase_history;
    }

    const stored = await AsyncStorage.getItem(LOCAL_PURCHASES_KEY);
    if (stored) {
      return JSON.parse(stored);
    }

    return [];
  } catch (error) {
    return [];
  }
};

/**
 * Synchroniser les données locales avec le serveur
 */
export const syncLocalDataToServer = async (): Promise<{ success: boolean; synced: string[] }> => {
  const synced: string[] = [];

  try {
    const loggedIn = await isLoggedIn();
    if (!loggedIn) {
      return { success: false, synced: [] };
    }

    // Synchroniser les favoris locaux
    const localFavorites = await AsyncStorage.getItem(LOCAL_FAVORITES_KEY);
    if (localFavorites) {
      const favorites: number[] = JSON.parse(localFavorites);
      for (const postId of favorites) {
        await toggleFavorite(postId);
      }
      await AsyncStorage.removeItem(LOCAL_FAVORITES_KEY);
      synced.push('favorites');
    }

    // Synchroniser les articles lus
    const localRead = await AsyncStorage.getItem(LOCAL_READ_KEY);
    if (localRead) {
      const readArticles: ReadArticle[] = JSON.parse(localRead);
      for (const article of readArticles) {
        await markArticleAsRead(article.post_id);
      }
      await AsyncStorage.removeItem(LOCAL_READ_KEY);
      synced.push('read_articles');
    }

    // Synchroniser les achats
    const localPurchases = await AsyncStorage.getItem(LOCAL_PURCHASES_KEY);
    if (localPurchases) {
      const purchases: Purchase[] = JSON.parse(localPurchases);
      for (const purchase of purchases) {
        await addPurchase(purchase.product, purchase.amount);
      }
      await AsyncStorage.removeItem(LOCAL_PURCHASES_KEY);
      synced.push('purchases');
    }

    console.log('✅ Synchronisation terminée:', synced);
    return { success: true, synced };
  } catch (error) {
    console.error('❌ Erreur synchronisation:', error);
    return { success: false, synced };
  }
};

/**
 * Hook React pour utiliser l'API utilisateur
 */
export const useFAMUserAPI = () => {
  return {
    getProfile: getUserProfile,
    updateProfile: updateUserProfile,
    deleteProfile: deleteUserProfile,
    toggleFavorite,
    isFavorite,
    getFavorites,
    markRead: markArticleAsRead,
    isRead: isArticleRead,
    addActiveDay,
    addPurchase,
    getPurchaseHistory,
    syncLocalData: syncLocalDataToServer,
  };
};

export default {
  getUserProfile,
  updateUserProfile,
  deleteUserProfile,
  toggleFavorite,
  isFavorite,
  getFavorites,
  markArticleAsRead,
  isArticleRead,
  addActiveDay,
  addPurchase,
  getPurchaseHistory,
  syncLocalDataToServer,
  useFAMUserAPI,
};
