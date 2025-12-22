// src/services/supabaseService.ts
// Service pour les articles sauvegardés (favoris) - utilise WordPress API
// Supabase est utilisé uniquement pour les transactions d'achat de magazines

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Post } from '../models/Post';
import { 
  toggleFavorite, 
  getFavorites, 
  isFavorite,
  ArticleInteraction 
} from './userProfileAPI';

// Storage keys pour le cache local
const STORAGE_KEYS = {
  SAVED_ARTICLES_CACHE: '@fda_saved_articles_cache',
};

export interface SavedArticle {
  id: string;
  user_id: string;
  article_id: string;
  article_data: Post;
  saved_at: string;
  created_at: string;
}

/**
 * Service pour gérer les articles sauvegardés (favoris)
 * Utilise l'API WordPress pour la persistance
 * Avec cache local pour les performances
 */
export const savedArticlesService = {
  /**
   * Récupère tous les articles sauvegardés (favoris)
   */
  async getSavedArticles(): Promise<SavedArticle[]> {
    try {
      // Récupérer les favoris depuis WordPress/local
      const favorites = await getFavorites();
      
      // Transformer en format SavedArticle pour compatibilité
      const savedArticles: SavedArticle[] = favorites.map((fav: ArticleInteraction | number, index: number) => {
        const postId = typeof fav === 'number' ? fav : fav.post_id;
        const date = typeof fav === 'number' ? new Date().toISOString() : fav.date;
        
        return {
          id: `fav_${postId}_${index}`,
          user_id: 'current_user',
          article_id: postId.toString(),
          article_data: {} as Post, // Les données complètes seront chargées séparément
          saved_at: date,
          created_at: date,
        };
      });

      return savedArticles;
    } catch (error) {
      console.error('Error fetching saved articles:', error);
      return [];
    }
  },

  /**
   * Sauvegarde un article (ajoute aux favoris)
   */
  async saveArticle(article: Post): Promise<boolean> {
    try {
      const result = await toggleFavorite(
        article.id, 
        article.title?.rendered || `Article #${article.id}`,
        article.link
      );
      
      // Si c'est maintenant un favori, c'est un succès
      if (result.success && result.isFavorite) {
        // Mettre en cache les données de l'article pour un accès hors ligne
        await this.cacheArticleData(article);
        return true;
      }
      
      // Si toggleFavorite a retiré le favori, re-toggle pour l'ajouter
      if (result.success && !result.isFavorite) {
        const retoggle = await toggleFavorite(
          article.id, 
          article.title?.rendered || `Article #${article.id}`,
          article.link
        );
        if (retoggle.success && retoggle.isFavorite) {
          await this.cacheArticleData(article);
          return true;
        }
      }
      
      return result.success;
    } catch (error) {
      console.error('Error saving article:', error);
      return false;
    }
  },

  /**
   * Retire un article des favoris
   */
  async unsaveArticle(articleId: string): Promise<boolean> {
    try {
      const isSaved = await this.isArticleSaved(articleId);
      
      if (isSaved) {
        const result = await toggleFavorite(parseInt(articleId));
        return result.success && !result.isFavorite;
      }
      
      return true; // Déjà non sauvegardé
    } catch (error) {
      console.error('Error unsaving article:', error);
      return false;
    }
  },

  /**
   * Vérifie si un article est sauvegardé (en favori)
   */
  async isArticleSaved(articleId: string): Promise<boolean> {
    try {
      return await isFavorite(parseInt(articleId));
    } catch (error) {
      console.error('Error checking if article is saved:', error);
      return false;
    }
  },

  /**
   * Cache les données d'un article localement
   */
  async cacheArticleData(article: Post): Promise<void> {
    try {
      const cacheKey = `${STORAGE_KEYS.SAVED_ARTICLES_CACHE}_${article.id}`;
      await AsyncStorage.setItem(cacheKey, JSON.stringify(article));
    } catch (error) {
      console.error('Error caching article data:', error);
    }
  },

  /**
   * Récupère les données d'un article depuis le cache
   */
  async getCachedArticleData(articleId: string): Promise<Post | null> {
    try {
      const cacheKey = `${STORAGE_KEYS.SAVED_ARTICLES_CACHE}_${articleId}`;
      const cached = await AsyncStorage.getItem(cacheKey);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Error getting cached article data:', error);
      return null;
    }
  },
};

/**
 * Service pour les préférences utilisateur
 * Stockage local uniquement
 */
export interface UserPreferences {
  theme?: 'light' | 'dark';
  notifications_enabled?: boolean;
  selected_categories?: string[];
  [key: string]: any;
}

const PREFERENCES_KEY = '@fda_user_preferences';

export const userPreferencesService = {
  async getPreferences(): Promise<UserPreferences> {
    try {
      const data = await AsyncStorage.getItem(PREFERENCES_KEY);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('Error fetching preferences:', error);
      return {};
    }
  },

  async updatePreferences(preferences: UserPreferences): Promise<boolean> {
    try {
      const current = await this.getPreferences();
      const updated = { ...current, ...preferences };
      await AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(updated));
      return true;
    } catch (error) {
      console.error('Error updating preferences:', error);
      return false;
    }
  },
};

/**
 * Service pour le suivi des vues d'articles
 * Utilise WordPress API via markArticleAsRead
 */
import { markArticleAsRead } from './userProfileAPI';

export interface PopularPost {
  post_id: string;
  total_views: number;
  views_last_7_days: number;
  views_last_30_days: number;
  popularity_score: number;
}

export const postViewsService = {
  async trackView(postId: string, title?: string, url?: string): Promise<boolean> {
    try {
      const result = await markArticleAsRead(parseInt(postId), title, url);
      return result.success;
    } catch (error) {
      console.error('Error tracking view:', error);
      return false;
    }
  },

  // Note: Les posts populaires ne sont plus disponibles via Supabase
  // Cette fonctionnalité devra être implémentée côté WordPress si nécessaire
  async getPopularPosts(limit: number = 10): Promise<PopularPost[]> {
    console.log('getPopularPosts: Feature not available - requires WordPress implementation');
    return [];
  },

  async getPostViews(postId: string): Promise<number> {
    console.log('getPostViews: Feature not available - requires WordPress implementation');
    return 0;
  },
};
