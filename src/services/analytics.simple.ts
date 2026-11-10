import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, getDeviceId } from '../lib/supabase';

export interface AnalyticsEvent {
  name: string;
  category?: string;
  label?: string;
  value?: number;
  params?: Record<string, any>;
  timestamp: number;
}

class AnalyticsService {
  private events: AnalyticsEvent[] = [];
  private isEnabled = true;
  private pendingRemoteQueue: any[] = [];
  private flushTimer: any = null;

  constructor() {
    this.loadStoredEvents();
    this.startPeriodicFlush();
  }

  private async loadStoredEvents(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('analytics_events');
      if (stored) {
        this.events = JSON.parse(stored);
      }
    } catch (error) {
      console.warn('⚠️ Erreur chargement analytics local:', error);
    }
  }

  private async saveEvents(): Promise<void> {
    try {
      // Conserver les 200 derniers événements en local pour ne pas saturer le stockage
      if (this.events.length > 200) {
        this.events = this.events.slice(-200);
      }
      await AsyncStorage.setItem('analytics_events', JSON.stringify(this.events));
    } catch (error) {
      console.warn('⚠️ Erreur sauvegarde analytics local:', error);
    }
  }

  private startPeriodicFlush(): void {
    if (this.flushTimer) clearInterval(this.flushTimer);
    this.flushTimer = setInterval(() => {
      this.flushToSupabase();
    }, 30000); // Tenter d'envoyer vers Supabase toutes les 30 secondes
  }

  private async flushToSupabase(): Promise<void> {
    if (this.pendingRemoteQueue.length === 0) return;
    const batch = [...this.pendingRemoteQueue];
    this.pendingRemoteQueue = [];

    try {
      const { error } = await supabase.from('analytics_events').insert(batch);
      if (error) {
        // En cas d'erreur réseau / RLS, réinsérer au début de la queue sans bloquer
        this.pendingRemoteQueue.unshift(...batch.slice(-50));
      }
    } catch (err) {
      // Ignoré silencieusement pour ne jamais planter l'app
    }
  }

  /**
   * Enregistre un événement avec support pour les deux signatures (objet ou arguments positionnels)
   */
  async trackEvent(
    name: string,
    categoryOrParams?: string | Record<string, any>,
    label?: string,
    value?: number,
    extraMetadata?: Record<string, any>
  ): Promise<void> {
    if (!this.isEnabled) return;

    let category: string | undefined;
    let params: Record<string, any> = {};

    if (typeof categoryOrParams === 'object' && categoryOrParams !== null) {
      params = categoryOrParams;
    } else if (typeof categoryOrParams === 'string') {
      category = categoryOrParams;
      params = { label, value, ...extraMetadata };
    }

    const event: AnalyticsEvent = {
      name,
      category,
      label,
      value,
      params,
      timestamp: Date.now(),
    };

    this.events.push(event);
    await this.saveEvents();

    // Enqueue pour Supabase
    try {
      getDeviceId().then((deviceId) => {
        this.pendingRemoteQueue.push({
          event_name: name,
          event_category: category || 'general',
          event_label: label,
          event_value: value,
          user_id: deviceId,
          timestamp: new Date().toISOString(),
          metadata: params,
        });
      }).catch(() => {});
    } catch {
      // Ignorer
    }

    if (__DEV__) {
      console.log(`📊 Analytics Event: ${name}`, params);
    }
  }

  async trackScreenView(screenName: string): Promise<void> {
    await this.trackEvent('screen_view', { screen_name: screenName });
  }

  async trackArticleView(articleId: string | number, articleTitle: string): Promise<void> {
    await this.trackEvent('article_view', {
      article_id: String(articleId),
      article_title: articleTitle,
    });
  }

  async trackArticleViewed(articleTitle: string, categoryName?: string, articleId?: string | number): Promise<void> {
    await this.trackEvent('article_viewed', {
      article_title: articleTitle,
      category_name: categoryName || 'Non catégorisé',
      article_id: articleId ? String(articleId) : undefined,
    });
  }

  async trackCategoryView(categoryId: string | number, categoryName: string): Promise<void> {
    await this.trackEvent('category_view', {
      category_id: String(categoryId),
      category_name: categoryName,
    });
  }

  async trackTagView(tagId: string | number, tagName: string): Promise<void> {
    await this.trackEvent('tag_view', {
      tag_id: String(tagId),
      tag_name: tagName,
    });
  }

  async trackSearch(query: string, resultsCount: number): Promise<void> {
    await this.trackEvent('search', {
      query,
      results_count: resultsCount,
    });
  }

  async trackShare(contentType: string, contentId: string | number): Promise<void> {
    await this.trackEvent('share', {
      content_type: contentType,
      content_id: String(contentId),
    });
  }

  async trackFavorite(articleId: string | number, articleTitle: string): Promise<void> {
    await this.trackEvent('favorite', {
      article_id: String(articleId),
      article_title: articleTitle,
    });
  }

  async trackPurchase(itemId: string, itemName: string, price: number, currency: string = 'CDF'): Promise<void> {
    await this.trackEvent('purchase', {
      item_id: itemId,
      item_name: itemName,
      price,
      currency,
    });
  }

  async trackAuth(action: 'login_success' | 'login_failed' | 'logout' | 'signup', username?: string): Promise<void> {
    await this.trackEvent(`auth_${action}`, {
      action,
      username,
    });
  }

  async trackError(errorType: string, errorMessage: string, context?: string): Promise<void> {
    await this.trackEvent('error_occurred', {
      error_type: errorType,
      error_message: errorMessage,
      context,
    });
  }

  async trackDownload(status: 'started' | 'completed' | 'failed', fileType: 'pdf' | 'image', fileName?: string): Promise<void> {
    await this.trackEvent('download', {
      status,
      file_type: fileType,
      file_name: fileName,
    });
  }

  async enable(): Promise<void> {
    this.isEnabled = true;
    await AsyncStorage.setItem('analytics_enabled', 'true');
  }

  async disable(): Promise<void> {
    this.isEnabled = false;
    await AsyncStorage.setItem('analytics_enabled', 'false');
  }

  async getEvents(): Promise<AnalyticsEvent[]> {
    return [...this.events];
  }

  async clearEvents(): Promise<void> {
    this.events = [];
    this.pendingRemoteQueue = [];
    await this.saveEvents();
  }

  async getStats(): Promise<{ totalEvents: number; screenViews: number; articleViews: number }> {
    const totalEvents = this.events.length;
    const screenViews = this.events.filter((e) => e.name === 'screen_view').length;
    const articleViews = this.events.filter((e) => e.name === 'article_view' || e.name === 'article_viewed').length;

    return {
      totalEvents,
      screenViews,
      articleViews,
    };
  }
}

export const analyticsService = new AnalyticsService();
export default analyticsService;
