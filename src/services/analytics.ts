/**
 * Analytics Service
 * 
 * Service centralisé pour tracker les événements et les vues d'articles
 * Compatible avec Google Analytics (Expo) et Supabase pour le stockage local
 */

import { supabase, getDeviceId } from '../lib/supabase';
import { simpleAnalyticsService } from './expoAnalytics';

export interface AnalyticsEvent {
  event_name: string;
  event_category?: string;
  event_label?: string;
  event_value?: number;
  user_id?: string;
  timestamp?: string;
  metadata?: Record<string, any>;
}

export interface ArticleView {
  article_id: string;
  article_title: string;
  user_id: string;
  view_duration?: number;
  source?: string; // 'home', 'search', 'category', etc.
  timestamp?: string;
}

class AnalyticsService {
  private isEnabled: boolean = true;
  private sessionId: string;

  constructor() {
    this.sessionId = this.generateSessionId();
  }

  /**
   * Génère un ID de session unique
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Active ou désactive le tracking analytics
   */
  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }

  /**
   * Track un événement générique
   */
  async trackEvent(event: AnalyticsEvent): Promise<boolean> {
    if (!this.isEnabled) return false;

    try {
      const userId = await getDeviceId();
      const eventData = {
        ...event,
        user_id: userId,
        session_id: this.sessionId,
        timestamp: event.timestamp || new Date().toISOString(),
      };

      // Log en développement
      if (__DEV__) {
        console.log('📊 Analytics Event:', eventData);
      }

      // Envoyer à Simple Analytics
      await simpleAnalyticsService.trackEvent(event.event_name, {
        event_category: event.event_category,
        event_label: event.event_label,
        event_value: event.event_value,
        ...event.metadata,
      });

      // Envoyer à Supabase pour stockage (silencieux en cas d'erreur)
      // Utiliser un timeout court pour ne pas bloquer l'app
      const analyticsTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Analytics timeout')), 5000)
      );

      try {
        await Promise.race([
          supabase.from('analytics_events').insert(eventData),
          analyticsTimeout
        ]);
      } catch {
        // Ignorer silencieusement toutes les erreurs analytics
      }

      return true;
    } catch (error) {
      // Erreur silencieuse - analytics ne doit jamais crasher l'app
      return false;
    }
  }

  /**
   * Track une vue d'article
   */
  async trackArticleView(articleId: string, articleTitle: string, source?: string): Promise<boolean> {
    try {
      const userId = await getDeviceId();
      
      const viewData: ArticleView = {
        article_id: articleId,
        article_title: articleTitle,
        user_id: userId,
        source: source || 'unknown',
        timestamp: new Date().toISOString(),
      };

      // Log en développement
      if (__DEV__) {
        console.log('👁️ Article View:', viewData);
      }

      // Envoyer à Simple Analytics
      await simpleAnalyticsService.trackArticleView(articleId, articleTitle, source);

      // Enregistrer la vue dans Supabase (silencieux en cas d'erreur)
      // Utiliser un timeout court pour ne pas bloquer l'app
      const viewTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('View tracking timeout')), 5000)
      );

      try {
        await Promise.race([
          supabase.from('article_views').insert({
            article_id: viewData.article_id,
            article_title: viewData.article_title,
            user_id: viewData.user_id,
            source: viewData.source,
            viewed_at: viewData.timestamp,
          }),
          viewTimeout
        ]);
      } catch {
        // Ignorer silencieusement toutes les erreurs
      }

      // Track également comme événement générique
      await this.trackEvent({
        event_name: 'article_view',
        event_category: 'engagement',
        event_label: articleTitle,
        event_value: 1,
        metadata: {
          article_id: articleId,
          source,
        },
      });

      return true;
    } catch (error) {
      // Erreur silencieuse
      return false;
    }
  }

  /**
   * Track une ouverture de screen
   */
  async trackScreenView(screenName: string): Promise<boolean> {
    // Envoyer à Simple Analytics
    await simpleAnalyticsService.trackScreenView(screenName);

    return this.trackEvent({
      event_name: 'screen_view',
      event_category: 'navigation',
      event_label: screenName,
      event_value: 1,
    });
  }

  /**
   * Track un achat de magazine
   */
  async trackPurchase(magazineId: string, magazineTitle: string, amount: number, currency: string): Promise<boolean> {
    return this.trackEvent({
      event_name: 'purchase',
      event_category: 'ecommerce',
      event_label: magazineTitle,
      event_value: amount,
      metadata: {
        magazine_id: magazineId,
        currency,
      },
    });
  }

  /**
   * Track un partage d'article
   */
  async trackShare(articleId: string, articleTitle: string, method?: string): Promise<boolean> {
    return this.trackEvent({
      event_name: 'share',
      event_category: 'engagement',
      event_label: articleTitle,
      metadata: {
        article_id: articleId,
        method: method || 'unknown',
      },
    });
  }

  /**
   * Track une recherche
   */
  async trackSearch(query: string, resultsCount: number): Promise<boolean> {
    return this.trackEvent({
      event_name: 'search',
      event_category: 'engagement',
      event_label: query,
      event_value: resultsCount,
    });
  }

  /**
   * Événement personnalisé pour la consultation d'article (spécifique GA4)
   * @param articleTitle - Titre de l'article
   * @param category - Catégorie de l'article (optionnel)
   * @param articleId - ID de l'article (optionnel)
   */
  async trackArticleViewed(
    articleTitle: string, 
    category?: string, 
    articleId?: number
  ): Promise<void> {
    // Envoyer à Simple Analytics
    await simpleAnalyticsService.trackArticleViewed(articleTitle, category, articleId);

    // Aussi tracker comme événement générique pour Supabase
    await this.trackEvent({
      event_name: 'article_viewed',
      event_category: 'engagement',
      event_label: articleTitle,
      metadata: {
        article_title: articleTitle,
        article_category: category || 'non_catégorisé',
        article_id: articleId?.toString(),
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Active/désactive la collection de données analytiques Expo
   * @param enabled - Activer ou désactiver la collection
   */
  async setAnalyticsCollectionEnabled(enabled: boolean): Promise<void> {
    simpleAnalyticsService.setEnabled(enabled);
    console.log(`� Expo Analytics: Collection ${enabled ? 'activée' : 'désactivée'}`);
  }

  /**
   * Récupère les statistiques de vues pour un article
   */
  async getArticleViewStats(articleId: string): Promise<{
    total_views: number;
    unique_users: number;
    views_last_7_days: number;
    views_last_30_days: number;
  }> {
    try {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Total views
      const { count: totalViews } = await supabase
        .from('article_views')
        .select('*', { count: 'exact', head: true })
        .eq('article_id', articleId);

      // Unique users
      const { data: uniqueUsersData } = await supabase
        .from('article_views')
        .select('user_id')
        .eq('article_id', articleId);
      const uniqueUsers = new Set(uniqueUsersData?.map(v => v.user_id) || []).size;

      // Views last 7 days
      const { count: views7Days } = await supabase
        .from('article_views')
        .select('*', { count: 'exact', head: true })
        .eq('article_id', articleId)
        .gte('viewed_at', sevenDaysAgo.toISOString());

      // Views last 30 days
      const { count: views30Days } = await supabase
        .from('article_views')
        .select('*', { count: 'exact', head: true })
        .eq('article_id', articleId)
        .gte('viewed_at', thirtyDaysAgo.toISOString());

      return {
        total_views: totalViews || 0,
        unique_users: uniqueUsers,
        views_last_7_days: views7Days || 0,
        views_last_30_days: views30Days || 0,
      };
    } catch (error) {
      console.error('Error getting article view stats:', error);
      return {
        total_views: 0,
        unique_users: 0,
        views_last_7_days: 0,
        views_last_30_days: 0,
      };
    }
  }

  /**
   * Récupère les articles les plus vus
   */
  async getTopArticles(limit: number = 10, days?: number): Promise<Array<{
    article_id: string;
    article_title: string;
    view_count: number;
  }>> {
    try {
      let query = supabase
        .from('article_views')
        .select('article_id, article_title');

      if (days) {
        const dateThreshold = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        query = query.gte('viewed_at', dateThreshold.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;

      // Compter les vues par article
      const viewCounts = (data || []).reduce((acc: any, view: any) => {
        const key = view.article_id;
        if (!acc[key]) {
          acc[key] = {
            article_id: view.article_id,
            article_title: view.article_title,
            view_count: 0,
          };
        }
        acc[key].view_count++;
        return acc;
      }, {});

      // Trier par nombre de vues et limiter
      const results = Object.values(viewCounts) as { article_id: string; article_title: string; view_count: number; }[];
      return results
        .sort((a, b) => b.view_count - a.view_count)
        .slice(0, limit);
    } catch (error) {
      console.error('Error getting top articles:', error);
      return [];
    }
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService();
