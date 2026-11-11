// src/services/readingHistoryService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, getDeviceId } from '../lib/supabase';
import { Post } from '../models/Post';
import { decodeHtmlEntities } from '../utils/textUtils';

const LOCAL_READ_KEY = '@fam_reading_history';
const MAX_LOCAL_HISTORY = 100;

export interface ReadArticleItem {
  id?: string;
  user_id: string;
  post_id: number;
  post_slug: string;
  post_title: string;
  post_image: string | null;
  category_name: string | null;
  category_slug: string | null;
  read_at: string;
}

export const readingHistoryService = {
  /**
   * Extraire l'image principale d'un Post WordPress
   */
  extractImageUrl(post: Post): string | null {
    if (post.dmks_featured_image?.sizes?.medium_large?.url) {
      return post.dmks_featured_image.sizes.medium_large.url;
    }
    if (post.dmks_featured_image?.sizes?.medium?.url) {
      return post.dmks_featured_image.sizes.medium.url;
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

    const rawTitle = post.title?.rendered || (typeof post.title === 'string' ? post.title : 'Article');
    const title = decodeHtmlEntities(rawTitle);
    const slug = (post as any).slug || `post-${post.id}`;
    const image = this.extractImageUrl(post);
    const wpTerm = (post._embedded as any)?.['wp:term'];
    const rawCatName = Array.isArray(wpTerm) && Array.isArray(wpTerm[0]) ? wpTerm[0][0]?.name : (wpTerm?.[0]?.name || null);
    const categoryName = rawCatName ? decodeHtmlEntities(rawCatName) : null;
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
      ].slice(0, MAX_LOCAL_HISTORY);

      await AsyncStorage.setItem(LOCAL_READ_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Erreur sauvegarde locale lecture:', e);
    }

    // 2. Synchronisation Supabase
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id || (await getDeviceId());

      const { error } = await supabase
        .from('reading_history')
        .upsert(
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

      if (error) {
        console.warn('Erreur synchro Supabase reading_history:', error.message);
      }
    } catch (e) {
      console.warn('Exception synchro Supabase reading_history:', e);
    }
  },

  /**
   * Récupérer l'historique complet des lectures (Fusion Supabase + Local dédoublonnée)
   */
  async getReadingHistory(): Promise<ReadArticleItem[]> {
    let remoteItems: ReadArticleItem[] = [];
    let localItems: ReadArticleItem[] = [];

    try {
      const stored = await AsyncStorage.getItem(LOCAL_READ_KEY);
      if (stored) {
        localItems = JSON.parse(stored) || [];
      }
    } catch {
      localItems = [];
    }

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id || (await getDeviceId());

      const { data, error } = await supabase
        .from('reading_history')
        .select('*')
        .eq('user_id', userId)
        .order('read_at', { ascending: false })
        .limit(MAX_LOCAL_HISTORY);

      if (!error && data) {
        remoteItems = data as ReadArticleItem[];
      }
    } catch (e) {
      console.warn('Fallback vers historique local:', e);
    }

    // Fusionner et dédoublonner par post_id / post_slug tout en nettoyant les entités HTML
    const mergedMap = new Map<string, ReadArticleItem>();

    for (const item of [...remoteItems, ...localItems]) {
      if (!item) continue;
      const key = item.post_id ? String(item.post_id) : item.post_slug;
      if (!key) continue;

      const cleaned: ReadArticleItem = {
        ...item,
        post_title: decodeHtmlEntities(item.post_title || 'Article'),
        category_name: item.category_name ? decodeHtmlEntities(item.category_name) : null,
      };

      const existing = mergedMap.get(key);
      if (!existing || new Date(cleaned.read_at).getTime() > new Date(existing.read_at).getTime()) {
        mergedMap.set(key, cleaned);
      }
    }

    return Array.from(mergedMap.values()).sort(
      (a, b) => new Date(b.read_at).getTime() - new Date(a.read_at).getTime()
    );
  },

  /**
   * Obtenir le nombre exact d'articles lus (100% cohérent avec getReadingHistory)
   */
  async getArticlesReadCount(): Promise<number> {
    const history = await this.getReadingHistory();
    return history.length;
  },

  /**
   * Obtenir le nombre de jours distincts d'activité de lecture
   */
  async getActiveDaysCount(): Promise<number> {
    const history = await this.getReadingHistory();
    if (history.length === 0) return 1;

    const distinctDays = new Set<string>();
    for (const item of history) {
      if (item.read_at) {
        distinctDays.add(item.read_at.slice(0, 10));
      }
    }
    return Math.max(1, distinctDays.size);
  },

  /**
   * Effacer l'historique de lecture
   */
  async clearHistory(): Promise<boolean> {
    try {
      await AsyncStorage.removeItem(LOCAL_READ_KEY);
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id || (await getDeviceId());

      await supabase.from('reading_history').delete().eq('user_id', userId);
      return true;
    } catch (e) {
      console.warn('Erreur effacement historique:', e);
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

      await supabase
        .from('reading_history')
        .update({ user_id: authenticatedUserId })
        .eq('user_id', deviceId);
    } catch (e) {
      console.warn('Erreur migration historique lecture:', e);
    }
  },
};
