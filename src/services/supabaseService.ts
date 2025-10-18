import { supabase, getDeviceId } from '../lib/supabase';
import { Post } from '../models/Post';

export interface SavedArticle {
  id: string;
  user_id: string;
  article_id: string;
  article_data: Post;
  saved_at: string;
  created_at: string;
}

export const savedArticlesService = {
  async getSavedArticles(): Promise<SavedArticle[]> {
    try {
      const userId = await getDeviceId();
      const { data, error } = await supabase
        .from('saved_articles')
        .select('*')
        .eq('user_id', userId)
        .order('saved_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching saved articles:', error);
      return [];
    }
  },

  async saveArticle(article: Post): Promise<boolean> {
    try {
      const userId = await getDeviceId();
      const { error } = await supabase
        .from('saved_articles')
        .insert({
          user_id: userId,
          article_id: article.id.toString(),
          article_data: article,
        });

      if (error) {
        if (error.code === '23505') {
          console.log('Article already saved');
          return true;
        }
        throw error;
      }
      return true;
    } catch (error) {
      console.error('Error saving article:', error);
      return false;
    }
  },

  async unsaveArticle(articleId: string): Promise<boolean> {
    try {
      const userId = await getDeviceId();
      const { error } = await supabase
        .from('saved_articles')
        .delete()
        .eq('user_id', userId)
        .eq('article_id', articleId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error unsaving article:', error);
      return false;
    }
  },

  async isArticleSaved(articleId: string): Promise<boolean> {
    try {
      const userId = await getDeviceId();
      const { data, error } = await supabase
        .from('saved_articles')
        .select('id')
        .eq('user_id', userId)
        .eq('article_id', articleId)
        .maybeSingle();

      if (error) throw error;
      return !!data;
    } catch (error) {
      console.error('Error checking if article is saved:', error);
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
      const userId = await getDeviceId();
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
      const userId = await getDeviceId();
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
