/**
 * Simple Analytics Service
 * 
 * Service d'analytics compatible avec Expo utilisant Google Analytics 4
 * via HTTP requests directes pour éviter les dépendances problématiques
 */

import { FIREBASE_CONFIG } from '../config/env';

class SimpleAnalyticsService {
  private isEnabled: boolean = true;
  private sessionId: string;
  private measurementId: string | null = null;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.initialize();
  }

  /**
   * Génère un ID de session unique
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Initialise le service Analytics
   */
  private async initialize(): Promise<void> {
    try {
      // Vérifier si la configuration Firebase est disponible
      if (!FIREBASE_CONFIG.measurementId) {
        console.warn('⚠️ Simple Analytics: Firebase Measurement ID non configuré');
        return;
      }

      this.measurementId = FIREBASE_CONFIG.measurementId;
      console.log('✅ Simple Analytics: Service initialisé avec succès');
      
    } catch (error) {
      console.error('❌ Simple Analytics: Erreur d\'initialisation:', error);
    }
  }

  /**
   * Active ou désactive le tracking analytics
   */
  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }

  /**
   * Vérifie si le service est initialisé
   */
  private checkInitialization(): boolean {
    if (!this.measurementId || !this.isEnabled) {
      return false;
    }
    return true;
  }

  /**
   * Envoie un événement à Google Analytics via Measurement Protocol
   */
  private async sendToGA(params: { [key: string]: string }): Promise<void> {
    if (!this.checkInitialization()) return;

    try {
      const url = `https://www.google-analytics.com/mp/collect`;
      const payload = {
        measurement_id: this.measurementId,
        api_secret: 'YOUR_API_SECRET', // Vous devrez configurer cela dans GA4
        events: [{
          name: params.event_name || 'custom_event',
          params: params
        }]
      };

      // Utiliser fetch pour envoyer les données (non bloquant)
      fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }).catch(error => {
        // Silencieux en production, log en développement
        if (__DEV__) {
          console.warn('⚠️ Simple Analytics: Erreur envoi GA:', error);
        }
      });

    } catch (error) {
      if (__DEV__) {
        console.warn('⚠️ Simple Analytics: Erreur préparation envoi:', error);
      }
    }
  }

  /**
   * Enregistre un événement de vue d'écran
   * @param screenName - Nom de l'écran
   */
  async trackScreenView(screenName: string): Promise<boolean> {
    if (!this.checkInitialization()) return false;

    try {
      await this.sendToGA({
        event_name: 'screen_view',
        screen_name: screenName,
        session_id: this.sessionId,
        timestamp: new Date().toISOString(),
      });
      
      console.log(`📊 Simple Analytics: Vue d'écran enregistrée - ${screenName}`);
      return true;
    } catch (error) {
      console.error('❌ Simple Analytics: Erreur lors du tracking de vue d\'écran:', error);
      return false;
    }
  }

  /**
   * Enregistre un événement personnalisé
   * @param eventName - Nom de l'événement
   * @param parameters - Paramètres de l'événement (optionnel)
   */
  async trackEvent(eventName: string, parameters?: { [key: string]: any }): Promise<boolean> {
    if (!this.checkInitialization()) return false;

    try {
      await this.sendToGA({
        event_name: eventName,
        event_category: parameters?.event_category || 'engagement',
        session_id: this.sessionId,
        timestamp: new Date().toISOString(),
        ...parameters,
      });
      
      console.log(`📊 Simple Analytics: Événement enregistré - ${eventName}`, parameters);
      return true;
    } catch (error) {
      console.error('❌ Simple Analytics: Erreur lors du tracking d\'événement:', error);
      return false;
    }
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
    const parameters: { [key: string]: any } = {
      article_title: articleTitle,
      article_category: category || 'non_catégorisé',
      session_id: this.sessionId,
      timestamp: new Date().toISOString(),
    };

    if (articleId) {
      parameters.article_id = articleId.toString();
    }

    await this.trackEvent('article_viewed', parameters);
  }

  /**
   * Track une vue d'article (compatibilité avec l'ancien service)
   */
  async trackArticleView(articleId: string, articleTitle: string, source?: string): Promise<boolean> {
    return this.trackEvent('article_view', {
      event_category: 'engagement',
      article_id: articleId,
      article_title: articleTitle,
      source: source || 'unknown',
    });
  }

  /**
   * Track un partage d'article
   */
  async trackShare(articleId: string, articleTitle: string, method?: string): Promise<boolean> {
    return this.trackEvent('share', {
      event_category: 'engagement',
      article_id: articleId,
      article_title: articleTitle,
      method: method || 'unknown',
    });
  }

  /**
   * Track une recherche
   */
  async trackSearch(query: string, resultsCount: number): Promise<boolean> {
    return this.trackEvent('search', {
      event_category: 'engagement',
      search_term: query,
      result_count: resultsCount.toString(),
    });
  }

  /**
   * Track un achat de magazine
   */
  async trackPurchase(magazineId: string, magazineTitle: string, amount: number, currency: string): Promise<boolean> {
    return this.trackEvent('purchase', {
      event_category: 'ecommerce',
      magazine_id: magazineId,
      magazine_title: magazineTitle,
      value: amount.toString(),
      currency,
    });
  }
}

// Export d'une instance singleton
export const simpleAnalyticsService = new SimpleAnalyticsService();

// Export par défaut pour compatibilité
export default simpleAnalyticsService;
