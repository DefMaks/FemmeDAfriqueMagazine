// src/services/profileService.ts
// Service d'authentification et de gestion de profil unifié (Femme d'Afrique Mobile & Web)
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, getDeviceId } from '../lib/supabase';

export interface UserSubscription {
  id?: string;
  plan: 'monthly' | 'yearly' | string;
  status: 'active' | 'pending' | 'expired' | 'cancelled' | string;
  ends_at: string | null;
  started_at?: string | null;
  auto_renew?: boolean;
}

export interface UserProfile {
  id?: string; // Supabase auth.users UUID
  device_id: string;
  username: string;
  email?: string;
  profile_data: {
    theme?: 'light' | 'dark';
    language?: 'fr' | 'en';
    notifications?: boolean;
    email?: string;
    phone?: string;
    social_x?: string;
    social_fb?: string;
    profile_photo?: {
      url: string;
      uuid?: string;
      filename?: string;
    };
    stats?: {
      articles_read?: number;
      articles_saved?: number;
      active_days?: number;
      purchases?: number;
    };
    reading_preferences?: {
      font_size?: 'small' | 'medium' | 'large';
      auto_download?: boolean;
    };
  };
  subscription?: UserSubscription | null;
  created_at?: string;
  updated_at?: string;
  last_sync?: string;
  app_name?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export class ProfileService {
  private readonly STORAGE_KEY = '@fda_user_profile';
  private readonly PREFS_KEY = '@fda_user_preferences';
  private readonly CACHE_TTL = 2 * 60 * 1000; // 2 minutes
  private profileCache: UserProfile | null = null;
  private cacheTimestamp: number = 0;
  private syncTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.startAutoSync();
  }

  /**
   * Traduire et normaliser les erreurs Supabase Auth
   */
  private formatAuthError(error: any): string {
    const msg = error?.message || '';
    if (msg.includes('Invalid login credentials')) {
      return 'Adresse e-mail ou mot de passe incorrect.';
    }
    if (msg.includes('Email not confirmed')) {
      return 'Veuillez confirmer votre adresse e-mail via le lien reçu avant de vous connecter.';
    }
    if (msg.includes('User already registered')) {
      return 'Un compte existe déjà avec cette adresse e-mail. Veuillez vous connecter.';
    }
    if (msg.includes('Password should be at least')) {
      return 'Le mot de passe doit comporter au moins 6 caractères.';
    }
    if (msg.includes('rate limit')) {
      return 'Trop de tentatives consécutives. Veuillez patienter un instant.';
    }
    return msg || 'Une erreur est survenue lors de l\'authentification.';
  }

  /**
   * Récupérer les préférences locales
   */
  private async getLocalPreferences(): Promise<UserProfile['profile_data']> {
    try {
      const stored = await AsyncStorage.getItem(this.PREFS_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn('⚠️ Erreur lecture préférences locales:', e);
    }
    return {
      theme: 'light',
      language: 'fr',
      notifications: true,
      reading_preferences: {
        font_size: 'medium',
        auto_download: false,
      },
      stats: {
        articles_read: 0,
        articles_saved: 0,
        active_days: 1,
        purchases: 0,
      },
    };
  }

  /**
   * Sauvegarder les préférences locales
   */
  private async saveLocalPreferences(prefs: UserProfile['profile_data']): Promise<void> {
    try {
      await AsyncStorage.setItem(this.PREFS_KEY, JSON.stringify(prefs));
    } catch (e) {
      console.warn('⚠️ Erreur sauvegarde préférences locales:', e);
    }
  }

  /**
   * Vérifier et récupérer l'abonnement actif d'un utilisateur
   */
  private async fetchActiveSubscription(userId: string): Promise<UserSubscription | null> {
    try {
      const { data: subs, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(3);

      if (error || !subs || subs.length === 0) return null;

      const now = Date.now();
      const active = subs.find(
        (s: any) => s.status === 'active' && s.ends_at && new Date(s.ends_at).getTime() > now
      );

      if (active) {
        return {
          id: active.id,
          plan: active.plan,
          status: active.status,
          ends_at: active.ends_at,
          started_at: active.started_at,
          auto_renew: active.auto_renew,
        };
      }
      return null;
    } catch (e) {
      console.warn('⚠️ Erreur récupération abonnement:', e);
      return null;
    }
  }

  /**
   * Récupérer ou initialiser la ligne profil dans public.profiles
   */
  private async ensureDbProfile(userId: string, email: string, fullName?: string): Promise<any> {
    try {
      const { data: existing } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (existing) {
        // Mettre à jour full_name si fourni et absent
        if (fullName && !existing.full_name) {
          await supabase.from('profiles').update({ full_name: fullName }).eq('id', userId);
          existing.full_name = fullName;
        }
        return existing;
      }

      const newRow = {
        id: userId,
        email,
        full_name: fullName || email.split('@')[0],
      };
      const { data: created } = await supabase
        .from('profiles')
        .insert(newRow)
        .select('*')
        .maybeSingle();

      return created || newRow;
    } catch (e) {
      console.warn('⚠️ Erreur synchronisation public.profiles:', e);
      return null;
    }
  }

  /**
   * Authentifier un utilisateur (Unifié avec femmedafrique-revive Web)
   */
  async login(credentials: LoginCredentials): Promise<UserProfile> {
    try {
      const cleanEmail = credentials.email.trim().toLowerCase();
      const cleanPassword = credentials.password;

      if (!cleanEmail || !cleanPassword) {
        throw new Error('Veuillez renseigner un email et un mot de passe.');
      }

      console.log('🔐 Connexion utilisateur Supabase Auth:', cleanEmail);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPassword,
      });

      if (error) {
        console.error('❌ Erreur Supabase auth.signInWithPassword:', error.message);
        throw new Error(this.formatAuthError(error));
      }

      const user = data.user;
      if (!user) {
        throw new Error('Session invalide reçue de Supabase.');
      }

      const deviceId = await getDeviceId();
      const localPrefs = await this.getLocalPreferences();

      // Synchroniser avec public.profiles
      const fullName = (user.user_metadata as any)?.full_name || cleanEmail.split('@')[0];
      const dbProfile = await this.ensureDbProfile(user.id, cleanEmail, fullName);

      // Récupérer l'abonnement actif (harmonisé Web)
      const subscription = await this.fetchActiveSubscription(user.id);

      const username = dbProfile?.full_name || fullName;
      const phone = dbProfile?.phone || localPrefs.phone || '';

      const userProfile: UserProfile = {
        id: user.id,
        device_id: deviceId,
        username,
        email: user.email || cleanEmail,
        profile_data: {
          ...localPrefs,
          email: user.email || cleanEmail,
          phone,
        },
        subscription,
        created_at: user.created_at,
        updated_at: new Date().toISOString(),
        last_sync: new Date().toISOString(),
        app_name: 'FAM',
      };

      await this.saveProfileLocally(userProfile);
      this.profileCache = userProfile;
      this.cacheTimestamp = Date.now();

      console.log('✅ Utilisateur connecté avec succès:', user.id, 'Abonnement:', subscription?.status || 'aucun');
      return userProfile;

    } catch (error: any) {
      console.error('❌ Erreur login:', error);
      throw error;
    }
  }

  /**
   * Créer un profil utilisateur (Unifié avec femmedafrique-revive Web)
   */
  async createProfile(username: string, email: string, password: string): Promise<UserProfile> {
    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanUsername = username.trim();

      if (!cleanEmail || !cleanUsername || !password) {
        throw new Error('Veuillez remplir tous les champs.');
      }

      console.log('👤 Inscription utilisateur Supabase Auth:', cleanEmail);
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: cleanUsername,
          },
        },
      });

      if (error) {
        console.error('❌ Erreur Supabase auth.signUp:', error.message);
        throw new Error(this.formatAuthError(error));
      }

      const user = data.user;
      if (!user) {
        throw new Error('Inscription réussie mais aucun compte renvoyé.');
      }

      const deviceId = await getDeviceId();
      const localPrefs = await this.getLocalPreferences();

      // Si la session est ouverte immédiatement, créer la ligne profiles
      if (data.session) {
        await this.ensureDbProfile(user.id, cleanEmail, cleanUsername);
      }

      const userProfile: UserProfile = {
        id: user.id,
        device_id: deviceId,
        username: cleanUsername,
        email: cleanEmail,
        profile_data: {
          ...localPrefs,
          email: cleanEmail,
        },
        subscription: null,
        created_at: user.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_sync: new Date().toISOString(),
        app_name: 'FAM',
      };

      await this.saveProfileLocally(userProfile);
      this.profileCache = userProfile;
      this.cacheTimestamp = Date.now();

      console.log('✅ Compte utilisateur créé avec succès:', user.id);
      return userProfile;

    } catch (error: any) {
      console.error('❌ Erreur createProfile:', error);
      throw error;
    }
  }

  /**
   * Alias de rétrocompatibilité pour createProfile
   */
  async createProfileNormal(username: string, email: string, password: string): Promise<UserProfile> {
    return this.createProfile(username, email, password);
  }

  /**
   * Alias de rétrocompatibilité pour createProfileViaAgent
   */
  async createProfileViaAgent(username: string, email: string, password: string): Promise<UserProfile> {
    return this.createProfile(username, email, password);
  }

  /**
   * Récupérer le profil courant (Session Supabase + cache local)
   */
  async getCurrentProfile(): Promise<UserProfile | null> {
    try {
      const now = Date.now();
      if (this.profileCache && (now - this.cacheTimestamp) < this.CACHE_TTL) {
        return this.profileCache;
      }

      // Vérifier le profil sauvegardé localement d'abord (pour un rendu instantané)
      const local = await this.getProfileLocally();

      // Vérifier la session Supabase
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;

      if (!user) {
        // Aucune session Supabase active
        if (local && local.email) {
          // L'utilisateur s'était connecté auparavant mais la session a expiré
          this.profileCache = local;
          this.cacheTimestamp = now;
          return local;
        }
        this.profileCache = null;
        return null;
      }

      // Session active trouvée : rafraîchir les données
      const deviceId = await getDeviceId();
      const localPrefs = await this.getLocalPreferences();
      const dbProfile = await this.ensureDbProfile(
        user.id,
        user.email || '',
        (user.user_metadata as any)?.full_name || local?.username
      );
      const subscription = await this.fetchActiveSubscription(user.id);

      const username = dbProfile?.full_name || (user.user_metadata as any)?.full_name || user.email?.split('@')[0] || 'Lecteur FDA';
      const phone = dbProfile?.phone || local?.profile_data?.phone || localPrefs.phone || '';

      const updatedProfile: UserProfile = {
        id: user.id,
        device_id: deviceId,
        username,
        email: user.email,
        profile_data: {
          ...localPrefs,
          ...(local?.profile_data || {}),
          email: user.email,
          phone,
        },
        subscription: subscription || local?.subscription || null,
        created_at: user.created_at,
        updated_at: new Date().toISOString(),
        last_sync: new Date().toISOString(),
        app_name: 'FAM',
      };

      await this.saveProfileLocally(updatedProfile);
      this.profileCache = updatedProfile;
      this.cacheTimestamp = now;

      return updatedProfile;

    } catch (error) {
      console.warn('⚠️ Erreur getCurrentProfile (fallback local utilisé):', error);
      return await this.getProfileLocally();
    }
  }

  /**
   * Sauvegarder le profil localement
   */
  async saveProfileLocally(profile: UserProfile): Promise<void> {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(profile));
    } catch (error) {
      console.error('❌ Erreur sauvegarde profil local:', error);
    }
  }

  /**
   * Récupérer le profil localement
   */
  async getProfileLocally(): Promise<UserProfile | null> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('❌ Erreur récupération profil local:', error);
      return null;
    }
  }

  /**
   * Déconnexion complète (Supabase + Local)
   */
  async logout(): Promise<void> {
    try {
      console.log('🚪 Déconnexion utilisateur...');
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('⚠️ Erreur supabase.auth.signOut:', e);
    } finally {
      this.profileCache = null;
      this.cacheTimestamp = 0;
      await AsyncStorage.removeItem(this.STORAGE_KEY);
      console.log('✅ Déconnexion terminée');
    }
  }

  /**
   * Mettre à jour les préférences de profil
   */
  async updatePreferences(preferences: Partial<UserProfile['profile_data']>): Promise<void> {
    try {
      const current = await this.getCurrentProfile();
      const localPrefs = await this.getLocalPreferences();

      const updatedPrefs: UserProfile['profile_data'] = {
        ...localPrefs,
        ...(current?.profile_data || {}),
        ...preferences,
      };

      await this.saveLocalPreferences(updatedPrefs);

      if (current) {
        current.profile_data = updatedPrefs;
        current.updated_at = new Date().toISOString();
        await this.saveProfileLocally(current);
        this.profileCache = current;

        // Si l'utilisateur est authentifié et que le téléphone ou nom change, synchroniser avec DB
        if (current.id) {
          const updates: Record<string, any> = { updated_at: new Date().toISOString() };
          if (preferences.phone !== undefined) updates.phone = preferences.phone;
          if (current.username) updates.full_name = current.username;

          await supabase
            .from('profiles')
            .update(updates)
            .eq('id', current.id);
        }
      }

      console.log('✅ Préférences mises à jour avec succès');
    } catch (error) {
      console.error('❌ Erreur mise à jour préférences:', error);
      throw error;
    }
  }

  /**
   * Synchroniser le profil
   */
  async syncProfile(): Promise<{ success: boolean; message: string }> {
    try {
      const profile = await this.getCurrentProfile();
      if (!profile || !profile.id) {
        return { success: false, message: 'Aucun profil actif à synchroniser' };
      }

      // Rafraîchir l'abonnement
      const sub = await this.fetchActiveSubscription(profile.id);
      if (sub) {
        profile.subscription = sub;
        await this.saveProfileLocally(profile);
      }

      return { success: true, message: 'Profil synchronisé avec succès' };
    } catch (error) {
      console.warn('⚠️ Erreur synchronisation profil:', error);
      return { success: false, message: 'Erreur de synchronisation' };
    }
  }

  /**
   * Démarrer la synchronisation automatique en arrière-plan
   */
  private startAutoSync(): void {
    if (this.syncTimer) clearInterval(this.syncTimer);

    this.syncTimer = setInterval(async () => {
      try {
        await this.syncProfile();
      } catch (error) {
        // Silencieux en tâche de fond
      }
    }, 30 * 60 * 1000); // 30 minutes
  }

  /**
   * Arrêter la synchronisation automatique
   */
  stopAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }
}

// Export singleton
export const profileService = new ProfileService();
