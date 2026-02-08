import { ONESIGNAL_CONFIG } from '../config/env';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface NotificationData {
  id?: string;
  title?: string;
  body?: string;
  data?: any;
  categoryId?: number;
  categoryName?: string;
  tagId?: number;
  tagName?: string;
}

class NotificationService {
  private static instance: NotificationService;
  private isInitialized = false;

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('📱 Initialisation OneSignal...');
      console.log('🔑 App ID:', ONESIGNAL_CONFIG.appId);

      // L'initialisation se fait via le plugin Expo
      // Les handlers seront configurés automatiquement
      
      this.isInitialized = true;
      console.log('✅ OneSignal initialisé avec succès');
    } catch (error) {
      console.error('❌ Erreur initialisation OneSignal:', error);
    }
  }

  async saveNotificationState(enabled: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem('notifications_enabled', enabled.toString());
    } catch (error) {
      console.error('❌ Erreur sauvegarde état notifications:', error);
    }
  }

  async getNotificationState(): Promise<boolean> {
    try {
      const enabled = await AsyncStorage.getItem('notifications_enabled');
      return enabled === 'true';
    } catch (error) {
      console.error('❌ Erreur lecture état notifications:', error);
      return true; // Par défaut, considérer comme activé
    }
  }

  async subscribeToCategory(categoryId: number, categoryName: string): Promise<void> {
    try {
      // Pour Expo, on utilise les tags pour la segmentation
      // Ces méthodes seront disponibles après l'initialisation du plugin
      console.log(`✅ Tentative abonnement catégorie: ${categoryName} (${categoryId})`);
      
      // TODO: Implémenter quand l'API OneSignal Expo sera disponible
      // OneSignal.sendTag('category', categoryName);
      // OneSignal.sendTag('category_id', categoryId.toString());
      
    } catch (error) {
      console.error('❌ Erreur abonnement catégorie:', error);
    }
  }

  async subscribeToTag(tagId: number, tagName: string): Promise<void> {
    try {
      console.log(`✅ Tentative abonnement tag: ${tagName} (${tagId})`);
      
      // TODO: Implémenter quand l'API OneSignal Expo sera disponible
      // OneSignal.sendTag('tag', tagName);
      // OneSignal.sendTag('tag_id', tagId.toString());
      
    } catch (error) {
      console.error('❌ Erreur abonnement tag:', error);
    }
  }

  async unsubscribeFromCategory(): Promise<void> {
    try {
      console.log('✅ Tentative désabonnement catégorie');
      
      // TODO: Implémenter quand l'API OneSignal Expo sera disponible
      // OneSignal.deleteTag('category');
      // OneSignal.deleteTag('category_id');
      
    } catch (error) {
      console.error('❌ Erreur désabonnement catégorie:', error);
    }
  }

  async unsubscribeFromTag(): Promise<void> {
    try {
      console.log('✅ Tentative désabonnement tag');
      
      // TODO: Implémenter quand l'API OneSignal Expo sera disponible
      // OneSignal.deleteTag('tag');
      // OneSignal.deleteTag('tag_id');
      
    } catch (error) {
      console.error('❌ Erreur désabonnement tag:', error);
    }
  }

  async getDeviceId(): Promise<string | null> {
    try {
      console.log('✅ Tentative récupération device ID');
      
      // TODO: Implémenter quand l'API OneSignal Expo sera disponible
      // const state = await OneSignal.getDeviceState();
      // return state.userId || null;
      
      return null;
    } catch (error) {
      console.error('❌ Erreur récupération device ID:', error);
      return null;
    }
  }

  async requestPermissions(): Promise<boolean> {
    try {
      console.log('✅ Tentative demande permissions');
      
      // TODO: Implémenter quand l'API OneSignal Expo sera disponible
      // const deviceState = await OneSignal.getDeviceState();
      // return deviceState.hasNotificationPermission;
      
      return true;
    } catch (error) {
      console.error('❌ Erreur demande permissions:', error);
      return false;
    }
  }

  // Méthode pour traiter les notifications reçues
  handleNotification(notification: NotificationData): void {
    console.log('🔔 Notification traitée:', notification);

    // Extraire les données de navigation si présentes
    if (notification.data) {
      if (notification.data.categoryId) {
        console.log(`📂 Navigation vers catégorie: ${notification.data.categoryName}`);
        // TODO: Naviguer vers la catégorie
      }
      
      if (notification.data.tagId) {
        console.log(`📂 Navigation vers tag: ${notification.data.tagName}`);
        // TODO: Naviguer vers le tag
      }
      
      if (notification.data.articleId) {
        console.log(`📂 Navigation vers article: ${notification.data.articleId}`);
        // TODO: Naviguer vers l'article
      }
    }
  }
}

export const notificationService = NotificationService.getInstance();
