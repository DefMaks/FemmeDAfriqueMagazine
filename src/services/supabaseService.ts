import Constants from 'expo-constants';
import { supabase, getDeviceId } from '../lib/supabase';
import { Post } from '../models/Post';

export interface SavedArticle {
  id: string;
  user_id: string;
  article_id: string;
  article_data: Post;
  media: string;
  saved_at: string;
  created_at: string;
}

let savedIdsCache: Set<string> | null = null;
let savedIdsCacheUserId: string | null = null;
let savedIdsCacheTime = 0;
let savedIdsFetchPromise: Promise<Set<string>> | null = null;
const SAVED_CACHE_TTL = 60 * 1000; // 60 secondes

async function resolveCurrentUserId(): Promise<string> {
  try {
    const { data } = await supabase.auth.getSession();
    if (data?.session?.user?.id) {
      return data.session.user.id;
    }
  } catch {
    // Fallback sur deviceId
  }
  return await getDeviceId();
}

async function ensureSavedIdsSet(forceRefresh = false): Promise<Set<string>> {
  const userId = await resolveCurrentUserId();
  const now = Date.now();

  if (
    !forceRefresh &&
    savedIdsCache &&
    savedIdsCacheUserId === userId &&
    now - savedIdsCacheTime < SAVED_CACHE_TTL
  ) {
    return savedIdsCache;
  }

  if (savedIdsFetchPromise && !forceRefresh) {
    return savedIdsFetchPromise;
  }

  savedIdsFetchPromise = (async () => {
    try {
      const { data, error } = await supabase
        .from('saved_articles')
        .select('article_id')
        .eq('user_id', userId);

      if (error) throw error;
      const set = new Set<string>((data || []).map((row: any) => String(row.article_id)));
      savedIdsCache = set;
      savedIdsCacheUserId = userId;
      savedIdsCacheTime = Date.now();
      return set;
    } catch {
      return savedIdsCache || new Set<string>();
    } finally {
      savedIdsFetchPromise = null;
    }
  })();

  return savedIdsFetchPromise;
}

export const savedArticlesService = {
  invalidateCache() {
    savedIdsCache = null;
    savedIdsCacheTime = 0;
  },

  async getSavedArticles(): Promise<SavedArticle[]> {
    try {
      const userId = await resolveCurrentUserId();
      const { data, error } = await supabase
        .from('saved_articles')
        .select('*')
        .eq('user_id', userId)
        .order('saved_at', { ascending: false });

      if (error) throw error;
      const list = data || [];
      savedIdsCache = new Set<string>(list.map((item: any) => String(item.article_id)));
      savedIdsCacheUserId = userId;
      savedIdsCacheTime = Date.now();
      return list;
    } catch (error) {
      console.error('Error fetching saved articles:', error);
      return [];
    }
  },

  async saveArticle(article: Post): Promise<boolean> {
    try {
      const userId = await resolveCurrentUserId();
      const articleIdStr = article.id.toString();
      const media =
        Constants.expoConfig?.extra?.EXPO_PUBLIC_MEDIA ||
        Constants.expoConfig?.extra?.media ||
        'FDA';

      const { error } = await supabase
        .from('saved_articles')
        .insert({
          user_id: userId,
          article_id: articleIdStr,
          article_data: article,
          media: media,
        });

      if (error && error.code !== '23505') {
        throw error;
      }

      if (savedIdsCache) {
        savedIdsCache.add(articleIdStr);
      }
      return true;
    } catch (error) {
      console.error('Error saving article:', error);
      return false;
    }
  },

  async unsaveArticle(articleId: string): Promise<boolean> {
    try {
      const userId = await resolveCurrentUserId();
      const { error } = await supabase
        .from('saved_articles')
        .delete()
        .eq('user_id', userId)
        .eq('article_id', articleId);

      if (error) throw error;
      if (savedIdsCache) {
        savedIdsCache.delete(String(articleId));
      }
      return true;
    } catch (error) {
      console.error('Error unsaving article:', error);
      return false;
    }
  },

  async isArticleSaved(articleId: string): Promise<boolean> {
    try {
      const set = await ensureSavedIdsSet();
      return set.has(String(articleId));
    } catch {
      return false;
    }
  },
};

export interface UserPreferences {
  theme?: 'light' | 'dark';
  notifications_enabled?: boolean;
  selected_categories?: string[];
  [key: string]: any;
}

export const userPreferencesService = {
  async getPreferences(): Promise<UserPreferences> {
    try {
      const userId = await resolveCurrentUserId();
      const { data, error } = await supabase
        .from('user_preferences')
        .select('preferences')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      return data?.preferences || {};
    } catch (error) {
      console.error('Error fetching preferences:', error);
      return {};
    }
  },

  async updatePreferences(preferences: UserPreferences): Promise<boolean> {
    try {
      const userId = await resolveCurrentUserId();
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: userId,
          preferences,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating preferences:', error);
      return false;
    }
  },
};

export interface PopularPost {
  post_id: string;
  total_views: number;
  views_last_7_days: number;
  views_last_30_days: number;
  popularity_score: number;
}

export const postViewsService = {
  async trackView(postId: string): Promise<boolean> {
    try {
      const userId = await resolveCurrentUserId();
      const { error } = await supabase
        .from('post_views')
        .insert({
          post_id: postId,
          user_id: userId,
        });

      if (error) throw error;

      await supabase.rpc('update_post_popularity', { p_post_id: postId });

      return true;
    } catch (error) {
      console.error('Error tracking view:', error);
      return false;
    }
  },

  async getPopularPosts(limit: number = 10): Promise<PopularPost[]> {
    try {
      const { data, error } = await supabase
        .from('post_popularity')
        .select('*')
        .order('popularity_score', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching popular posts:', error);
      return [];
    }
  },

  async getPostViews(postId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('post_popularity')
        .select('total_views')
        .eq('post_id', postId)
        .maybeSingle();

      if (error) throw error;
      return data?.total_views || 0;
    } catch (error) {
      console.error('Error getting post views:', error);
      return 0;
    }
  },
};
