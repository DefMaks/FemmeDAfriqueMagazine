// src/services/sessionService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

// Alternative à crypto.randomUUID pour React Native
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export interface SessionData {
  session_id: string; // Format: "fam-uuid"
  user_id?: string;
  device_id: string;
  created_at: string;
  expires_at: string;
  last_activity: string;
  is_active: boolean;
  metadata?: {
    platform?: string;
    version?: string;
    app_name?: string;
  };
}

export interface SessionStats {
  session_id: string;
  age_hours: number;
  time_remaining_hours: number;
  last_activity_hours: number;
  is_valid: boolean;
}

class SessionService {
  private readonly SESSION_KEY = '@fda_session';
  private readonly SESSION_DURATION = 3 * 24 * 60 * 60 * 1000; // 3 jours en ms

  /**
   * Créer une nouvelle session
   */
  async createSession(userId?: string): Promise<SessionData> {
    try {
      const deviceId = await this.getDeviceId();
      const sessionId = `fam-${generateUUID()}`;
      const now = new Date();
      const expiresAt = new Date(now.getTime() + this.SESSION_DURATION);

      const sessionData: SessionData = {
        session_id: sessionId,
        user_id: userId,
        device_id: deviceId,
        created_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        last_activity: now.toISOString(),
        is_active: true,
        metadata: {
          platform: 'mobile',
          version: '1.0.0',
          app_name: 'FAM'
        }
      };

      // Sauvegarder localement
      await AsyncStorage.setItem(this.SESSION_KEY, JSON.stringify(sessionData));

      // Sauvegarder dans Supabase
      await supabase
        .from('user_sessions_media')
        .insert(sessionData);

      console.log('✅ Session créée:', sessionId);
      return sessionData;

    } catch (error) {
      console.error('❌ Erreur création session:', error);
      throw error;
    }
  }

  /**
   * Valider une session
   */
  async validateSession(sessionId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('user_sessions_media')
        .select('*')
        .eq('session_id', sessionId)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        return false;
      }

      const now = new Date();
      const expiresAt = new Date(data.expires_at);

      return now < expiresAt;

    } catch (error) {
      console.error('❌ Erreur validation session:', error);
      return false;
    }
  }

  /**
   * Étendre une session
   */
  async extendSession(sessionId: string): Promise<SessionData | null> {
    try {
      const isValid = await this.validateSession(sessionId);
      if (!isValid) {
        return null;
      }

      const now = new Date();
      const newExpiresAt = new Date(now.getTime() + this.SESSION_DURATION);

      const { data, error } = await supabase
        .from('user_sessions_media')
        .update({
          expires_at: newExpiresAt.toISOString(),
          last_activity: now.toISOString()
        })
        .eq('session_id', sessionId)
        .select()
        .single();

      if (error || !data) {
        throw new Error('Extension session échouée');
      }

      // Mettre à jour localement
      await AsyncStorage.setItem(this.SESSION_KEY, JSON.stringify(data));

      console.log('✅ Session étendue:', sessionId);
      return data;

    } catch (error) {
      console.error('❌ Erreur extension session:', error);
      return null;
    }
  }

  /**
   * Récupérer la session actuelle
   */
  async getCurrentSession(): Promise<SessionData | null> {
    try {
      const stored = await AsyncStorage.getItem(this.SESSION_KEY);
      if (!stored) {
        return null;
      }

      const session: SessionData = JSON.parse(stored);
      
      // Vérifier si la session est encore valide
      const isValid = await this.validateSession(session.session_id);
      if (!isValid) {
        await this.clearSession();
        return null;
      }

      return session;

    } catch (error) {
      console.error('❌ Erreur récupération session:', error);
      return null;
    }
  }

  /**
   * Supprimer la session
   */
  async clearSession(): Promise<void> {
    try {
      const session = await this.getCurrentSession();
      if (session) {
        // Désactiver dans Supabase
        await supabase
          .from('user_sessions_media')
          .update({ is_active: false })
          .eq('session_id', session.session_id);
      }

      // Supprimer localement
      await AsyncStorage.removeItem(this.SESSION_KEY);
      console.log('🗑️ Session supprimée');

    } catch (error) {
      console.error('❌ Erreur suppression session:', error);
    }
  }

  /**
   * Récupérer le device ID
   */
  private async getDeviceId(): Promise<string> {
    try {
      let deviceId = await AsyncStorage.getItem('@fda_device_id');
      
      if (!deviceId) {
        deviceId = `device-${generateUUID()}`;
        await AsyncStorage.setItem('@fda_device_id', deviceId);
      }
      
      return deviceId;
    } catch (error) {
      console.error('❌ Erreur récupération device ID:', error);
      throw error;
    }
  }

  /**
   * Vérifier si les valeurs de session sont identiques
   */
  async compareSessionValues(newSession: Partial<SessionData>): Promise<boolean> {
    try {
      const currentSession = await this.getCurrentSession();
      
      if (!currentSession) {
        return false;
      }

      // Comparer les valeurs importantes
      const isIdentical = 
        currentSession.user_id === newSession.user_id &&
        currentSession.device_id === newSession.device_id;

      console.log('🔍 Comparaison sessions:', { 
        current: currentSession.session_id,
        new: newSession.session_id,
        identical: isIdentical
      });

      return isIdentical;

    } catch (error) {
      console.error('❌ Erreur comparaison sessions:', error);
      return false;
    }
  }

  /**
   * Rafraîchir une session
   */
  async refreshSession(): Promise<boolean> {
    try {
      const session = await this.getCurrentSession();
      if (!session) {
        return false;
      }

      const now = new Date();
      const expiresAt = new Date(session.expires_at);

      if (now >= expiresAt) {
        // Session expirée
        await this.clearSession();
        return false;
      }

      const refreshedSession = await this.extendSession(session.session_id);
      return refreshedSession !== null;

    } catch (error) {
      console.error('❌ Erreur rafraîchissement session:', error);
      return false;
    }
  }

  /**
   * Obtenir les statistiques de la session
   */
  async getSessionStats(): Promise<SessionStats | null> {
    try {
      const session = await this.getCurrentSession();
      if (!session) {
        return null;
      }

      const now = new Date();
      const created = new Date(session.created_at);
      const expires = new Date(session.expires_at);
      const lastActivity = new Date(session.last_activity);

      const stats: SessionStats = {
        session_id: session.session_id,
        age_hours: (now.getTime() - created.getTime()) / (1000 * 60 * 60),
        time_remaining_hours: (expires.getTime() - now.getTime()) / (1000 * 60 * 60),
        last_activity_hours: (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60),
        is_valid: now < expires
      };

      return stats;

    } catch (error) {
      console.error('❌ Erreur stats session:', error);
      return null;
    }
  }
}

// Export singleton
export const sessionService = new SessionService();
