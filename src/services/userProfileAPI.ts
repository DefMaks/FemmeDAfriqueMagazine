// src/services/userProfileAPI.ts
// Service pour gérer le profil utilisateur via l'API WordPress DefMaks

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';

const WP_BASE_URL = process.env.EXPO_PUBLIC_WORDPRESS_API_URL || 'https://femmedafrique.net/wp-json/wp/v2/';
const DEFMAKS_API = WP_BASE_URL.replace('/wp/v2/', '/defmaks/v1');

// Storage keys
const STORAGE_KEYS = {
  JWT_TOKEN: '@fda_jwt_token',
  USER_PROFILE: '@fda_user_profile_cache',
  LOCAL_FAVORITES: '@fda_local_favorites',
  LOCAL_READ: '@fda_local_read',
  LOCAL_LIKES: '@fda_local_likes',
  LOCAL_SHARES: '@fda_local_shares',
  LOCAL_PURCHASES: '@fda_local_purchases',
};

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
  favorites: ArticleInteraction[];
  read_articles: ArticleInteraction[];
  liked_articles: ArticleInteraction[];
  shared_articles: ArticleInteraction[];
  active_days: string[];
  purchase_history: Purchase[];
}

export interface ArticleInteraction {
  post_id: number;
  title?: string;
  url?: string;
  date: string;
}

export interface Purchase {
  product: string;
  amount: number;
  date: string;
}

export interface UserAnalytics {
  total_read: number;
  total_favorites: number;
  total_likes: number;
  total_shares: number;
  total_active_days: number;
  total_purchases: number;
  recent_activity: ArticleInteraction[];
}

export interface ProfileUpdateData {
  user_name?: string;
  user_phone?: string;
  user_facebook?: string;
  user_twitter?: string;
  user_tiktok?: string;
  user_photo?: string;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: {
    id: number;
    email: string;
    name: string;
  };
  message?: string;
}

// Cache local pour le profil
let cachedProfile: UserProfile | null = null;

/**
 * Récupérer le token JWT stocké
 */
export const getStoredToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(STORAGE_KEYS.JWT_TOKEN);
  } catch {
    return null;
  }
};

/**
 * Sauvegarder le token JWT
 */
export const saveToken = async (token: string): Promise<void> => {
  await AsyncStorage.setItem(STORAGE_KEYS.JWT_TOKEN, token);
};

/**
 * Supprimer le token JWT
 */
export const clearToken = async (): Promise<void> => {
  await AsyncStorage.removeItem(STORAGE_KEYS.JWT_TOKEN);
};

/**
 * Récupérer les headers d'authentification
 */
const getHeaders = async (): Promise<HeadersInit> => {
  const token = await getStoredToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

/**
 * Vérifier si l'utilisateur est connecté
 */
export const isUserLoggedIn = async (): Promise<boolean> => {
  const token = await getStoredToken();
  return !!token;
};

// ==================== AUTHENTIFICATION ====================

/**
 * Créer un nouveau compte utilisateur
 */
export const registerUser = async (
  email: string,
  password: string,
  name: string
): Promise<AuthResponse> => {
  try {
    console.log('📝 Création de compte...');
    
    const response = await fetch(`${DEFMAKS_API}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    });

    const data = await response.json();
    console.log('📥 Réponse inscription:', data);

    if (data.success && data.token) {
      await saveToken(data.token);
      console.log('✅ Compte créé avec succès');
      return data;
    }

    return {
      success: false,
      message: data.message || 'Erreur lors de la création du compte',
    };
  } catch (error: any) {
    console.error('❌ Erreur inscription:', error);
    return {
      success: false,
      message: error.message || 'Erreur réseau',
    };
  }
};

/**
 * Connexion utilisateur
 */
export const loginUser = async (
  email: string,
  password: string
): Promise<AuthResponse> => {
  try {
    console.log('🔐 Connexion en cours...');
    
    const response = await fetch(`${DEFMAKS_API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    console.log('📥 Réponse connexion:', data);

    if (data.success && data.token) {
      await saveToken(data.token);
      console.log('✅ Connexion réussie');
      return data;
    }

    return {
      success: false,
      message: data.message || 'Identifiants incorrects',
    };
  } catch (error: any) {
    console.error('❌ Erreur connexion:', error);
    return {
      success: false,
      message: error.message || 'Erreur réseau',
    };
  }
};

/**
 * Déconnexion
 */
export const logoutUser = async (): Promise<void> => {
  await clearToken();
  cachedProfile = null;
  await AsyncStorage.removeItem(STORAGE_KEYS.USER_PROFILE);
  console.log('👋 Déconnexion effectuée');
};

// ==================== PROFIL ====================

/**
 * Récupérer le profil utilisateur complet
 */
export const getUserProfile = async (): Promise<UserProfile | null> => {
  try {
    const loggedIn = await isUserLoggedIn();
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

    // Transformer les données si nécessaire
    const profile: UserProfile = {
      id: data.id,
      email: data.email || '',
      name: data.name || '',
      phone: data.phone || data.user_phone || '',
      facebook: data.facebook || data.user_facebook || '',
      twitter: data.twitter || data.user_twitter || '',
      tiktok: data.tiktok || data.user_tiktok || '',
      photo: data.photo || data.user_photo || '',
      favorites: data.favorites || [],
      read_articles: data.read_articles || [],
      liked_articles: data.liked_articles || [],
      shared_articles: data.shared_articles || [],
      active_days: data.active_days || [],
      purchase_history: data.purchase_history || [],
    };

    // Mettre en cache
    cachedProfile = profile;
    await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));

    return profile;
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
    const cached = await AsyncStorage.getItem(STORAGE_KEYS.USER_PROFILE);
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
    const loggedIn = await isUserLoggedIn();
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
      cachedProfile = null;
      await AsyncStorage.removeItem(STORAGE_KEYS.USER_PROFILE);
    }

    return result;
  } catch (error) {
    console.error('❌ Erreur deleteUserProfile:', error);
    return { success: false, message: 'Erreur réseau' };
  }
};

// ==================== UPLOAD IMAGE ====================

/**
 * Sélectionner et uploader une photo de profil
 */
export const uploadProfilePhoto = async (): Promise<{ success: boolean; url?: string }> => {
  try {
    // Demander la permission
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      return { success: false };
    }

    // Sélectionner l'image
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]) {
      return { success: false };
    }

    const imageUri = result.assets[0].uri;
    
    // Créer le FormData pour l'upload
    const formData = new FormData();
    formData.append('file', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'profile_photo.jpg',
    } as any);

    const token = await getStoredToken();
    
    // Upload vers WordPress Media
    const response = await fetch(`${WP_BASE_URL}media`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Disposition': 'attachment; filename=profile_photo.jpg',
      },
      body: formData,
    });

    if (response.ok) {
      const data = await response.json();
      const photoUrl = data.source_url || data.guid?.rendered;
      
      // Mettre à jour le profil avec la nouvelle photo
      await updateUserProfile({ user_photo: photoUrl });
      
      return { success: true, url: photoUrl };
    }

    return { success: false };
  } catch (error) {
    console.error('❌ Erreur upload photo:', error);
    return { success: false };
  }
};

// ==================== INTERACTIONS ARTICLES ====================

/**
 * Marquer un article comme lu
 */
export const markArticleAsRead = async (
  postId: number,
  title?: string,
  url?: string
): Promise<{ success: boolean; read_articles?: ArticleInteraction[] }> => {
  try {
    const loggedIn = await isUserLoggedIn();
    if (!loggedIn) {
      return saveLocalInteraction(STORAGE_KEYS.LOCAL_READ, postId, title, url);
    }

    const headers = await getHeaders();
    const response = await fetch(`${DEFMAKS_API}/user/read`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ post_id: postId, title, url }),
    });

    const result = await response.json();
    
    if (result.success && cachedProfile) {
      cachedProfile.read_articles = result.read_articles;
    }

    return result;
  } catch (error) {
    console.error('❌ Erreur markArticleAsRead:', error);
    return saveLocalInteraction(STORAGE_KEYS.LOCAL_READ, postId, title, url);
  }
};

/**
 * Toggle favori sur un article
 */
export const toggleFavorite = async (
  postId: number,
  title?: string,
  url?: string
): Promise<{ success: boolean; favorites?: ArticleInteraction[]; isFavorite: boolean }> => {
  try {
    const loggedIn = await isUserLoggedIn();
    if (!loggedIn) {
      return toggleLocalInteraction(STORAGE_KEYS.LOCAL_FAVORITES, postId, title, url);
    }

    const headers = await getHeaders();
    const response = await fetch(`${DEFMAKS_API}/user/favorite`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ post_id: postId, title, url }),
    });

    const result = await response.json();
    
    if (result.success && cachedProfile) {
      cachedProfile.favorites = result.favorites;
    }

    const isFavorite = result.favorites?.some((f: any) => 
      (typeof f === 'number' ? f : f.post_id) === postId
    ) || false;

    return { success: result.success, favorites: result.favorites, isFavorite };
  } catch (error) {
    console.error('❌ Erreur toggleFavorite:', error);
    return toggleLocalInteraction(STORAGE_KEYS.LOCAL_FAVORITES, postId, title, url);
  }
};

/**
 * Toggle like sur un article
 */
export const toggleLike = async (
  postId: number,
  title?: string,
  url?: string
): Promise<{ success: boolean; liked_articles?: ArticleInteraction[]; isLiked: boolean }> => {
  try {
    const loggedIn = await isUserLoggedIn();
    if (!loggedIn) {
      return toggleLocalInteraction(STORAGE_KEYS.LOCAL_LIKES, postId, title, url);
    }

    const headers = await getHeaders();
    const response = await fetch(`${DEFMAKS_API}/user/like`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ post_id: postId, title, url }),
    });

    const result = await response.json();
    
    if (result.success && cachedProfile) {
      cachedProfile.liked_articles = result.liked_articles;
    }

    const isLiked = result.liked_articles?.some((l: any) => 
      (typeof l === 'number' ? l : l.post_id) === postId
    ) || false;

    return { success: result.success, liked_articles: result.liked_articles, isLiked };
  } catch (error) {
    console.error('❌ Erreur toggleLike:', error);
    return toggleLocalInteraction(STORAGE_KEYS.LOCAL_LIKES, postId, title, url);
  }
};

/**
 * Enregistrer un partage d'article
 */
export const recordShare = async (
  postId: number,
  title?: string,
  url?: string
): Promise<{ success: boolean; shared_articles?: ArticleInteraction[] }> => {
  try {
    const loggedIn = await isUserLoggedIn();
    if (!loggedIn) {
      return saveLocalInteraction(STORAGE_KEYS.LOCAL_SHARES, postId, title, url);
    }

    const headers = await getHeaders();
    const response = await fetch(`${DEFMAKS_API}/user/share`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ post_id: postId, title, url }),
    });

    const result = await response.json();
    
    if (result.success && cachedProfile) {
      cachedProfile.shared_articles = result.shared_articles;
    }

    return result;
  } catch (error) {
    console.error('❌ Erreur recordShare:', error);
    return saveLocalInteraction(STORAGE_KEYS.LOCAL_SHARES, postId, title, url);
  }
};

/**
 * Vérifier si un article est en favori
 */
export const isFavorite = async (postId: number): Promise<boolean> => {
  try {
    if (cachedProfile?.favorites) {
      return cachedProfile.favorites.some((f: any) => 
        (typeof f === 'number' ? f : f.post_id) === postId
      );
    }

    const stored = await AsyncStorage.getItem(STORAGE_KEYS.LOCAL_FAVORITES);
    if (stored) {
      const favorites: ArticleInteraction[] = JSON.parse(stored);
      return favorites.some(f => f.post_id === postId);
    }

    return false;
  } catch (error) {
    return false;
  }
};

/**
 * Vérifier si un article est liké
 */
export const isLiked = async (postId: number): Promise<boolean> => {
  try {
    if (cachedProfile?.liked_articles) {
      return cachedProfile.liked_articles.some((l: any) => 
        (typeof l === 'number' ? l : l.post_id) === postId
      );
    }

    const stored = await AsyncStorage.getItem(STORAGE_KEYS.LOCAL_LIKES);
    if (stored) {
      const likes: ArticleInteraction[] = JSON.parse(stored);
      return likes.some(l => l.post_id === postId);
    }

    return false;
  } catch (error) {
    return false;
  }
};

/**
 * Récupérer tous les favoris
 */
export const getFavorites = async (): Promise<ArticleInteraction[]> => {
  try {
    if (cachedProfile?.favorites) {
      return cachedProfile.favorites;
    }

    const stored = await AsyncStorage.getItem(STORAGE_KEYS.LOCAL_FAVORITES);
    if (stored) {
      return JSON.parse(stored);
    }

    return [];
  } catch (error) {
    return [];
  }
};

// ==================== ACTIVITÉ & ACHATS ====================

/**
 * Enregistrer un jour d'activité
 */
export const addActiveDay = async (): Promise<{ success: boolean; active_days?: string[] }> => {
  try {
    const loggedIn = await isUserLoggedIn();
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
export const addPurchase = async (
  product: string,
  amount: number
): Promise<{ success: boolean; purchase_history?: Purchase[] }> => {
  try {
    const loggedIn = await isUserLoggedIn();
    if (!loggedIn) {
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

/**
 * Récupérer l'historique des achats
 */
export const getPurchaseHistory = async (): Promise<Purchase[]> => {
  try {
    if (cachedProfile?.purchase_history) {
      return cachedProfile.purchase_history;
    }

    const stored = await AsyncStorage.getItem(STORAGE_KEYS.LOCAL_PURCHASES);
    if (stored) {
      return JSON.parse(stored);
    }

    return [];
  } catch (error) {
    return [];
  }
};

// ==================== ANALYTICS ====================

/**
 * Récupérer les statistiques utilisateur
 */
export const getUserAnalytics = async (): Promise<UserAnalytics | null> => {
  try {
    const loggedIn = await isUserLoggedIn();
    if (!loggedIn) {
      return getLocalAnalytics();
    }

    const headers = await getHeaders();
    const response = await fetch(`${DEFMAKS_API}/user/analytics`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      return getLocalAnalytics();
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('❌ Erreur getUserAnalytics:', error);
    return getLocalAnalytics();
  }
};

/**
 * Calculer les analytics locales
 */
const getLocalAnalytics = async (): Promise<UserAnalytics> => {
  try {
    const [favorites, read, likes, shares, purchases] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.LOCAL_FAVORITES),
      AsyncStorage.getItem(STORAGE_KEYS.LOCAL_READ),
      AsyncStorage.getItem(STORAGE_KEYS.LOCAL_LIKES),
      AsyncStorage.getItem(STORAGE_KEYS.LOCAL_SHARES),
      AsyncStorage.getItem(STORAGE_KEYS.LOCAL_PURCHASES),
    ]);

    const favList: ArticleInteraction[] = favorites ? JSON.parse(favorites) : [];
    const readList: ArticleInteraction[] = read ? JSON.parse(read) : [];
    const likeList: ArticleInteraction[] = likes ? JSON.parse(likes) : [];
    const shareList: ArticleInteraction[] = shares ? JSON.parse(shares) : [];
    const purchaseList: Purchase[] = purchases ? JSON.parse(purchases) : [];

    // Fusionner et trier les activités récentes
    const allActivity = [...favList, ...readList, ...likeList, ...shareList]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);

    return {
      total_read: readList.length,
      total_favorites: favList.length,
      total_likes: likeList.length,
      total_shares: shareList.length,
      total_active_days: 0,
      total_purchases: purchaseList.length,
      recent_activity: allActivity,
    };
  } catch (error) {
    return {
      total_read: 0,
      total_favorites: 0,
      total_likes: 0,
      total_shares: 0,
      total_active_days: 0,
      total_purchases: 0,
      recent_activity: [],
    };
  }
};

// ==================== STOCKAGE LOCAL (FALLBACK) ====================

const saveLocalInteraction = async (
  key: string,
  postId: number,
  title?: string,
  url?: string
): Promise<{ success: boolean }> => {
  try {
    const stored = await AsyncStorage.getItem(key);
    let items: ArticleInteraction[] = stored ? JSON.parse(stored) : [];

    if (!items.find(i => i.post_id === postId)) {
      items.push({
        post_id: postId,
        title,
        url,
        date: new Date().toISOString(),
      });
      await AsyncStorage.setItem(key, JSON.stringify(items));
    }

    return { success: true };
  } catch (error) {
    return { success: false };
  }
};

const toggleLocalInteraction = async (
  key: string,
  postId: number,
  title?: string,
  url?: string
): Promise<{ success: boolean; isFavorite: boolean; isLiked: boolean }> => {
  try {
    const stored = await AsyncStorage.getItem(key);
    let items: ArticleInteraction[] = stored ? JSON.parse(stored) : [];

    const index = items.findIndex(i => i.post_id === postId);
    const exists = index !== -1;

    if (exists) {
      items.splice(index, 1);
    } else {
      items.push({
        post_id: postId,
        title,
        url,
        date: new Date().toISOString(),
      });
    }

    await AsyncStorage.setItem(key, JSON.stringify(items));
    
    return { success: true, isFavorite: !exists, isLiked: !exists };
  } catch (error) {
    return { success: false, isFavorite: false, isLiked: false };
  }
};

const addLocalPurchase = async (
  product: string,
  amount: number
): Promise<{ success: boolean; purchase_history: Purchase[] }> => {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.LOCAL_PURCHASES);
    let purchases: Purchase[] = stored ? JSON.parse(stored) : [];

    purchases.push({
      product,
      amount,
      date: new Date().toISOString(),
    });

    await AsyncStorage.setItem(STORAGE_KEYS.LOCAL_PURCHASES, JSON.stringify(purchases));
    return { success: true, purchase_history: purchases };
  } catch (error) {
    return { success: false, purchase_history: [] };
  }
};

// ==================== SYNCHRONISATION ====================

/**
 * Synchroniser les données locales avec le serveur
 */
export const syncLocalDataToServer = async (): Promise<{ success: boolean; synced: string[] }> => {
  const synced: string[] = [];

  try {
    const loggedIn = await isUserLoggedIn();
    if (!loggedIn) {
      return { success: false, synced: [] };
    }

    // Synchroniser les favoris
    const localFavorites = await AsyncStorage.getItem(STORAGE_KEYS.LOCAL_FAVORITES);
    if (localFavorites) {
      const favorites: ArticleInteraction[] = JSON.parse(localFavorites);
      for (const fav of favorites) {
        await toggleFavorite(fav.post_id, fav.title, fav.url);
      }
      await AsyncStorage.removeItem(STORAGE_KEYS.LOCAL_FAVORITES);
      synced.push('favorites');
    }

    // Synchroniser les articles lus
    const localRead = await AsyncStorage.getItem(STORAGE_KEYS.LOCAL_READ);
    if (localRead) {
      const readArticles: ArticleInteraction[] = JSON.parse(localRead);
      for (const article of readArticles) {
        await markArticleAsRead(article.post_id, article.title, article.url);
      }
      await AsyncStorage.removeItem(STORAGE_KEYS.LOCAL_READ);
      synced.push('read');
    }

    // Synchroniser les likes
    const localLikes = await AsyncStorage.getItem(STORAGE_KEYS.LOCAL_LIKES);
    if (localLikes) {
      const likes: ArticleInteraction[] = JSON.parse(localLikes);
      for (const like of likes) {
        await toggleLike(like.post_id, like.title, like.url);
      }
      await AsyncStorage.removeItem(STORAGE_KEYS.LOCAL_LIKES);
      synced.push('likes');
    }

    // Synchroniser les partages
    const localShares = await AsyncStorage.getItem(STORAGE_KEYS.LOCAL_SHARES);
    if (localShares) {
      const shares: ArticleInteraction[] = JSON.parse(localShares);
      for (const share of shares) {
        await recordShare(share.post_id, share.title, share.url);
      }
      await AsyncStorage.removeItem(STORAGE_KEYS.LOCAL_SHARES);
      synced.push('shares');
    }

    // Synchroniser les achats
    const localPurchases = await AsyncStorage.getItem(STORAGE_KEYS.LOCAL_PURCHASES);
    if (localPurchases) {
      const purchases: Purchase[] = JSON.parse(localPurchases);
      for (const purchase of purchases) {
        await addPurchase(purchase.product, purchase.amount);
      }
      await AsyncStorage.removeItem(STORAGE_KEYS.LOCAL_PURCHASES);
      synced.push('purchases');
    }

    console.log('✅ Synchronisation terminée:', synced);
    return { success: true, synced };
  } catch (error) {
    console.error('❌ Erreur synchronisation:', error);
    return { success: false, synced };
  }
};

export default {
  // Auth
  registerUser,
  loginUser,
  logoutUser,
  isUserLoggedIn,
  getStoredToken,
  // Profile
  getUserProfile,
  updateUserProfile,
  deleteUserProfile,
  uploadProfilePhoto,
  // Interactions
  markArticleAsRead,
  toggleFavorite,
  toggleLike,
  recordShare,
  isFavorite,
  isLiked,
  getFavorites,
  // Activity
  addActiveDay,
  addPurchase,
  getPurchaseHistory,
  // Analytics
  getUserAnalytics,
  // Sync
  syncLocalDataToServer,
};
