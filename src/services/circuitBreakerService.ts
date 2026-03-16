// src/services/circuitBreakerService.ts
export interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number;
  monitoringPeriod: number;
  expectedExceptionPredicate?: (error: any) => boolean;
}

export enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Circuit is open, calls fail fast
  HALF_OPEN = 'HALF_OPEN' // Testing if service has recovered
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureTime?: number;
  lastSuccessTime?: number;
  totalRequests: number;
}

class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime?: number;
  private lastSuccessTime?: number;
  private totalRequests = 0;

  constructor(private config: CircuitBreakerConfig, private serviceName: string) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    this.totalRequests++;

    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = CircuitState.HALF_OPEN;
        console.log(`🔄 Circuit breaker for ${this.serviceName} transitioning to HALF_OPEN`);
      } else {
        throw new Error(`Circuit breaker for ${this.serviceName} is OPEN`);
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      throw error;
    }
  }

  private onSuccess(): void {
    this.successCount++;
    this.lastSuccessTime = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      this.reset();
      console.log(`✅ Circuit breaker for ${this.serviceName} reset to CLOSED`);
    }
  }

  private onFailure(error: any): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.shouldTripCircuit(error)) {
      this.trip();
      console.warn(`⚠️ Circuit breaker for ${this.serviceName} tripped to OPEN`);
    }
  }

  private shouldTripCircuit(error: any): boolean {
    if (this.state === CircuitState.HALF_OPEN) {
      return true; // Any failure in HALF_OPEN trips immediately
    }

    if (this.config.expectedExceptionPredicate && !this.config.expectedExceptionPredicate(error)) {
      return false; // Don't trip for unexpected exceptions
    }

    return this.failureCount >= this.config.failureThreshold;
  }

  private shouldAttemptReset(): boolean {
    return Date.now() - (this.lastFailureTime || 0) >= this.config.recoveryTimeout;
  }

  private trip(): void {
    this.state = CircuitState.OPEN;
  }

  private reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
  }

  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      totalRequests: this.totalRequests
    };
  }
}

class CircuitBreakerService {
  private circuitBreakers = new Map<string, CircuitBreaker>();

  private readonly DEFAULT_CONFIGS: Record<string, CircuitBreakerConfig> = {
    'wordpress': {
      failureThreshold: 5,
      recoveryTimeout: 60000, // 1 minute
      monitoringPeriod: 300000, // 5 minutes
      expectedExceptionPredicate: (error) => 
        error.name === 'AbortError' || 
        error.message?.includes('timeout') ||
        error.status >= 500
    },
    'supabase': {
      failureThreshold: 3,
      recoveryTimeout: 30000, // 30 secondes
      monitoringPeriod: 120000, // 2 minutes
      expectedExceptionPredicate: (error) => 
        error.name === 'AbortError' || 
        error.message?.includes('timeout') ||
        error.status >= 500
    },
    'uploadcare': {
      failureThreshold: 2,
      recoveryTimeout: 45000, // 45 secondes
      monitoringPeriod: 180000, // 3 minutes
      expectedExceptionPredicate: (error) => 
        error.name === 'AbortError' || 
        error.message?.includes('timeout') ||
        error.status >= 500
    },
    'twigapaie': {
      failureThreshold: 3,
      recoveryTimeout: 20000, // 20 secondes
      monitoringPeriod: 60000, // 1 minute
      expectedExceptionPredicate: (error) => 
        error.name === 'AbortError' || 
        error.message?.includes('timeout') ||
        error.status >= 500
    }
  };

  getCircuitBreaker(serviceName: string, customConfig?: Partial<CircuitBreakerConfig>): CircuitBreaker {
    if (!this.circuitBreakers.has(serviceName)) {
      const config = { ...this.DEFAULT_CONFIGS[serviceName], ...customConfig };
      this.circuitBreakers.set(serviceName, new CircuitBreaker(config, serviceName));
    }

    return this.circuitBreakers.get(serviceName)!;
  }

  async executeWithCircuitBreaker<T>(
    serviceName: string,
    operation: () => Promise<T>,
    customConfig?: Partial<CircuitBreakerConfig>
  ): Promise<T> {
    const circuitBreaker = this.getCircuitBreaker(serviceName, customConfig);
    return circuitBreaker.execute(operation);
  }

  getAllStats(): Record<string, CircuitBreakerStats> {
    const stats: Record<string, CircuitBreakerStats> = {};
    
    for (const [serviceName, circuitBreaker] of this.circuitBreakers.entries()) {
      stats[serviceName] = circuitBreaker.getStats();
    }

    return stats;
  }

  resetCircuitBreaker(serviceName: string): void {
    this.circuitBreakers.delete(serviceName);
    console.log(`🔄 Circuit breaker for ${serviceName} manually reset`);
  }

  resetAll(): void {
    this.circuitBreakers.clear();
    console.log(`🔄 All circuit breakers manually reset`);
  }
}

export const circuitBreakerService = new CircuitBreakerService();
