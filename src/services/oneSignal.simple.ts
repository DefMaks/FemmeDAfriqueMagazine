import { ONESIGNAL_CONFIG } from '../config/env';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface OneSignalDeviceInfo {
  userId?: string;
  pushToken?: string;
  email?: string;
}

class OneSignalService {
  private isInitialized = false;

  async initialize(): Promise<void> {
    try {
      if (!ONESIGNAL_CONFIG.appId) {
        console.warn('OneSignal App ID non configuré');
        return;
      }

      // Vérifier si OneSignal SDK est disponible
      if (typeof window !== 'undefined' && window.OneSignal) {
        // Initialisation web
        window.OneSignal.init({
          appId: ONESIGNAL_CONFIG.appId,
          notifyButton: {
            enable: false,
          },
          allowLocalhostAsSecureOrigin: true,
        });
        this.isInitialized = true;
        console.log('✅ OneSignal initialisé (Web)');
      } else {
        // Pour React Native, on simule l'initialisation
        // Le vrai SDK OneSignal sera ajouté plus tard si nécessaire
        console.log('📱 OneSignal simulation (React Native)');
        this.isInitialized = true;
      }

      // Configurer les handlers
      this.setupEventHandlers();
      
    } catch (error) {
      console.error('❌ Erreur initialisation OneSignal:', error);
    }
  }

  private setupEventHandlers(): void {
    if (!this.isInitialized) return;

    try {
      // Handler pour les notifications reçues
      if (typeof window !== 'undefined' && window.OneSignal) {
        window.OneSignal.on('notificationDisplay', (event: any) => {
          console.log('📢 Notification reçue:', event);
        });

        window.OneSignal.on('notificationClick', (event: any) => {
          console.log('👆 Notification cliquée:', event);
        });
      }
    } catch (error) {
      console.error('❌ Erreur setup handlers OneSignal:', error);
    }
  }

  async requestPermission(): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      if (typeof window !== 'undefined' && window.OneSignal) {
        const permission = await window.OneSignal.getNotificationPermission();
        return permission === 'granted';
      }

      // Simulation pour React Native
      console.log('📱 Demande de permission simulée');
      return true;
    } catch (error) {
      console.error('❌ Erreur demande permission OneSignal:', error);
      return false;
    }
  }

  async getDeviceInfo(): Promise<OneSignalDeviceInfo> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      if (typeof window !== 'undefined' && window.OneSignal) {
        const deviceState = await window.OneSignal.getDeviceState();
        return {
          userId: deviceState.userId,
          pushToken: deviceState.pushToken,
        };
      }

      // Simulation pour React Native - on utilise AsyncStorage
      const savedInfo = await AsyncStorage.getItem('oneSignal_device_info');
      if (savedInfo) {
        return JSON.parse(savedInfo);
      }

      // Générer un ID simulé pour le développement
      const simulatedInfo: OneSignalDeviceInfo = {
        userId: `sim_${Date.now()}`,
        pushToken: `token_${Date.now()}`,
      };

      await AsyncStorage.setItem('oneSignal_device_info', JSON.stringify(simulatedInfo));
      return simulatedInfo;
    } catch (error) {
      console.error('❌ Erreur récupération info OneSignal:', error);
      return {};
    }
  }

  async setTag(key: string, value: string): Promise<void> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      if (typeof window !== 'undefined' && window.OneSignal) {
        await window.OneSignal.sendTag(key, value);
      } else {
        // Simulation pour React Native
        const tags = await this.getTags();
        tags[key] = value;
        await AsyncStorage.setItem('oneSignal_tags', JSON.stringify(tags));
        console.log(`🏷️ Tag OneSignal simulé: ${key} = ${value}`);
      }
    } catch (error) {
      console.error('❌ Erreur setTag OneSignal:', error);
    }
  }

  async getTags(): Promise<{ [key: string]: string }> {
    try {
      if (typeof window !== 'undefined' && window.OneSignal) {
        return await window.OneSignal.getTags();
      }

      // Simulation pour React Native
      const tags = await AsyncStorage.getItem('oneSignal_tags');
      return tags ? JSON.parse(tags) : {};
    } catch (error) {
      console.error('❌ Erreur getTags OneSignal:', error);
      return {};
    }
  }

  async setEmail(email: string): Promise<void> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      if (typeof window !== 'undefined' && window.OneSignal) {
        await window.OneSignal.setEmail(email);
      } else {
        // Simulation pour React Native
        await AsyncStorage.setItem('oneSignal_email', email);
        console.log(`📧 Email OneSignal simulé: ${email}`);
      }
    } catch (error) {
      console.error('❌ Erreur setEmail OneSignal:', error);
    }
  }

  async logout(): Promise<void> {
    try {
      if (typeof window !== 'undefined' && window.OneSignal) {
        await window.OneSignal.logout();
      } else {
        // Simulation pour React Native
        await AsyncStorage.multiRemove([
          'oneSignal_device_info',
          'oneSignal_tags',
          'oneSignal_email'
        ]);
        console.log('👋 OneSignal logout simulé');
      }
    } catch (error) {
      console.error('❌ Erreur logout OneSignal:', error);
    }
  }

  isReady(): boolean {
    return this.isInitialized;
  }
}

// Export singleton
export const oneSignalService = new OneSignalService();

// Types pour le support web
declare global {
  interface Window {
    OneSignal?: any;
  }
}
