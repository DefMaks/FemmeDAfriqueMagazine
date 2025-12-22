// src/hooks/useUserProfile.ts
// Hook React pour gérer le profil utilisateur et les favoris

import { useState, useEffect, useCallback } from 'react';
import {
  UserProfile,
  getUserProfile,
  updateUserProfile,
  toggleFavorite as toggleFavoriteAPI,
  isFavorite as isFavoriteAPI,
  getFavorites,
  markArticleAsRead,
  addActiveDay,
  addPurchase,
  syncLocalDataToServer,
  ProfileUpdateData,
  ArticleInteraction,
  isUserLoggedIn,
} from '../services/userProfileAPI';

interface UseUserProfileReturn {
  profile: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  favorites: ArticleInteraction[];
  refreshProfile: () => Promise<void>;
  updateProfile: (data: ProfileUpdateData) => Promise<boolean>;
  toggleFavorite: (postId: number) => Promise<boolean>;
  isFavorite: (postId: number) => boolean;
  markAsRead: (postId: number) => Promise<void>;
  recordActiveDay: () => Promise<void>;
  recordPurchase: (product: string, amount: number) => Promise<void>;
  syncData: () => Promise<void>;
}

export const useUserProfile = (): UseUserProfileReturn => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [favorites, setFavorites] = useState<ArticleInteraction[]>([]);

  // Charger le profil au montage
  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      const loggedIn = await isUserLoggedIn();
      setIsAuthenticated(loggedIn);

      if (loggedIn) {
        const userProfile = await getUserProfile();
        setProfile(userProfile);
        setFavorites(userProfile?.favorites || []);
        
        // Enregistrer le jour d'activité
        await addActiveDay();
        
        // Synchroniser les données locales si nécessaire
        await syncLocalDataToServer();
      } else {
        // Charger les favoris locaux
        const localFavorites = await getFavorites();
        setFavorites(localFavorites);
      }
    } catch (error) {
      console.error('Erreur chargement profil:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshProfile = useCallback(async () => {
    await loadProfile();
  }, []);

  const handleUpdateProfile = useCallback(async (data: ProfileUpdateData): Promise<boolean> => {
    const result = await updateUserProfile(data);
    if (result.success) {
      await refreshProfile();
    }
    return result.success;
  }, [refreshProfile]);

  const handleToggleFavorite = useCallback(async (postId: number): Promise<boolean> => {
    const result = await toggleFavoriteAPI(postId);
    if (result.success && result.favorites) {
      setFavorites(result.favorites);
    }
    return result.isFavorite;
  }, []);

  const checkIsFavorite = useCallback((postId: number): boolean => {
    return favorites.some(f => 
      (typeof f === 'number' ? f : f.post_id) === postId
    );
  }, [favorites]);

  const handleMarkAsRead = useCallback(async (postId: number) => {
    await markArticleAsRead(postId);
  }, []);

  const handleRecordActiveDay = useCallback(async () => {
    await addActiveDay();
  }, []);

  const handleRecordPurchase = useCallback(async (product: string, amount: number) => {
    await addPurchase(product, amount);
    if (isAuthenticated) {
      await refreshProfile();
    }
  }, [isAuthenticated, refreshProfile]);

  const handleSyncData = useCallback(async () => {
    await syncLocalDataToServer();
    await refreshProfile();
  }, [refreshProfile]);

  return {
    profile,
    isLoading,
    isAuthenticated,
    favorites,
    refreshProfile,
    updateProfile: handleUpdateProfile,
    toggleFavorite: handleToggleFavorite,
    isFavorite: checkIsFavorite,
    markAsRead: handleMarkAsRead,
    recordActiveDay: handleRecordActiveDay,
    recordPurchase: handleRecordPurchase,
    syncData: handleSyncData,
  };
};

export default useUserProfile;
