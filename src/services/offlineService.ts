// src/services/offlineService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

// Service pour gérer le mode offline et la persistance des données
export interface OfflineStorage {
  posts: any[];
  categories: any[];
  magazines: any[];
  lastSync: string;
  version: string;
}

export interface OfflineConfig {
  maxStorageAge: number; // en millisecondes
  maxItemsPerType: number;
  enableCompression: boolean;
}

class OfflineService {
  private readonly STORAGE_KEY = '@fda_offline_data';
  private readonly CONFIG: OfflineConfig = {
    maxStorageAge: 24 * 60 * 60 * 1000, // 24 heures
    maxItemsPerType: 200,
    enableCompression: false
  };

  /**
   * Sauvegarder les posts pour le mode offline
   */
  async savePostsOffline(posts: any[]): Promise<void> {
    try {
      const offlineData = await this.getOfflineData();
      
      // Limiter le nombre d'articles pour éviter de surcharger le stockage
      const limitedPosts = posts.slice(0, this.CONFIG.maxItemsPerType);
      
      offlineData.posts = limitedPosts;
      offlineData.lastSync = new Date().toISOString();
      
      await this.saveOfflineData(offlineData);
      console.log(`💾 ${limitedPosts.length} posts sauvegardés pour mode offline`);
      
    } catch (error) {
      console.error('❌ Erreur sauvegarde posts offline:', error);
    }
  }

  /**
   * Sauvegarder les catégories pour le mode offline
   */
  async saveCategoriesOffline(categories: any[]): Promise<void> {
    try {
      const offlineData = await this.getOfflineData();
      offlineData.categories = categories;
      offlineData.lastSync = new Date().toISOString();
      
      await this.saveOfflineData(offlineData);
      console.log(`💾 ${categories.length} catégories sauvegardées pour mode offline`);
      
    } catch (error) {
      console.error('❌ Erreur sauvegarde catégories offline:', error);
    }
  }

  /**
   * Sauvegarder les magazines pour le mode offline
   */
  async saveMagazinesOffline(magazines: any[]): Promise<void> {
    try {
      const offlineData = await this.getOfflineData();
      
      // Limiter le nombre de magazines
      const limitedMagazines = magazines.slice(0, this.CONFIG.maxItemsPerType);
      
      offlineData.magazines = limitedMagazines;
      offlineData.lastSync = new Date().toISOString();
      
      await this.saveOfflineData(offlineData);
      console.log(`💾 ${limitedMagazines.length} magazines sauvegardés pour mode offline`);
      
    } catch (error) {
      console.error('❌ Erreur sauvegarde magazines offline:', error);
    }
  }

  /**
   * Récupérer les posts sauvegardés offline
   */
  async getOfflinePosts(): Promise<any[]> {
    try {
      const offlineData = await this.getOfflineData();
      
      // Vérifier si les données sont encore valides
      if (this.isDataValid(offlineData.lastSync)) {
        console.log(`📂 ${offlineData.posts?.length || 0} posts depuis stockage offline`);
        return offlineData.posts || [];
      }
      
      console.log('⏰ Données offline expirées');
      return [];
      
    } catch (error) {
      console.error('❌ Erreur récupération posts offline:', error);
      return [];
    }
  }

  /**
   * Récupérer les catégories sauvegardées offline
   */
  async getOfflineCategories(): Promise<any[]> {
    try {
      const offlineData = await this.getOfflineData();
      
      if (this.isDataValid(offlineData.lastSync)) {
        console.log(`📂 ${offlineData.categories?.length || 0} catégories depuis stockage offline`);
        return offlineData.categories || [];
      }
      
      return [];
      
    } catch (error) {
      console.error('❌ Erreur récupération catégories offline:', error);
      return [];
    }
  }

  /**
   * Récupérer les magazines sauvegardés offline
   */
  async getOfflineMagazines(): Promise<any[]> {
    try {
      const offlineData = await this.getOfflineData();
      
      if (this.isDataValid(offlineData.lastSync)) {
        console.log(`📂 ${offlineData.magazines?.length || 0} magazines depuis stockage offline`);
        return offlineData.magazines || [];
      }
      
      return [];
      
    } catch (error) {
      console.error('❌ Erreur récupération magazines offline:', error);
      return [];
    }
  }

  /**
   * Obtenir toutes les données offline
   */
  private async getOfflineData(): Promise<OfflineStorage> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
      
      if (stored) {
        return JSON.parse(stored);
      }
      
      return this.getDefaultOfflineData();
      
    } catch (error) {
      console.error('❌ Erreur lecture données offline:', error);
      return this.getDefaultOfflineData();
    }
  }

  /**
   * Sauvegarder les données offline
   */
  private async saveOfflineData(data: OfflineStorage): Promise<void> {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('❌ Erreur sauvegarde données offline:', error);
    }
  }

  /**
   * Obtenir les données par défaut
   */
  private getDefaultOfflineData(): OfflineStorage {
    return {
      posts: [],
      categories: [],
      magazines: [],
      lastSync: new Date().toISOString(),
      version: '1.0.0'
    };
  }

  /**
   * Vérifier si les données sont encore valides
   */
  private isDataValid(lastSync: string): boolean {
    const syncTime = new Date(lastSync).getTime();
    const now = Date.now();
    const age = now - syncTime;
    
    return age < this.CONFIG.maxStorageAge;
  }

  /**
   * Nettoyer les anciennes données offline
   */
  async clearOfflineData(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.STORAGE_KEY);
      console.log('🗑️ Données offline supprimées');
    } catch (error) {
      console.error('❌ Erreur nettoyage données offline:', error);
    }
  }

  /**
   * Obtenir l'espace de stockage utilisé
   */
  async getStorageInfo(): Promise<{ size: number; items: number }> {
    try {
      const data = await this.getOfflineData();
      const jsonString = JSON.stringify(data);
      
      return {
        size: new Blob([jsonString]).size, // Taille en bytes
        items: (data.posts?.length || 0) + 
                (data.categories?.length || 0) + 
                (data.magazines?.length || 0)
      };
    } catch (error) {
      console.error('❌ Erreur calcul espace stockage:', error);
      return { size: 0, items: 0 };
    }
  }

  /**
   * Vérifier si le mode offline est activé
   */
  async isOfflineMode(): Promise<boolean> {
    try {
      const data = await this.getOfflineData();
      const hasData = data.posts.length > 0 || 
                    data.categories.length > 0 || 
                    data.magazines.length > 0;
      
      return hasData && this.isDataValid(data.lastSync);
    } catch (error) {
      return false;
    }
  }

  /**
   * Synchroniser les données avec le serveur (quand connexion disponible)
   */
  async syncWhenOnline(): Promise<void> {
    try {
      console.log('🔄 Synchronisation des données offline...');
      
      // Cette fonction sera appelée quand la connexion revient
      // pour synchroniser les données modifiées offline
      
      // Pour l'instant, on nettoie juste les anciennes données
      const data = await this.getOfflineData();
      if (!this.isDataValid(data.lastSync)) {
        await this.clearOfflineData();
        console.log('🗑️ Nettoyage données offline expirées');
      }
      
    } catch (error) {
      console.error('❌ Erreur synchronisation:', error);
    }
  }
}

// Export singleton
export const offlineService = new OfflineService();
