import AsyncStorage from '@react-native-async-storage/async-storage';

interface AnalyticsEvent {
  name: string;
  params?: { [key: string]: any };
  timestamp: number;
}

class AnalyticsService {
  private events: AnalyticsEvent[] = [];
  private isEnabled = true;

  constructor() {
    this.loadStoredEvents();
  }

  private async loadStoredEvents(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('analytics_events');
      if (stored) {
        this.events = JSON.parse(stored);
      }
    } catch (error) {
      console.error('❌ Erreur chargement analytics:', error);
    }
  }

  private async saveEvents(): Promise<void> {
    try {
      await AsyncStorage.setItem('analytics_events', JSON.stringify(this.events));
    } catch (error) {
      console.error('❌ Erreur sauvegarde analytics:', error);
    }
  }

  async trackEvent(name: string, params?: { [key: string]: any }): Promise<void> {
    if (!this.isEnabled) return;

    const event: AnalyticsEvent = {
      name,
      params,
      timestamp: Date.now(),
    };

    this.events.push(event);
    await this.saveEvents();

    console.log(`📊 Analytics Event: ${name}`, params);
  }

  async trackScreenView(screenName: string): Promise<void> {
    await this.trackEvent('screen_view', { screen_name: screenName });
  }

  async trackArticleView(articleId: string, articleTitle: string): Promise<void> {
    await this.trackEvent('article_view', {
      article_id: articleId,
      article_title: articleTitle,
    });
  }

  async trackCategoryView(categoryId: string, categoryName: string): Promise<void> {
    await this.trackEvent('category_view', {
      category_id: categoryId,
      category_name: categoryName,
    });
  }

  async trackTagView(tagId: string, tagName: string): Promise<void> {
    await this.trackEvent('tag_view', {
      tag_id: tagId,
      tag_name: tagName,
    });
  }

  async trackSearch(query: string, resultsCount: number): Promise<void> {
    await this.trackEvent('search', {
      query,
      results_count: resultsCount,
    });
  }

  async trackShare(contentType: string, contentId: string): Promise<void> {
    await this.trackEvent('share', {
      content_type: contentType,
      content_id: contentId,
    });
  }

  async trackFavorite(articleId: string, articleTitle: string): Promise<void> {
    await this.trackEvent('favorite', {
      article_id: articleId,
      article_title: articleTitle,
    });
  }

  async trackPurchase(itemId: string, itemName: string, price: number): Promise<void> {
    await this.trackEvent('purchase', {
      item_id: itemId,
      item_name: itemName,
      price,
      currency: 'XOF',
    });
  }

  async setUserProperties(properties: { [key: string]: any }): Promise<void> {
    try {
      await AsyncStorage.setItem('analytics_user_properties', JSON.stringify(properties));
      console.log('👤 Analytics User Properties:', properties);
    } catch (error) {
      console.error('❌ Erreur setUserProperties analytics:', error);
    }
  }

  async getUserProperties(): Promise<{ [key: string]: any }> {
    try {
      const stored = await AsyncStorage.getItem('analytics_user_properties');
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('❌ Erreur getUserProperties analytics:', error);
      return {};
    }
  }

  async enable(): Promise<void> {
    this.isEnabled = true;
    await AsyncStorage.setItem('analytics_enabled', 'true');
    console.log('✅ Analytics activé');
  }

  async disable(): Promise<void> {
    this.isEnabled = false;
    await AsyncStorage.setItem('analytics_enabled', 'false');
    console.log('❌ Analytics désactivé');
  }

  async getAnalyticsEnabled(): Promise<boolean> {
    try {
      const stored = await AsyncStorage.getItem('analytics_enabled');
      return stored !== 'false';
    } catch (error) {
      return this.isEnabled;
    }
  }

  async getEvents(): Promise<AnalyticsEvent[]> {
    return [...this.events];
  }

  async clearEvents(): Promise<void> {
    this.events = [];
    await this.saveEvents();
    console.log('🗑️ Analytics events cleared');
  }

  async getStats(): Promise<{ totalEvents: number; screenViews: number; articleViews: number }> {
    const totalEvents = this.events.length;
    const screenViews = this.events.filter(e => e.name === 'screen_view').length;
    const articleViews = this.events.filter(e => e.name === 'article_view').length;

    return {
      totalEvents,
      screenViews,
      articleViews,
    };
  }
}

// Export singleton
export const analyticsService = new AnalyticsService();
