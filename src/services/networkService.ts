// src/services/networkService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { offlineService } from './offlineService';

// Types pour NetInfo (si le package n'est pas installé)
interface NetInfoState {
  isConnected: boolean | null;
  type: 'wifi' | 'cellular' | 'none' | null;
  isInternetReachable: boolean | null;
}

// Mock NetInfo si le package n'est pas disponible
const NetInfo = {
  fetch: async (): Promise<NetInfoState> => {
    try {
      // Utiliser fetch simple pour tester la connectivité
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch('https://httpbin.org/get', {
        method: 'HEAD',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return {
        isConnected: response.ok,
        type: 'wifi', // Par défaut
        isInternetReachable: response.ok
      };
    } catch {
      return {
        isConnected: false,
        type: 'none',
        isInternetReachable: false
      };
    }
  },
  addEventListener: (callback: (state: NetInfoState) => void) => {
    // Mock simple - vérification périodique
    let lastState: NetInfoState | null = null;
    
    const interval = setInterval(async () => {
      const currentState = await NetInfo.fetch();
      if (!lastState || 
          lastState.isConnected !== currentState.isConnected ||
          lastState.isInternetReachable !== currentState.isInternetReachable) {
        callback(currentState);
        lastState = currentState;
      }
    }, 10000); // Vérification toutes les 10s

    return () => clearInterval(interval);
  }
};

export interface NetworkStatus {
  isConnected: boolean;
  type: 'wifi' | 'cellular' | 'none';
  isInternetReachable: boolean;
  lastChecked: string;
}

export interface NetworkConfig {
  checkInterval: number;
  retryDelay: number;
  maxRetries: number;
  offlineThreshold: number;
}

class NetworkService {
  private currentStatus: NetworkStatus = {
    isConnected: false,
    type: 'none',
    isInternetReachable: false,
    lastChecked: new Date().toISOString()
  };
  
  private listeners: ((status: NetworkStatus) => void)[] = [];
  private checkTimer: NodeJS.Timeout | null = null;
  
  private readonly CONFIG: NetworkConfig = {
    checkInterval: 30000, // 30 secondes
    retryDelay: 5000,    // 5 secondes
    maxRetries: 3,
    offlineThreshold: 10000 // 10 secondes sans réponse = offline
  };

  private readonly STORAGE_KEY = '@fda_network_status';

  constructor() {
    this.initializeNetworkMonitoring();
  }

  /**
   * Initialiser le monitoring réseau
   */
  private async initializeNetworkMonitoring(): Promise<void> {
    try {
      // Écouter les changements de connexion
      const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
        this.updateNetworkStatus({
          isConnected: state.isConnected ?? false,
          type: state.type === 'wifi' ? 'wifi' : 
                 state.type === 'cellular' ? 'cellular' : 'none',
          isInternetReachable: state.isInternetReachable ?? false,
          lastChecked: new Date().toISOString()
        });
      });

      // Vérifier état initial
      const state = await NetInfo.fetch();
      this.updateNetworkStatus({
        isConnected: state.isConnected ?? false,
        type: state.type === 'wifi' ? 'wifi' : 
               state.type === 'cellular' ? 'cellular' : 'none',
        isInternetReachable: state.isInternetReachable ?? false,
        lastChecked: new Date().toISOString()
      });

      // Démarrer le monitoring périodique
      this.startPeriodicCheck();

      console.log('🌐 Service réseau initialisé:', this.currentStatus);

    } catch (error) {
      console.error('❌ Erreur initialisation réseau:', error);
    }
  }

  /**
   * Démarrer la vérification périodique
   */
  private startPeriodicCheck(): void {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
    }

    this.checkTimer = setInterval(async () => {
      await this.checkConnectivity();
    }, this.CONFIG.checkInterval);

    console.log('⏰ Monitoring réseau périodique démarré');
  }

  /**
   * Vérifier la connectivité
   */
  async checkConnectivity(): Promise<NetworkStatus> {
    try {
      const state = await NetInfo.fetch();
      const status: NetworkStatus = {
        isConnected: state.isConnected ?? false,
        type: state.type === 'wifi' ? 'wifi' : 
               state.type === 'cellular' ? 'cellular' : 'none',
        isInternetReachable: state.isInternetReachable ?? false,
        lastChecked: new Date().toISOString()
      };

      this.updateNetworkStatus(status);
      return status;

    } catch (error) {
      console.error('❌ Erreur vérification connectivité:', error);
      return this.currentStatus;
    }
  }

  /**
   * Mettre à jour le statut réseau
   */
  private updateNetworkStatus(status: NetworkStatus): void {
    const previousStatus = this.currentStatus;
    this.currentStatus = status;

    // Sauvegarder localement
    AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(status));

    // Notifier les listeners
    this.listeners.forEach(listener => listener(status));

    // Log des changements
    if (previousStatus.isConnected !== status.isConnected) {
      if (status.isConnected) {
        console.log('🌐 Connexion rétablie');
        this.onConnectionRestored();
      } else {
        console.log('📵 Connexion perdue');
        this.onConnectionLost();
      }
    }
  }

  /**
   * Action quand la connexion est rétablie
   */
  private async onConnectionRestored(): Promise<void> {
    try {
      // Synchroniser les données offline
      await offlineService.syncWhenOnline();
      console.log('✅ Synchronisation offline lancée');
    } catch (error) {
      console.error('❌ Erreur synchronisation post-connexion:', error);
    }
  }

  /**
   * Action quand la connexion est perdue
   */
  private async onConnectionLost(): Promise<void> {
    try {
      // Forcer le mode offline
      console.log('📵 Passage en mode offline');
    } catch (error) {
      console.error('❌ Erreur passage offline:', error);
    }
  }

  /**
   * Vérifier si on est en mode offline
   */
  async isOffline(): Promise<boolean> {
    await this.checkConnectivity();
    return !this.currentStatus.isConnected || !this.currentStatus.isInternetReachable;
  }

  /**
   * Vérifier si on est en mode online
   */
  async isOnline(): Promise<boolean> {
    await this.checkConnectivity();
    return this.currentStatus.isConnected && this.currentStatus.isInternetReachable;
  }

  /**
   * Obtenir le statut actuel
   */
  getCurrentStatus(): NetworkStatus {
    return { ...this.currentStatus };
  }

  /**
   * S'abonner aux changements de statut
   */
  addListener(listener: (status: NetworkStatus) => void): void {
    this.listeners.push(listener);
  }

  /**
   * Se désabonner des changements de statut
   */
  removeListener(listener: (status: NetworkStatus) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Tester la connectivité avec une requête simple
   */
  async testConnectivity(url: string = 'https://httpbin.org/get'): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      return response.ok;

    } catch (error) {
      console.log('🔍 Test connectivité échoué:', error);
      return false;
    }
  }

  /**
   * Attendre la reconnexion
   */
  async waitForConnection(maxWait: number = 60000): Promise<boolean> {
    return new Promise((resolve) => {
      let resolved = false;

      const checkConnection = async () => {
        if (resolved) return;
        
        const isOnline = await this.isOnline();
        if (isOnline) {
          resolved = true;
          resolve(true);
          return;
        }
      };

      // Vérification immédiate
      checkConnection();

      // Vérification périodique
      const interval = setInterval(checkConnection, 2000);

      // Timeout
      setTimeout(() => {
        if (!resolved) {
          clearInterval(interval);
          resolve(false);
        }
      }, maxWait);
    });
  }

  /**
   * Nettoyer les ressources
   */
  cleanup(): void {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
    }
    this.listeners = [];
  }
}

// Export singleton
export const networkService = new NetworkService();
