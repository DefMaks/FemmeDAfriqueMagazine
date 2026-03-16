// src/services/analyticsService.ts
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDeviceId } from '../lib/supabase';

// Interfaces pour les analytics
export interface AnalyticsEvent {
  id?: string;
  event_name: string;
  event_category?: string;
  event_label?: string;
  event_value?: number;
  user_id?: string;
  session_id?: string;
  timestamp?: string;
  metadata?: Record<string, any>;
}

export interface SessionInfo {
  session_id: string;
  start_time: string;
  device_id: string;
  app_version: string;
  user_agent?: string;
}

export interface UserJourney {
  events: AnalyticsEvent[];
  session_id: string;
  duration: number;
  conversion?: boolean;
}

// Catégories d'événements
export enum EventCategory {
  AUTH = 'auth',
  PAYMENT = 'payment',
  DOWNLOAD = 'download',
  READING = 'reading',
  SEARCH = 'search',
  NAVIGATION = 'navigation',
  ERROR = 'error',
  PERFORMANCE = 'performance',
  USER_ENGAGEMENT = 'user_engagement'
}

// Types d'événements
export enum EventType {
  // Authentification
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILED = 'login_failed',
  LOGOUT = 'logout',
  SIGNUP = 'signup',
  PROFILE_CREATED = 'profile_created',
  
  // Paiement
  PAYMENT_INITIATED = 'payment_initiated',
  PAYMENT_SUCCESS = 'payment_success',
  PAYMENT_FAILED = 'payment_failed',
  PAYMENT_CANCELLED = 'payment_cancelled',
  
  // Téléchargement
  DOWNLOAD_STARTED = 'download_started',
  DOWNLOAD_COMPLETED = 'download_completed',
  DOWNLOAD_FAILED = 'download_failed',
  
  // Lecture
  ARTICLE_OPENED = 'article_opened',
  ARTICLE_SHARED = 'article_shared',
  ARTICLE_SAVED = 'article_saved',
  
  // Recherche
  SEARCH_PERFORMED = 'search_performed',
  SEARCH_FILTERED = 'search_filtered',
  
  // Navigation
  SCREEN_VIEWED = 'screen_viewed',
  TAB_SWITCHED = 'tab_switched',
  
  // Erreurs
  ERROR_OCCURRED = 'error_occurred',
  CRASH_OCCURRED = 'crash_occurred',
  
  // Engagement
  NOTIFICATION_ENABLED = 'notification_enabled',
  NOTIFICATION_DISABLED = 'notification_disabled',
  PREFERENCES_UPDATED = 'preferences_updated'
}

class AnalyticsService {
  private readonly SESSION_KEY = '@fda_analytics_session';
  private readonly BATCH_SIZE = 50;
  private readonly FLUSH_INTERVAL = 30000; // 30 secondes
  private eventQueue: AnalyticsEvent[] = [];
  private currentSession: SessionInfo | null = null;
  private flushTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeSession();
    this.startBatchFlush();
  }

  /**
   * Initialiser une nouvelle session
   */
  private async initializeSession(): Promise<void> {
    try {
      const deviceId = await getDeviceId();
      const sessionId = this.generateSessionId();
      
      this.currentSession = {
        session_id: sessionId,
        start_time: new Date().toISOString(),
        device_id: deviceId,
        app_version: '1.0.0', // À récupérer depuis package.json
        user_agent: 'FDA-Mobile'
      };

      await AsyncStorage.setItem(this.SESSION_KEY, JSON.stringify(this.currentSession));
      console.log('📊 Session analytics initialisée:', sessionId);

    } catch (error) {
      console.error('❌ Erreur initialisation session:', error);
    }
  }

  /**
   * Générer un ID de session unique
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Démarrer le flush automatique des événements
   */
  private startBatchFlush(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    this.flushTimer = setInterval(() => {
      this.flushEvents();
    }, this.FLUSH_INTERVAL);
  }

  /**
   * Traiter un événement
   */
  async trackEvent(
    eventName: EventType,
    category: EventCategory = EventCategory.USER_ENGAGEMENT,
    label?: string,
    value?: number,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const deviceId = await getDeviceId();
      
      const event: AnalyticsEvent = {
        event_name: eventName,
        event_category: category,
        event_label: label,
        event_value: value,
        user_id: deviceId,
        session_id: this.currentSession?.session_id,
        timestamp: new Date().toISOString(),
        metadata
      };

      // Ajouter à la file d'attente
      this.eventQueue.push(event);

      // Logger pour debugging
      console.log('📊 Événement tracké:', {
        name: eventName,
        category,
        label,
        value,
        queue_size: this.eventQueue.length
      });

      // Flush si la file est pleine
      if (this.eventQueue.length >= this.BATCH_SIZE) {
        await this.flushEvents();
      }

    } catch (error) {
      console.error('❌ Erreur tracking événement:', error);
    }
  }

  /**
   * Traiter un événement de paiement
   */
  async trackPayment(
    status: 'success' | 'failed' | 'cancelled',
    amount: number,
    currency: string,
    paymentMethod: 'emoney' | 'ecard',
    orderId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const eventName = status === 'success' ? EventType.PAYMENT_SUCCESS : 
                      status === 'failed' ? EventType.PAYMENT_FAILED : EventType.PAYMENT_CANCELLED;

    await this.trackEvent(eventName, EventCategory.PAYMENT, `${paymentMethod}_${currency}`, amount, {
      payment_method: paymentMethod,
      order_id: orderId,
      currency,
      ...metadata
    });
  }

  /**
   * Traiter un événement de téléchargement
   */
  async trackDownload(
    status: 'started' | 'completed' | 'failed',
    fileType: 'pdf' | 'image',
    fileSize?: number,
    fileName?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const eventName = status === 'completed' ? EventType.DOWNLOAD_COMPLETED :
                      status === 'failed' ? EventType.DOWNLOAD_FAILED : EventType.DOWNLOAD_STARTED;

    await this.trackEvent(eventName, EventCategory.DOWNLOAD, `${fileType}_${status}`, fileSize, {
      file_type: fileType,
      file_name: fileName,
      ...metadata
    });
  }

  /**
   * Traiter un événement de lecture
   */
  async trackReading(
    action: 'opened' | 'shared' | 'saved',
    articleId: string,
    articleTitle?: string,
    categoryId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const eventName = action === 'opened' ? EventType.ARTICLE_OPENED :
                      action === 'shared' ? EventType.ARTICLE_SHARED : EventType.ARTICLE_SAVED;

    await this.trackEvent(eventName, EventCategory.READING, `article_${action}`, undefined, {
      article_id: articleId,
      article_title: articleTitle,
      category_id: categoryId,
      ...metadata
    });
  }

  /**
   * Traiter un événement d'authentification
   */
  async trackAuth(
    action: 'login_success' | 'login_failed' | 'logout' | 'signup',
    username?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const eventName = action === 'login_success' ? EventType.LOGIN_SUCCESS :
                      action === 'login_failed' ? EventType.LOGIN_FAILED :
                      action === 'logout' ? EventType.LOGOUT : EventType.SIGNUP;

    await this.trackEvent(eventName, EventCategory.AUTH, action, undefined, {
      username,
      ...metadata
    });
  }

  /**
   * Traiter un événement d'erreur
   */
  async trackError(
    errorType: string,
    errorMessage: string,
    context?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.trackEvent(EventType.ERROR_OCCURRED, EventCategory.ERROR, errorType, undefined, {
      error_message: errorMessage,
      context,
      ...metadata
    });
  }

  /**
   * Traiter un événement de performance
   */
  async trackPerformance(
    metricName: string,
    value: number,
    unit?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.trackEvent(EventType.ERROR_OCCURRED, EventCategory.PERFORMANCE, metricName, value, {
      unit,
      ...metadata
    });
  }

  /**
   * Envoyer les événements en lot à Supabase
   */
  private async flushEvents(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    try {
      const events = [...this.eventQueue];
      this.eventQueue = [];

      console.log(`📊 Flush de ${events.length} événements vers Supabase`);

      const { error } = await supabase
        .from('analytics_events')
        .insert(events)
        .select();

      if (error) {
        console.error('❌ Erreur flush analytics:', error);
        // Remettre les événements dans la file pour retry plus tard
        this.eventQueue.unshift(...events);
      } else {
        console.log('✅ Flush analytics réussi');
      }

    } catch (error) {
      console.error('❌ Erreur critique flush analytics:', error);
    }
  }

  /**
   * Forcer l'envoi des événements
   */
  async forceFlush(): Promise<void> {
    await this.flushEvents();
  }

  /**
   * Obtenir la session actuelle
   */
  getCurrentSession(): SessionInfo | null {
    return this.currentSession;
  }

  /**
   * Terminer la session actuelle
   */
  async endSession(): Promise<void> {
    if (this.currentSession) {
      const sessionDuration = Date.now() - new Date(this.currentSession.start_time).getTime();
      
      await this.trackEvent(EventType.LOGOUT, EventCategory.AUTH, 'session_end', sessionDuration, {
        session_duration_ms: sessionDuration,
        events_count: this.eventQueue.length
      });

      await AsyncStorage.removeItem(this.SESSION_KEY);
      this.currentSession = null;
      
      console.log('📊 Session analytics terminée');
    }
  }

  /**
   * Obtenir des statistiques de session
   */
  getSessionStats(): UserJourney | null {
    if (!this.currentSession) return null;

    return {
      events: this.eventQueue,
      session_id: this.currentSession.session_id,
      duration: Date.now() - new Date(this.currentSession.start_time).getTime(),
      conversion: false
    };
  }

  /**
   * Nettoyer les ressources
   */
  cleanup(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.eventQueue = [];
    this.currentSession = null;
  }
}

// Export singleton
export const analyticsService = new AnalyticsService();
