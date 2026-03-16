// src/services/monitoringService.ts
import { supabase } from '../lib/supabase';
import { getDeviceId } from '../lib/supabase';

export interface PerformanceMetric {
  service: string;
  operation: string;
  duration: number;
  success: boolean;
  error?: string;
  timestamp: number;
  userAgent?: string;
  deviceId?: string;
}

export interface HealthCheck {
  service: string;
  status: 'healthy' | 'degraded' | 'down';
  responseTime: number;
  lastCheck: number;
  errorRate: number;
  uptime: number;
}

export interface AlertConfig {
  threshold: number;
  duration: number; // en minutes
  severity: 'low' | 'medium' | 'high' | 'critical';
}

class MonitoringService {
  private metrics: PerformanceMetric[] = [];
  private healthChecks = new Map<string, HealthCheck>();
  private alerts = new Map<string, AlertConfig>();
  private alertStates = new Map<string, { active: boolean; startTime: number }>();

  private readonly ALERT_CONFIGS: Record<string, AlertConfig> = {
    'wordpress_response_time': {
      threshold: 30000, // 30 secondes
      duration: 5,      // 5 minutes
      severity: 'high'
    },
    'supabase_response_time': {
      threshold: 15000, // 15 secondes
      duration: 3,      // 3 minutes
      severity: 'medium'
    },
    'error_rate': {
      threshold: 0.1,   // 10% d'erreurs
      duration: 2,      // 2 minutes
      severity: 'high'
    },
    'timeout_rate': {
      threshold: 0.05,  // 5% de timeouts
      duration: 1,      // 1 minute
      severity: 'medium'
    }
  };

  // Enregistrer une métrique de performance
  async recordMetric(metric: Omit<PerformanceMetric, 'timestamp' | 'deviceId'>): Promise<void> {
    const fullMetric: PerformanceMetric = {
      ...metric,
      timestamp: Date.now(),
      deviceId: await getDeviceId()
    };

    this.metrics.push(fullMetric);

    // Garder seulement les 1000 dernières métriques en mémoire
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }

    // Envoyer à Supabase pour stockage persistant (asynchrone)
    this.sendMetricToSupabase(fullMetric).catch(error => {
      console.warn('⚠️ Failed to send metric to Supabase:', error);
    });

    // Vérifier les alertes
    this.checkAlerts();
  }

  private async sendMetricToSupabase(metric: PerformanceMetric): Promise<void> {
    try {
      await supabase.from('performance_metrics').insert({
        service: metric.service,
        operation: metric.operation,
        duration: metric.duration,
        success: metric.success,
        error: metric.error,
        timestamp: new Date(metric.timestamp).toISOString(),
        device_id: metric.deviceId,
        user_agent: metric.userAgent
      });
    } catch (error) {
      // Ignorer silencieusement les erreurs de monitoring
    }
  }

  // Health check pour un service
  async healthCheck(service: string, url: string): Promise<HealthCheck> {
    const startTime = Date.now();
    let success = false;
    let error: string | undefined;

    try {
      const response = await fetch(url, {
        method: 'HEAD',
        signal: AbortSignal.timeout(10000) // 10 secondes timeout
      });
      
      success = response.ok;
    } catch (err: any) {
      error = err.message;
    }

    const responseTime = Date.now() - startTime;
    const now = Date.now();

    // Calculer les statistiques récentes
    const recentMetrics = this.getRecentMetrics(service, 5); // 5 dernières minutes
    const errorRate = this.calculateErrorRate(recentMetrics);
    const uptime = this.calculateUptime(recentMetrics);

    const healthCheck: HealthCheck = {
      service,
      status: this.determineStatus(success, responseTime, errorRate),
      responseTime,
      lastCheck: now,
      errorRate,
      uptime
    };

    this.healthChecks.set(service, healthCheck);

    // Envoyer le health check à Supabase
    this.sendHealthCheckToSupabase(healthCheck).catch(err => {
      console.warn('⚠️ Failed to send health check:', err);
    });

    return healthCheck;
  }

  private determineStatus(success: boolean, responseTime: number, errorRate: number): 'healthy' | 'degraded' | 'down' {
    if (!success || errorRate > 0.5) {
      return 'down';
    }
    
    if (responseTime > 30000 || errorRate > 0.1) {
      return 'degraded';
    }
    
    return 'healthy';
  }

  private getRecentMetrics(service: string, minutes: number): PerformanceMetric[] {
    const cutoff = Date.now() - (minutes * 60 * 1000);
    return this.metrics.filter(m => 
      m.service === service && 
      m.timestamp > cutoff
    );
  }

  private calculateErrorRate(metrics: PerformanceMetric[]): number {
    if (metrics.length === 0) return 0;
    
    const errors = metrics.filter(m => !m.success || m.error?.includes('timeout')).length;
    return errors / metrics.length;
  }

  private calculateUptime(metrics: PerformanceMetric[]): number {
    if (metrics.length === 0) return 1;
    
    const successes = metrics.filter(m => m.success).length;
    return successes / metrics.length;
  }

  private async sendHealthCheckToSupabase(healthCheck: HealthCheck): Promise<void> {
    try {
      await supabase.from('health_checks').insert({
        service: healthCheck.service,
        status: healthCheck.status,
        response_time: healthCheck.responseTime,
        error_rate: healthCheck.errorRate,
        uptime: healthCheck.uptime,
        checked_at: new Date(healthCheck.lastCheck).toISOString()
      });
    } catch (error) {
      // Ignorer silencieusement les erreurs de monitoring
    }
  }

  // Vérification des alertes
  private checkAlerts(): void {
    for (const [alertName, config] of Object.entries(this.ALERT_CONFIGS)) {
      this.checkAlert(alertName, config);
    }
  }

  private checkAlert(alertName: string, config: AlertConfig): void {
    const threshold = this.calculateThreshold(alertName);
    const isTriggered = threshold > config.threshold;

    const currentState = this.alertStates.get(alertName);
    const now = Date.now();

    if (isTriggered) {
      if (!currentState?.active) {
        // Nouvelle alerte
        this.alertStates.set(alertName, {
          active: true,
          startTime: now
        });

        console.warn(`🚨 ALERT: ${alertName} threshold exceeded (${threshold.toFixed(2)} > ${config.threshold})`);
        this.sendAlert(alertName, config, threshold);
      }
    } else {
      if (currentState?.active) {
        // Alert résolue
        this.alertStates.set(alertName, {
          active: false,
          startTime: now
        });

        console.log(`✅ ALERT RESOLVED: ${alertName} (${threshold.toFixed(2)} < ${config.threshold})`);
      }
    }
  }

  private calculateThreshold(alertName: string): number {
    switch (alertName) {
      case 'wordpress_response_time':
        return this.getAverageResponseTime('wordpress');
      
      case 'supabase_response_time':
        return this.getAverageResponseTime('supabase');
      
      case 'error_rate':
        return this.getOverallErrorRate();
      
      case 'timeout_rate':
        return this.getTimeoutRate();
      
      default:
        return 0;
    }
  }

  private getAverageResponseTime(service: string): number {
    const recentMetrics = this.getRecentMetrics(service, 5);
    if (recentMetrics.length === 0) return 0;

    return recentMetrics.reduce((sum, m) => sum + m.duration, 0) / recentMetrics.length;
  }

  private getOverallErrorRate(): number {
    const recentMetrics = this.metrics.filter(m => m.timestamp > Date.now() - 5 * 60 * 1000);
    if (recentMetrics.length === 0) return 0;

    return this.calculateErrorRate(recentMetrics);
  }

  private getTimeoutRate(): number {
    const recentMetrics = this.metrics.filter(m => m.timestamp > Date.now() - 5 * 60 * 1000);
    if (recentMetrics.length === 0) return 0;

    const timeouts = recentMetrics.filter(m => m.error?.includes('timeout')).length;
    return timeouts / recentMetrics.length;
  }

  private async sendAlert(alertName: string, config: AlertConfig, value: number): Promise<void> {
    try {
      await supabase.from('alerts').insert({
        alert_name: alertName,
        severity: config.severity,
        threshold: config.threshold,
        current_value: value,
        triggered_at: new Date().toISOString(),
        device_id: await getDeviceId()
      });
    } catch (error) {
      console.error('❌ Failed to send alert:', error);
    }
  }

  // Obtenir le dashboard de monitoring
  getDashboard(): {
    overview: {
      totalRequests: number;
      errorRate: number;
      avgResponseTime: number;
      servicesDown: number;
    };
    services: Record<string, HealthCheck>;
    recentAlerts: Array<{
      name: string;
      severity: string;
      triggered: boolean;
    }>;
  } {
    const recentMetrics = this.metrics.filter(m => m.timestamp > Date.now() - 60 * 60 * 1000); // 1 heure
    
    const overview = {
      totalRequests: recentMetrics.length,
      errorRate: this.calculateErrorRate(recentMetrics),
      avgResponseTime: recentMetrics.length > 0 
        ? recentMetrics.reduce((sum, m) => sum + m.duration, 0) / recentMetrics.length 
        : 0,
      servicesDown: Array.from(this.healthChecks.values()).filter(h => h.status === 'down').length
    };

    const services: Record<string, HealthCheck> = {};
    for (const [service, health] of this.healthChecks.entries()) {
      services[service] = health;
    }

    const recentAlerts = Array.from(this.alertStates.entries()).map(([name, state]) => ({
      name,
      severity: this.ALERT_CONFIGS[name]?.severity || 'medium',
      triggered: state.active
    }));

    return {
      overview,
      services,
      recentAlerts
    };
  }

  // Nettoyer les anciennes données
  cleanup(): void {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000; // 24 heures
    this.metrics = this.metrics.filter(m => m.timestamp > cutoff);
  }
}

export const monitoringService = new MonitoringService();
