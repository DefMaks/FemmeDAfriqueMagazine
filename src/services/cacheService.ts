// src/services/cacheService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

export interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
  version: string;
  source: 'memory' | 'disk';
}

export interface CacheConfig {
  ttl: number; // en millisecondes
  maxSize?: number; // nombre max d'items
  strategy: 'memory' | 'disk' | 'hybrid';
  compression?: boolean;
}

class CacheService {
  private memoryCache = new Map<string, CacheItem<any>>();
  private readonly DEFAULT_CONFIG: CacheConfig = {
    ttl: 5 * 60 * 1000, // 5 minutes
    strategy: 'hybrid',
    compression: true
  };

  // Configurations par type de données
  private readonly CACHE_CONFIGS: Record<string, CacheConfig> = {
    'articles': {
      ttl: 30 * 60 * 1000, // 30 minutes
      strategy: 'hybrid',
      maxSize: 100
    },
    'categories': {
      ttl: 24 * 60 * 60 * 1000, // 24 heures
      strategy: 'disk'
    },
    'profile': {
      ttl: 10 * 60 * 1000, // 10 minutes
      strategy: 'hybrid'
    },
    'favorites': {
      ttl: 60 * 60 * 1000, // 1 heure
      strategy: 'disk'
    },
    'settings': {
      ttl: 24 * 60 * 60 * 1000, // 24 heures
      strategy: 'disk'
    }
  };

  async get<T>(key: string, type: string = 'default'): Promise<T | null> {
    const config = this.CACHE_CONFIGS[type] || this.DEFAULT_CONFIG;
    
    try {
      // 1. Vérifier cache mémoire d'abord
      if (config.strategy === 'memory' || config.strategy === 'hybrid') {
        const memoryItem = this.memoryCache.get(key);
        if (memoryItem && !this.isExpired(memoryItem)) {
          console.log(`📦 Cache hit (memory): ${key}`);
          return memoryItem.data;
        }
      }

      // 2. Vérifier cache disque
      if (config.strategy === 'disk' || config.strategy === 'hybrid') {
        const diskKey = `cache_${key}`;
        const stored = await AsyncStorage.getItem(diskKey);
        
        if (stored) {
          const item: CacheItem<T> = JSON.parse(stored);
          if (!this.isExpired(item)) {
            console.log(`📦 Cache hit (disk): ${key}`);
            
            // Mettre en cache mémoire si hybrid
            if (config.strategy === 'hybrid') {
              this.memoryCache.set(key, { ...item, source: 'memory' });
            }
            
            return item.data;
          } else {
            // Nettoyer l'item expiré
            await AsyncStorage.removeItem(diskKey);
          }
        }
      }

      console.log(`❌ Cache miss: ${key}`);
      return null;
    } catch (error) {
      console.error(`❌ Cache get error for ${key}:`, error);
      return null;
    }
  }

  async set<T>(key: string, data: T, type: string = 'default'): Promise<void> {
    const config = this.CACHE_CONFIGS[type] || this.DEFAULT_CONFIG;
    
    try {
      const item: CacheItem<T> = {
        data,
        timestamp: Date.now(),
        ttl: config.ttl,
        version: '1.0',
        source: 'memory'
      };

      // 1. Mettre en cache mémoire
      if (config.strategy === 'memory' || config.strategy === 'hybrid') {
        // Nettoyer si maxSize dépassé
        if (config.maxSize && this.memoryCache.size >= config.maxSize) {
          this.evictOldest();
        }
        
        this.memoryCache.set(key, item);
        console.log(`💾 Cache set (memory): ${key}`);
      }

      // 2. Mettre en cache disque
      if (config.strategy === 'disk' || config.strategy === 'hybrid') {
        const diskKey = `cache_${key}`;
        const diskItem = { ...item, source: 'disk' as const };
        
        await AsyncStorage.setItem(diskKey, JSON.stringify(diskItem));
        console.log(`💾 Cache set (disk): ${key}`);
      }
    } catch (error) {
      console.error(`❌ Cache set error for ${key}:`, error);
    }
  }

  async invalidate(key: string): Promise<void> {
    try {
      this.memoryCache.delete(key);
      await AsyncStorage.removeItem(`cache_${key}`);
      console.log(`🗑️ Cache invalidated: ${key}`);
    } catch (error) {
      console.error(`❌ Cache invalidate error for ${key}:`, error);
    }
  }

  async invalidatePattern(pattern: string): Promise<void> {
    try {
      // Invalider cache mémoire
      for (const key of this.memoryCache.keys()) {
        if (key.includes(pattern)) {
          this.memoryCache.delete(key);
        }
      }

      // Invalider cache disque
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith('cache_') && key.includes(pattern));
      
      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
        console.log(`🗑️ Cache pattern invalidated: ${pattern} (${cacheKeys.length} items)`);
      }
    } catch (error) {
      console.error(`❌ Cache pattern invalidate error:`, error);
    }
  }

  async clear(): Promise<void> {
    try {
      this.memoryCache.clear();
      
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith('cache_'));
      
      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
        console.log(`🗑️ Cache cleared: ${cacheKeys.length} items`);
      }
    } catch (error) {
      console.error('❌ Cache clear error:', error);
    }
  }

  private isExpired(item: CacheItem<any>): boolean {
    return Date.now() - item.timestamp > item.ttl;
  }

  private evictOldest(): void {
    let oldestKey = '';
    let oldestTime = Date.now();

    for (const [key, item] of this.memoryCache.entries()) {
      if (item.timestamp < oldestTime) {
        oldestTime = item.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.memoryCache.delete(oldestKey);
      console.log(`🗑️ Cache evicted oldest: ${oldestKey}`);
    }
  }

  // Stats du cache
  getStats(): {
    memorySize: number;
    diskSize: Promise<number>;
    hitRate: number;
  } {
    return {
      memorySize: this.memoryCache.size,
      diskSize: this.getDiskSize(),
      hitRate: 0 // TODO: Implémenter le tracking des hits/misses
    };
  }

  private async getDiskSize(): Promise<number> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      return keys.filter(key => key.startsWith('cache_')).length;
    } catch {
      return 0;
    }
  }
}

export const cacheService = new CacheService();
