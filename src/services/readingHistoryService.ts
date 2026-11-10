// src/services/readingHistoryService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, getDeviceId } from '../lib/supabase';
import { Post } from '../models/Post';

export interface ReadArticleItem {
  id: string;
  user_id: string;
  post_id: number;
  post_slug: string;
  post_title: string;
  post_image: string | null;
  category_name: string | null;
  category_slug: string | null;
  read_at: string;
}

const LOCAL_READ_KEY = 'fam_mobile_reading_history_v1';
const MAX_LOCAL_ITEMS = 60;

export const readingHistoryService = {
  /**
   * Extraire l'URL de l'image d'un Post
   */
  extractImageUrl(post: Post): string | null {
    if (post.dmks_featured_image?.sizes?.large?.url) {
      return post.dmks_featured_image.sizes.large.url;
    }
    if (post.dmks_featured_image?.sizes?.medium_large?.url) {
      return post.dmks_featured_image.sizes.medium_large.url;
    }
    if (post.dmks_featured_image?.src) {
      return post.dmks_featured_image.src;
    }
    if (post._embedded?.['wp:featuredmedia']?.[0]?.source_url) {
      return post._embedded['wp:featuredmedia'][0].source_url;
    }
    return null;
  },

  /**
   * Enregistrer une lecture d'article (Local + Supabase)
   */
  async recordReading(post: Post): Promise<void> {
    if (!post || !post.id) return;

    const title = post.title?.rendered || (typeof post.title === 'string' ? post.title : 'Article');
    const slug = (post as any).slug || `post-${post.id}`;
    const image = this.extractImageUrl(post);
    const wpTerm = (post._embedded as any)?.['wp:term'];
    const categoryName = Array.isArray(wpTerm) && Array.isArray(wpTerm[0]) ? wpTerm[0][0]?.name : (wpTerm?.[0]?.name || null);
    const categorySlug = Array.isArray(wpTerm) && Array.isArray(wpTerm[0]) ? wpTerm[0][0]?.slug : (wpTerm?.[0]?.slug || null);
    const nowIso = new Date().toISOString();

    // 1. Sauvegarde locale immédiate
    try {
      const stored = await AsyncStorage.getItem(LOCAL_READ_KEY);
      const list: ReadArticleItem[] = stored ? JSON.parse(stored) : [];
      const filtered = list.filter(item => item.post_id !== post.id && item.post_slug !== slug);
      const updated: ReadArticleItem[] = [
        {
          id: `local_${post.id}_${Date.now()}`,
          user_id: 'local',
          post_id: post.id,
          post_slug: slug,
          post_title: title,
          post_image: image,
          category_name: categoryName,
          category_slug: categorySlug,
          read_at: nowIso,
        },
        ...filtered,
      ].slice(0, MAX_LOCAL_ITEMS);

      await AsyncStorage.setItem(LOCAL_READ_KEY, JSON.stringify(updated));
    } catch (localErr) {
      console.warn('⚠️ Erreur enregistrement local lecture:', localErr);
    }

    // 2. Synchronisation Supabase en arrière-plan
    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id || (await getDeviceId());

      await supabase.from('reading_history').upsert(
        {
          user_id: userId,
          post_id: post.id,
          post_slug: slug,
          post_title: title,
          post_image: image,
          category_name: categoryName,
          category_slug: categorySlug,
          read_at: nowIso,
        },
        { onConflict: 'user_id,post_slug' }
      );
    } catch (cloudErr) {
      console.warn('⚠️ Erreur synchronisation cloud lecture:', cloudErr);
    }
  },

  /**
   * Récupérer l'historique complet des lectures
   */
  async getReadingHistory(): Promise<ReadArticleItem[]> {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id || (await getDeviceId());

      const { data, error } = await supabase
        .from('reading_history')
        .select('*')
        .eq('user_id', userId)
        .order('read_at', { ascending: false })
        .limit(50);

      if (!error && data && data.length > 0) {
        return data as ReadArticleItem[];
      }
    } catch (e) {
      console.warn('⚠️ Fallback vers historique local:', e);
    }

    // Fallback local
    try {
      const stored = await AsyncStorage.getItem(LOCAL_READ_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  },

  /**
   * Obtenir le nombre d'articles lus
   */
  async getArticlesReadCount(): Promise<number> {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id || (await getDeviceId());

      const { count, error } = await supabase
        .from('reading_history')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (!error && typeof count === 'number') {
        return count;
      }
    } catch (e) {
      // Ignorer
    }

    try {
      const stored = await AsyncStorage.getItem(LOCAL_READ_KEY);
      if (stored) {
        const list = JSON.parse(stored);
        return Array.isArray(list) ? list.length : 0;
      }
    } catch (e) {}

    return 0;
  },

  /**
   * Effacer l'historique de lecture
   */
  async clearHistory(): Promise<boolean> {
    try {
      await AsyncStorage.removeItem(LOCAL_READ_KEY);
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id || (await getDeviceId());

      await supabase.from('reading_history').delete().eq('user_id', userId);
      return true;
    } catch (e) {
      console.warn('⚠️ Erreur effacement historique:', e);
      return false;
    }
  },

  /**
   * Migrer l'historique du device vers l'utilisateur lors de la connexion
   */
  async migrateDeviceHistoryToUser(authenticatedUserId: string): Promise<void> {
    try {
      const deviceId = await getDeviceId();
      if (!deviceId || deviceId === authenticatedUserId) return;

      console.log('🔄 Migration historique lecture device vers compte utilisateur:', deviceId, '->', authenticatedUserId);
      await supabase
        .from('reading_history')
        .update({ user_id: authenticatedUserId })
        .eq('user_id', deviceId);
    } catch (e) {
      console.warn('⚠️ Erreur migration historique lecture:', e);
    }
  },
};
