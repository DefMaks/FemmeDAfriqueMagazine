// src/services/adaptiveTimeoutService.ts
import { networkService } from './networkService';

export interface TimeoutConfig {
  baseTimeout: number;
  maxTimeout: number;
  retries: number;
  backoffMultiplier: number;
  jitterFactor: number;
}

export interface ServiceConfig {
  [serviceName: string]: TimeoutConfig;
}

class AdaptiveTimeoutService {
  private readonly DEFAULT_CONFIG: TimeoutConfig = {
    baseTimeout: 10000, // 10 secondes
    maxTimeout: 60000,   // 60 secondes max
    retries: 2,
    backoffMultiplier: 1.5,
    jitterFactor: 0.3
  };

  private readonly SERVICE_CONFIGS: ServiceConfig = {
    'wordpress': {
      baseTimeout: 15000,  // 15 secondes (WordPress est lent)
      maxTimeout: 45000,   // 45 secondes max
      retries: 2,
      backoffMultiplier: 1.8,
      jitterFactor: 0.4
    },
    'supabase': {
      baseTimeout: 8000,   // 8 secondes
      maxTimeout: 30000,   // 30 secondes max
      retries: 3,
      backoffMultiplier: 1.5,
      jitterFactor: 0.3
    },
    'uploadcare': {
      baseTimeout: 20000,  // 20 secondes (upload peut être long)
      maxTimeout: 120000,  // 2 minutes max
      retries: 1,
      backoffMultiplier: 2.0,
      jitterFactor: 0.5
    },
    'twigapaie': {
      baseTimeout: 5000,   // 5 secondes (paiement rapide)
      maxTimeout: 15000,   // 15 secondes max
      retries: 3,
      backoffMultiplier: 1.3,
      jitterFactor: 0.2
    },
    'onesignal': {
      baseTimeout: 3000,   // 3 secondes
      maxTimeout: 10000,   // 10 secondes max
      retries: 1,
      backoffMultiplier: 1.5,
      jitterFactor: 0.2
    }
  };

  private performanceHistory = new Map<string, number[]>();

  async executeWithAdaptiveTimeout<T>(
    service: string,
    operation: () => Promise<T>,
    customConfig?: Partial<TimeoutConfig>
  ): Promise<T> {
    const config = { ...this.getServiceConfig(service), ...customConfig };
    
    // Adapter le timeout basé sur les performances historiques
    const adaptiveTimeout = this.calculateAdaptiveTimeout(service, config);
    
    return this.executeWithRetry(operation, config, adaptiveTimeout, service);
  }

  private getServiceConfig(service: string): TimeoutConfig {
    return this.SERVICE_CONFIGS[service] || this.DEFAULT_CONFIG;
  }

  private calculateAdaptiveTimeout(service: string, config: TimeoutConfig): number {
    const history = this.performanceHistory.get(service) || [];
    
    if (history.length < 3) {
      return config.baseTimeout;
    }

    // Calculer la moyenne des temps de réponse récents
    const avgResponseTime = history.slice(-5).reduce((sum, time) => sum + time, 0) / Math.min(history.length, 5);
    
    // Adapter le timeout basé sur la performance
    const adaptiveTimeout = Math.max(
      config.baseTimeout,
      Math.min(
        config.maxTimeout,
        avgResponseTime * 2.5 // 2.5x la moyenne pour marge de sécurité
      )
    );

    console.log(`⏱️ Adaptive timeout for ${service}: ${adaptiveTimeout}ms (avg: ${Math.round(avgResponseTime)}ms)`);
    
    return adaptiveTimeout;
  }

  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    config: TimeoutConfig,
    timeout: number,
    service: string,
    attempt: number = 1
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      const result = await this.withTimeout(operation, timeout);
      
      // Enregistrer la performance réussie
      const responseTime = Date.now() - startTime;
      this.recordPerformance(service, responseTime);
      
      if (attempt > 1) {
        console.log(`✅ ${service} succeeded on attempt ${attempt} in ${responseTime}ms`);
      }
      
      return result;
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      
      if (this.shouldRetry(error, attempt, config)) {
        const delay = this.calculateRetryDelay(config, attempt);
        
        console.warn(`⚠️ ${service} attempt ${attempt} failed in ${responseTime}ms, retrying in ${Math.round(delay)}ms...`);
        
        await this.delay(delay);
        return this.executeWithRetry(operation, config, timeout, service, attempt + 1);
      }
      
      // Enregistrer l'échec
      this.recordPerformance(service, responseTime);
      
      console.error(`❌ ${service} failed after ${attempt} attempts in ${responseTime}ms:`, error.message);
      throw error;
    }
  }

  private async withTimeout<T>(operation: () => Promise<T>, timeoutMs: number): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const result = await operation();
      clearTimeout(timeoutId);
      return result;
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error(`Timeout after ${timeoutMs}ms`);
      }
      
      throw error;
    }
  }

  private shouldRetry(error: any, attempt: number, config: TimeoutConfig): boolean {
    if (attempt > config.retries) {
      return false;
    }

    // Types d'erreurs qui peuvent être retryées
    const retryableErrors = [
      'AbortError',
      'TimeoutError',
      'NetworkError',
      'ECONNRESET',
      'ETIMEDOUT'
    ];

    const isRetryable = retryableErrors.includes(error.name) ||
                       error.message?.includes('timeout') ||
                       error.message?.includes('aborted') ||
                       error.message?.includes('network') ||
                       (error.status >= 500 && error.status < 600);

    return isRetryable;
  }

  private calculateRetryDelay(config: TimeoutConfig, attempt: number): number {
    const baseDelay = 1000; // 1 seconde
    const exponentialDelay = baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);
    
    // Ajouter du jitter pour éviter les thundering herd
    const jitter = exponentialDelay * config.jitterFactor * Math.random();
    
    return exponentialDelay + jitter;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private recordPerformance(service: string, responseTime: number): void {
    if (!this.performanceHistory.has(service)) {
      this.performanceHistory.set(service, []);
    }

    const history = this.performanceHistory.get(service)!;
    history.push(responseTime);

    // Garder seulement les 20 dernières mesures
    if (history.length > 20) {
      history.shift();
    }
  }

  // Nettoyer l'historique périodiquement
  cleanupHistory(): void {
    for (const [service, history] of this.performanceHistory.entries()) {
      if (history.length > 50) {
        this.performanceHistory.set(service, history.slice(-20));
      }
    }
  }

  // Obtenir les statistiques de performance
  getPerformanceStats(): Record<string, {
    avgResponseTime: number;
    minResponseTime: number;
    maxResponseTime: number;
    sampleCount: number;
  }> {
    const stats: Record<string, any> = {};

    for (const [service, history] of this.performanceHistory.entries()) {
      if (history.length > 0) {
        stats[service] = {
          avgResponseTime: history.reduce((sum, time) => sum + time, 0) / history.length,
          minResponseTime: Math.min(...history),
          maxResponseTime: Math.max(...history),
          sampleCount: history.length
        };
      }
    }

    return stats;
  }
}

export const adaptiveTimeoutService = new AdaptiveTimeoutService();
