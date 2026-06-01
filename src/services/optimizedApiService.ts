// src/services/optimizedApiService.ts
import { WORDPRESS_CONFIG } from '../config/env';
import { cacheService } from './cacheService';
import { adaptiveTimeoutService } from './adaptiveTimeoutService';
import { monitoringService } from './monitoringService';
import { circuitBreakerService } from './circuitBreakerService';
import { networkService } from './networkService';

const WORDPRESS_API_URL = WORDPRESS_CONFIG.apiUrl || "https://femmedafrique.net/wp-json/wp/v2/";

export interface OptimizedApiConfig {
  service: string;
  endpoint: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  headers?: Record<string, string>;
  cacheKey?: string;
  cacheType?: string;
  cacheTTL?: number;
  skipCache?: boolean;
  customTimeout?: Partial<any>;
  retryConfig?: Partial<any>;
}

class OptimizedApiService {
  private readonly API_ENDPOINTS: Record<string, string> = {
    'wordpress': WORDPRESS_API_URL,
    'supabase': 'https://your-project.supabase.co/rest/v1/',
    'uploadcare': 'https://api.uploadcare.com/',
    'twigapaie': 'https://api.twigapaie.com/',
    'onesignal': 'https://onesignal.com/api/v1/'
  };

  async request<T>(config: OptimizedApiConfig): Promise<T> {
    const startTime = Date.now();
    let success = false;
    let error: string | undefined;

    try {
      // 1. Vérifier le cache d'abord
      if (!config.skipCache && config.method === 'GET') {
        const cachedData = await this.checkCache<T>(config);
        if (cachedData !== null) {
          console.log(`📦 Cache hit for ${config.service}:${config.endpoint}`);
          return cachedData;
        }
      }

      // 2. Exécuter la requête avec tous les optimisations
      const result = await this.executeOptimizedRequest<T>(config);
      
      // 3. Mettre en cache si succès
      if (!config.skipCache && config.method === 'GET') {
        await this.setCache(config, result);
      }

      success = true;
      return result;

    } catch (err: any) {
      error = err.message;
      throw err;
    } finally {
      // 4. Enregistrer la métrique de performance
      const duration = Date.now() - startTime;
      await monitoringService.recordMetric({
        service: config.service,
        operation: `${config.method || 'GET'} ${config.endpoint}`,
        duration,
        success,
        error
      });
    }
  }

  private async checkCache<T>(config: OptimizedApiConfig): Promise<T | null> {
    const cacheKey = config.cacheKey || this.generateCacheKey(config);
    const cacheType = config.cacheType || this.determineCacheType(config.service);
    
    return cacheService.get<T>(cacheKey, cacheType);
  }

  private async setCache<T>(config: OptimizedApiConfig, data: T): Promise<void> {
    const cacheKey = config.cacheKey || this.generateCacheKey(config);
    const cacheType = config.cacheType || this.determineCacheType(config.service);
    
    await cacheService.set(cacheKey, data, cacheType);
  }

  private generateCacheKey(config: OptimizedApiConfig): string {
    const key = `${config.service}:${config.endpoint}`;
    if (config.body) {
      return `${key}:${JSON.stringify(config.body)}`;
    }
    return key;
  }

  private determineCacheType(service: string): string {
    switch (service) {
      case 'wordpress':
        return 'articles';
      case 'supabase':
        return 'profile';
      case 'twigapaie':
        return 'settings';
      default:
        return 'default';
    }
  }

  private async executeOptimizedRequest<T>(config: OptimizedApiConfig): Promise<T> {
    const baseUrl = this.API_ENDPOINTS[config.service];
    if (!baseUrl) {
      throw new Error(`Unknown service: ${config.service}`);
    }

    const url = `${baseUrl}${config.endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...config.headers
    };
    const fullConfig = {
      method: config.method || 'GET',
      headers,
      body: config.body ? JSON.stringify(config.body) : undefined
    };

    // Exécuter avec circuit breaker, timeout adaptatif et monitoring
    return circuitBreakerService.executeWithCircuitBreaker(
      config.service,
      () => adaptiveTimeoutService.executeWithAdaptiveTimeout(
        config.service,
        () => this.fetchWithRetry<T>(url, fullConfig),
        config.customTimeout
      )
    );
  }

  private async fetchWithRetry<T>(url: string, config: RequestInit): Promise<T> {
    const controller = new AbortController();
    
    try {
      const response = await fetch(url, {
        ...config,
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    }
  }

  // Méthodes optimisées pour WordPress
  async getArticles(params?: {
    page?: number;
    per_page?: number;
    category?: number;
    search?: string;
    embed?: boolean;
  }) {
    const queryParams = new URLSearchParams();
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }

    const endpoint = `posts${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    
    return this.request({
      service: 'wordpress',
      endpoint,
      cacheKey: `articles:${JSON.stringify(params)}`,
      cacheType: 'articles'
    });
  }

  async getArticle(id: number, embed: boolean = true) {
    const endpoint = `posts/${id}${embed ? '?_embed=true' : ''}`;
    
    return this.request({
      service: 'wordpress',
      endpoint,
      cacheKey: `article:${id}`,
      cacheType: 'articles'
    });
  }

  async getCategories() {
    return this.request({
      service: 'wordpress',
      endpoint: 'categories?per_page=100',
      cacheKey: 'categories',
      cacheType: 'categories',
      cacheTTL: 24 * 60 * 60 * 1000 // 24 heures
    });
  }

  // Méthodes optimisées pour Supabase
  async getProfile(deviceId: string) {
    return this.request({
      service: 'supabase',
      endpoint: `user_profile_media?device_id=eq.${deviceId}&select=*`,
      cacheKey: `profile:${deviceId}`,
      cacheType: 'profile'
    });
  }

  async updateProfile(deviceId: string, data: any) {
    return this.request({
      service: 'supabase',
      endpoint: `user_profile_media?device_id=eq.${deviceId}`,
      method: 'PUT',
      body: data,
      skipCache: true
    });
  }

  // Méthodes optimisées pour Uploadcare
  async uploadPhoto(fileUri: string) {
    const formData = new FormData();
    formData.append('file', {
      uri: fileUri,
      type: 'image/jpeg',
      name: 'profile.jpg'
    } as any);

    return this.request({
      service: 'uploadcare',
      endpoint: 'files/',
      method: 'POST',
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      body: formData,
      skipCache: true,
      customTimeout: {
        baseTimeout: 20000,
        maxTimeout: 120000
      }
    });
  }

  // Méthodes optimisées pour TwigaPaie
  async initiatePayment(paymentData: any) {
    return this.request({
      service: 'twigapaie',
      endpoint: 'payments/payment-service',
      method: 'POST',
      body: paymentData,
      skipCache: true,
      customTimeout: {
        baseTimeout: 5000,
        maxTimeout: 15000
      }
    });
  }

  async checkPaymentStatus(orderId: string) {
    return this.request({
      service: 'twigapaie',
      endpoint: `payments/payment-check?order_id=${orderId}`,
      method: 'GET',
      skipCache: true,
      customTimeout: {
        baseTimeout: 3000,
        maxTimeout: 10000
      }
    });
  }

  // Health checks
  async performHealthChecks(): Promise<Record<string, any>> {
    const healthChecks: Record<string, Promise<any>> = {};

    // WordPress health check
    healthChecks.wordpress = monitoringService.healthCheck(
      'wordpress',
      WORDPRESS_API_URL
    );

    // Supabase health check
    healthChecks.supabase = monitoringService.healthCheck(
      'supabase',
      'https://your-project.supabase.co/rest/v1/'
    );

    // Uploadcare health check
    healthChecks.uploadcare = monitoringService.healthCheck(
      'uploadcare',
      'https://api.uploadcare.com/'
    );

    // TwigaPaie health check
    healthChecks.twigapaie = monitoringService.healthCheck(
      'twigapaie',
      'https://api.twigapaie.com/'
    );

    const results = await Promise.allSettled(Object.values(healthChecks));
    const finalResults: Record<string, any> = {};

    Object.keys(healthChecks).forEach((key, index) => {
      finalResults[key] = results[index].status === 'fulfilled' 
        ? results[index].value 
        : { status: 'down', error: results[index].reason };
    });

    return finalResults;
  }

  // Dashboard de monitoring
  getMonitoringDashboard() {
    return monitoringService.getDashboard();
  }

  // Stats des circuit breakers
  getCircuitBreakerStats() {
    return circuitBreakerService.getAllStats();
  }

  // Stats du cache
  getCacheStats() {
    return cacheService.getStats();
  }

  // Stats des timeouts
  getTimeoutStats() {
    return adaptiveTimeoutService.getPerformanceStats();
  }

  // Nettoyage
  async cleanup(): Promise<void> {
    await cacheService.clear();
    circuitBreakerService.resetAll();
    monitoringService.cleanup();
    adaptiveTimeoutService.cleanupHistory();
  }
}

export const optimizedApiService = new OptimizedApiService();
