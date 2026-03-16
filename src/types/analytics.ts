// src/types/analytics.ts
// Types et énumérations pour le service d'analytics

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

export interface PerformanceMetric {
  metric_name: string;
  value: number;
  unit?: string;
  timestamp?: string;
  context?: Record<string, any>;
}

export interface ErrorEvent {
  error_type: string;
  error_message: string;
  context?: string;
  stack_trace?: string;
  user_action?: string;
  recovery_attempted?: boolean;
}

export interface PaymentEvent {
  payment_status: 'success' | 'failed' | 'cancelled';
  amount: number;
  currency: string;
  payment_method: 'emoney' | 'ecard';
  order_id?: string;
  processing_time?: number;
  error_code?: string;
}

export interface DownloadEvent {
  download_status: 'started' | 'completed' | 'failed';
  file_type: 'pdf' | 'image' | 'audio' | 'video';
  file_size?: number;
  file_name?: string;
  download_speed?: number;
  error_type?: string;
}

export interface ReadingEvent {
  reading_action: 'opened' | 'shared' | 'saved' | 'bookmarked';
  article_id: string;
  article_title?: string;
  category_id?: string;
  reading_time?: number;
  scroll_depth?: number;
}

export interface SearchEvent {
  search_type: 'simple' | 'filtered' | 'advanced';
  query?: string;
  filters?: Record<string, any>;
  results_count?: number;
  selected_result?: number;
}

export interface NavigationEvent {
  screen_name: string;
  previous_screen?: string;
  time_on_screen?: number;
  navigation_method?: 'tab' | 'swipe' | 'deep_link';
  parameters?: Record<string, any>;
}

export interface UserEngagementEvent {
  engagement_type: 'notification_enabled' | 'notification_disabled' | 'preferences_updated' | 'feature_used';
  feature_name?: string;
  preference_key?: string;
  old_value?: any;
  new_value?: any;
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
  USER_ENGAGEMENT = 'user_engagement',
  SYSTEM = 'system',
  BUSINESS = 'business',
  UI = 'ui'
}

// Types d'événements principaux
export enum EventType {
  // Authentification
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILED = 'login_failed',
  LOGOUT = 'logout',
  SIGNUP = 'signup',
  PROFILE_CREATED = 'profile_created',
  PASSWORD_RESET = 'password_reset',
  ACCOUNT_VERIFIED = 'account_verified',
  
  // Paiement
  PAYMENT_INITIATED = 'payment_initiated',
  PAYMENT_SUCCESS = 'payment_success',
  PAYMENT_FAILED = 'payment_failed',
  PAYMENT_CANCELLED = 'payment_cancelled',
  PAYMENT_PENDING = 'payment_pending',
  PAYMENT_RETRY = 'payment_retry',
  
  // Téléchargement
  DOWNLOAD_STARTED = 'download_started',
  DOWNLOAD_COMPLETED = 'download_completed',
  DOWNLOAD_FAILED = 'download_failed',
  DOWNLOAD_PAUSED = 'download_paused',
  DOWNLOAD_RESUMED = 'download_resumed',
  
  // Lecture
  ARTICLE_OPENED = 'article_opened',
  ARTICLE_SHARED = 'article_shared',
  ARTICLE_SAVED = 'article_saved',
  ARTICLE_BOOKMARKED = 'article_bookmarked',
  ARTICLE_LIKED = 'article_liked',
  ARTICLE_COMMENTED = 'article_commented',
  
  // Recherche
  SEARCH_PERFORMED = 'search_performed',
  SEARCH_FILTERED = 'search_filtered',
  SEARCH_SUGGESTION_CLICKED = 'search_suggestion_clicked',
  SEARCH_NO_RESULTS = 'search_no_results',
  
  // Navigation
  SCREEN_VIEWED = 'screen_viewed',
  TAB_SWITCHED = 'tab_switched',
  BACK_BUTTON_PRESSED = 'back_button_pressed',
  MENU_OPENED = 'menu_opened',
  
  // Erreurs
  ERROR_OCCURRED = 'error_occurred',
  CRASH_OCCURRED = 'crash_occurred',
  NETWORK_ERROR = 'network_error',
  API_ERROR = 'api_error',
  
  // Performance
  APP_STARTUP_TIME = 'app_startup_time',
  SCREEN_LOAD_TIME = 'screen_load_time',
  API_RESPONSE_TIME = 'api_response_time',
  MEMORY_USAGE = 'memory_usage',
  BATTERY_LEVEL = 'battery_level',
  
  // Engagement utilisateur
  NOTIFICATION_ENABLED = 'notification_enabled',
  NOTIFICATION_DISABLED = 'notification_disabled',
  NOTIFICATION_CLICKED = 'notification_clicked',
  PREFERENCES_UPDATED = 'preferences_updated',
  THEME_CHANGED = 'theme_changed',
  LANGUAGE_CHANGED = 'language_changed',
  FEATURE_DISCOVERED = 'feature_discovered',
  FEATURE_USED = 'feature_used',
  
  // Système
  BACKGROUND_SYNC = 'background_sync',
  CACHE_CLEARED = 'cache_cleared',
  STORAGE_ERROR = 'storage_error',
  
  // Business
  SUBSCRIPTION_STARTED = 'subscription_started',
  SUBSCRIPTION_CANCELLED = 'subscription_cancelled',
  PURCHASE_COMPLETED = 'purchase_completed',
  REVENUE_GENERATED = 'revenue_generated',
  
  // UI
  BUTTON_CLICKED = 'button_clicked',
  FORM_SUBMITTED = 'form_submitted',
  MODAL_OPENED = 'modal_opened',
  MODAL_CLOSED = 'modal_closed'
}

// Statuts d'événements
export enum EventStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
  PENDING = 'pending',
  CANCELLED = 'cancelled',
  IN_PROGRESS = 'in_progress'
}

// Sources d'événements
export enum EventSource {
  USER = 'user',
  SYSTEM = 'system',
  NETWORK = 'network',
  BACKGROUND = 'background',
  PUSH_NOTIFICATION = 'push_notification',
  DEEP_LINK = 'deep_link'
}

// Priorités d'événements
export enum EventPriority {
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
  CRITICAL = 4
}

// Configuration par défaut
export const ANALYTICS_CONFIG = {
  BATCH_SIZE: 50,
  FLUSH_INTERVAL: 30000, // 30 secondes
  SESSION_TIMEOUT: 1800000, // 30 minutes
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000
};

// Métadonnées standards
export interface StandardMetadata {
  app_version: string;
  device_type: string;
  os_version: string;
  network_type: string;
  battery_level: number;
  is_charging: boolean;
  storage_available: boolean;
  memory_available: number;
}
