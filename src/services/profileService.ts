// src/services/profileService.ts
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import bcrypt from 'react-native-bcrypt';
import { getDeviceId } from '../lib/supabase';

// Configurer le fallback crypto pour React Native
if (bcrypt && typeof bcrypt.setRandomFallback === 'function') {
  bcrypt.setRandomFallback((len: number): number[] => {
    const randomBytes = new Array(len);
    for (let i = 0; i < len; i++) {
      randomBytes[i] = Math.floor(Math.random() * 256);
    }
    return randomBytes;
  });
}

// Identifiants de l'agent pour contourner RLS
const AGENT_EMAIL = process.env.EXPO_PUBLIC_AGENT || 'agent@defmaks.com';
const AGENT_PASSWORD = process.env.EXPO_PUBLIC_AGENT_PASS || 'DefMaks!';

// Interfaces
export interface UserProfile {
  id?: string;
  device_id: string;
  username: string;
  email?: string;
  password_hash?: string;
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
      uuid: string;
      filename: string;
    };
    stats?: {
      articles_read?: number;
      articles_saved?: number;
      active_days?: number;
    };
    reading_preferences?: {
      font_size?: 'small' | 'medium' | 'large';
      auto_download?: boolean;
    };
  };
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
  private readonly SYNC_INTERVAL = 30 * 60 * 1000; // 30 minutes
  private syncTimer: NodeJS.Timeout | null = null;
  private profileCache: UserProfile | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_TTL = 2 * 60 * 1000; // 2 minutes de cache

  constructor() {
    this.startAutoSync();
  }

  /**
   * Créer un profil utilisateur via la session agent (contourne RLS)
   */
  async createProfileViaAgent(username: string, email: string, password: string): Promise<UserProfile> {
    try {
      console.log('🔐 Connexion en tant qu\'agent pour contourner RLS...');
      
      // 1. Se connecter en tant qu'agent
      const { data: agentData, error: agentError } = await supabase.auth.signInWithPassword({
        email: AGENT_EMAIL,
        password: AGENT_PASSWORD,
      });

      if (agentError) {
        console.error('❌ Erreur connexion agent:', agentError);
        console.warn('⚠️ Agent non disponible, création profil temporaire local...');
        
        // Fallback: créer un profil temporaire local
        return await this.createTemporaryProfile(username, email, password);
      }

      console.log('✅ Agent connecté avec succès');

      try {
        // 2. Créer le profil utilisateur sous la session agent
        const deviceId = await getDeviceId();
        
        // Hasher le mot de passe
        console.log('🔍 Type du password:', typeof password);
        console.log('🔍 Valeur du password:', password);
        console.log('🔍 Longueur du password:', password?.length);
        
        if (!password || typeof password !== 'string') {
          throw new Error('Le mot de passe doit être une chaîne de caractères non vide');
        }
        
        const trimmedPassword = String(password).trim();
        if (trimmedPassword === '') {
          throw new Error('Le mot de passe ne peut pas être vide');
        }
        
        // Validation supplémentaire pour bcrypt
        if (trimmedPassword.length > 72) {
          throw new Error('Le mot de passe est trop long (max 72 caractères)');
        }
        
        // S'assurer que le password est une string pure
        const cleanPassword = trimmedPassword.replace(/[^\x00-\x7F]/g, '');
        if (cleanPassword.length !== trimmedPassword.length) {
          console.warn('⚠️ Caractères non-ASCII détectés, nettoyage appliqué');
        }
        
        console.log('🔍 Password final à hasher:', cleanPassword);
        console.log('🔍 Type final:', typeof cleanPassword);
        console.log('🔍 Longueur finale:', cleanPassword.length);
        
        let passwordHash: string;
        try {
          // Utiliser genSalt puis hash pour plus de contrôle
          const salt = await bcrypt.genSalt(10);
          console.log('✅ Salt généré:', typeof salt, salt.length);
          
          passwordHash = await bcrypt.hashSync(cleanPassword, salt);
          console.log('✅ Password hashé avec succès, longueur:', passwordHash.length);
          console.log('✅ Type du hash:', typeof passwordHash);
          
          // Validation du hash
          if (!passwordHash || typeof passwordHash !== 'string' || passwordHash.length < 50) {
            throw new Error('Hash invalide généré');
          }
          
        } catch (bcryptError: any) {
          console.error('❌ Erreur bcrypt.hash:', bcryptError);
          console.error('❌ Détails erreur:', {
            name: bcryptError.name,
            message: bcryptError.message,
            stack: bcryptError.stack
          });
          throw new Error(`Erreur de hashage: ${bcryptError.message}`);
        }

        const profileData = {
          device_id: deviceId,
          username,
          email,
          password_hash: passwordHash,
          profile_data: {
            theme: 'light',
            language: 'fr',
            notifications: true,
            reading_preferences: {
              font_size: 'medium',
              auto_download: false
            }
          },
          app_name: 'FAM'
        };

        console.log('👤 Création profil utilisateur via agent:', { deviceId, username });
        
        // 3. Insérer le profil utilisateur sous la session agent
        const { data, error } = await supabase
          .from('user_profile_media')
          .insert(profileData)
          .select()
          .single();

        if (error) {
          console.error('❌ Erreur création profil via agent:', error);
          throw new Error(`Erreur création profil: ${error.message}`);
        }

        console.log('✅ Profil utilisateur créé avec succès via agent');

        // 4. Se déconnecter de l'agent
        await supabase.auth.signOut();
        console.log('🔐 Déconnexion de l\'agent');

        // 5. Sauvegarder localement
        const localProfile = { ...data, password_hash: passwordHash };
        await this.saveProfileLocally(localProfile);

        // 6. Invalider le cache
        this.profileCache = data;
        this.cacheTimestamp = Date.now();

        console.log('✅ Profil créé avec succès:', data.id);
        return data;

      } catch (profileError) {
        // S'assurer de se déconnecter de l'agent même en cas d'erreur
        try {
          await supabase.auth.signOut();
          console.log('🔐 Déconnexion de l\'agent (erreur)');
        } catch (logoutError) {
          console.error('❌ Erreur déconnexion agent:', logoutError);
        }
        throw profileError;
      }

    } catch (error) {
      console.error('❌ Erreur création profil via agent:', error);
      throw error;
    }
  }

  /**
   * Authentifier un utilisateur
   */
  async login(credentials: LoginCredentials): Promise<UserProfile> {
    try {
      const deviceId = await getDeviceId();
      
      console.log('🔐 Tentative de connexion:', credentials.email);

      // 1. Récupérer le profil depuis Supabase par email
      const { data: profile, error } = await supabase
        .from('user_profile_media')
        .select('*')
        .eq('email', credentials.email)
        .maybeSingle();

      if (error) {
        console.error('❌ Erreur recherche profil:', error);
        throw new Error('Erreur lors de la recherche du profil');
      }

      if (!profile) {
        throw new Error('Aucun compte trouvé avec cet email');
      }

      // 2. Vérifier le mot de passe
      console.log('🔍 Type du password dans login:', typeof credentials.password);
      console.log('🔍 Valeur du password dans login:', credentials.password);
      console.log('🔍 Type du password_hash dans DB:', typeof profile.password_hash);
      
      if (!credentials.password || typeof credentials.password !== 'string') {
        throw new Error('Le mot de passe doit être une chaîne de caractères non vide');
      }
      
      const trimmedPassword = String(credentials.password).trim();
      if (trimmedPassword === '') {
        throw new Error('Le mot de passe ne peut pas être vide');
      }
      
      // Validation supplémentaire pour bcrypt
      if (trimmedPassword.length > 72) {
        throw new Error('Le mot de passe est trop long (max 72 caractères)');
      }
      
      // S'assurer que le password est une string pure
      const cleanPassword = trimmedPassword.replace(/[^\x00-\x7F]/g, '');
      if (cleanPassword.length !== trimmedPassword.length) {
        console.warn('⚠️ Caractères non-ASCII détectés, nettoyage appliqué');
      }
      
      console.log('🔍 Password final à comparer:', cleanPassword);
      console.log('🔍 Hash de la DB:', profile.password_hash?.substring(0, 20) + '...');
      
      // Validation du hash dans la DB
      if (!profile.password_hash || typeof profile.password_hash !== 'string' || profile.password_hash.length < 50) {
        throw new Error('Hash de mot de passe invalide dans la base de données');
      }
      
      let passwordMatch: boolean;
      try {
        passwordMatch = bcrypt.compareSync(cleanPassword, profile.password_hash);
        console.log('🔍 Résultat comparaison passwords:', passwordMatch);
      } catch (bcryptError: any) {
        console.error('❌ Erreur bcrypt.compare:', bcryptError);
        console.error('❌ Détails erreur:', {
          name: bcryptError.name,
          message: bcryptError.message,
          stack: bcryptError.stack
        });
        throw new Error(`Erreur de comparaison: ${bcryptError.message}`);
      }
      
      if (!passwordMatch) {
        throw new Error('Mot de passe incorrect');
      }

      // 3. Vérifier et gérer le changement de device_id
      if (profile.device_id !== deviceId) {
        console.warn('🔄 Changement de device_id détecté:', {
          old: profile.device_id,
          new: deviceId
        });
        
        // Mettre à jour le device_id
        const { error: updateError } = await supabase
          .from('user_profile_media')
          .update({ 
            device_id: deviceId,
            updated_at: new Date().toISOString(),
            last_seen: new Date().toISOString()
          })
          .eq('id', profile.id);
          
        if (updateError) {
          console.error('❌ Erreur mise à jour device_id:', updateError);
        } else {
          console.log('✅ Device_id mis à jour');
          profile.device_id = deviceId;
        }
      }

      // 4. Mettre à jour last_seen
      await supabase
        .from('user_profile_media')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', profile.id);

      // 5. Sauvegarder localement
      const localProfile = { ...profile, last_seen: new Date().toISOString() };
      await this.saveProfileLocally(localProfile);

      // 6. Invalider le cache
      this.profileCache = localProfile;
      this.cacheTimestamp = Date.now();

      console.log('✅ Connexion réussie pour:', profile.email);
      return localProfile;

    } catch (error) {
      console.error('❌ Erreur connexion:', error);
      throw error;
    }
  }

  /**
   * Créer un profil temporaire local (quand RLS et agent échouent)
   */
  async createTemporaryProfile(username: string, email: string, password: string): Promise<UserProfile> {
    try {
      console.log('📦 Création profil temporaire local...');
      
      const deviceId = await getDeviceId();
      
      // Hasher le mot de passe
      const trimmedPassword = String(password).trim();
      if (trimmedPassword === '') {
        throw new Error('Le mot de passe ne peut pas être vide');
      }
      
      const cleanPassword = trimmedPassword.replace(/[^\x00-\x7F]/g, '');
      const salt = await bcrypt.genSalt(10);
      const passwordHash = bcrypt.hashSync(cleanPassword, salt);
      
      // Créer un profil local avec ID temporaire
      const tempProfile: UserProfile = {
        id: `temp_${Date.now()}`,
        device_id: deviceId,
        username,
        email,
        password_hash: passwordHash,
        profile_data: {
          theme: 'light',
          language: 'fr',
          notifications: true,
          reading_preferences: {
            font_size: 'medium',
            auto_download: false
          }
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_sync: new Date().toISOString(),
        app_name: 'FAM'
      };
      
      // Sauvegarder localement
      await this.saveProfileLocally(tempProfile);
      
      // Mettre en cache
      this.profileCache = tempProfile;
      this.cacheTimestamp = Date.now();
      
      console.log('✅ Profil temporaire créé localement:', tempProfile.id);
      console.log('ℹ️ Le profil sera synchronisé quand RLS/Agent sera configuré');
      
      return tempProfile;
      
    } catch (error) {
      console.error('❌ Erreur création profil temporaire:', error);
      throw error;
    }
  }

  /**
   * Créer un nouveau profil utilisateur
   */
  async createProfile(username: string, email: string, password: string): Promise<UserProfile> {
    try {
      // Essai normal d'abord
      try {
        return await this.createProfileNormal(username, email, password);
      } catch (error: any) {
        // Si erreur RLS, utiliser la méthode via agent
        if (error.message?.includes('row-level security policy') || error.code === '42501') {
          console.warn('⚠️ RLS bloquant, utilisation de la session agent...');
          return await this.createProfileViaAgent(username, email, password);
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error('❌ Erreur création profil:', error);
      throw error;
    }
  }

  /**
   * Créer un profil utilisateur (méthode normale)
   */
  async createProfileNormal(username: string, email: string, password: string): Promise<UserProfile> {
    try {
      const deviceId = await getDeviceId();
      
      // Hasher le mot de passe
      console.log('🔍 Type du password:', typeof password);
      console.log('🔍 Valeur du password:', password);
      console.log('🔍 Longueur du password:', password?.length);
      
      if (!password || typeof password !== 'string') {
        throw new Error('Le mot de passe doit être une chaîne de caractères non vide');
      }
      
      const trimmedPassword = String(password).trim();
      if (trimmedPassword === '') {
        throw new Error('Le mot de passe ne peut pas être vide');
      }
      
      // Validation supplémentaire pour bcrypt
      if (trimmedPassword.length > 72) {
        throw new Error('Le mot de passe est trop long (max 72 caractères)');
      }
      
      // S'assurer que le password est une string pure
      const cleanPassword = trimmedPassword.replace(/[^\x00-\x7F]/g, '');
      if (cleanPassword.length !== trimmedPassword.length) {
        console.warn('⚠️ Caractères non-ASCII détectés, nettoyage appliqué');
      }
      
      console.log('🔍 Password final à hasher:', cleanPassword);
      console.log('🔍 Type final:', typeof cleanPassword);
      console.log('🔍 Longueur finale:', cleanPassword.length);
      
      let passwordHash: string;
      try {
        // Utiliser genSalt puis hash pour plus de contrôle
        const salt = await bcrypt.genSalt(10);
        console.log('✅ Salt généré:', typeof salt, salt.length);
        
        passwordHash = bcrypt.hashSync(cleanPassword, salt);
        console.log('✅ Password hashé avec succès, longueur:', passwordHash.length);
        console.log('✅ Type du hash:', typeof passwordHash);
        
        // Validation du hash
        if (!passwordHash || typeof passwordHash !== 'string' || passwordHash.length < 50) {
          throw new Error('Hash invalide généré');
        }
        
      } catch (bcryptError: any) {
        console.error('❌ Erreur bcrypt.hash:', bcryptError);
        console.error('❌ Détails erreur:', {
          name: bcryptError.name,
          message: bcryptError.message,
          stack: bcryptError.stack
        });
        throw new Error(`Erreur de hashage: ${bcryptError.message}`);
      }

      const profileData = {
        device_id: deviceId,
        username,
        email,
        password_hash: passwordHash,
        profile_data: {
          theme: 'light',
          language: 'fr',
          notifications: true,
          reading_preferences: {
            font_size: 'medium',
            auto_download: false
          }
        },
        app_name: 'FAM'
      };

      console.log('👤 Création profil utilisateur:', { deviceId, username });

      let data;
      try {
        // Essai normal d'abord
        const { data: result, error } = await supabase
          .from('user_profile_media')
          .insert(profileData)
          .select()
          .single();

        if (error) {
          console.error('❌ Erreur insertion normale:', error);
          throw error;
        } else {
          data = result;
          console.log('✅ Profil créé normalement dans Supabase');
        }
      } catch (insertError: any) {
        console.error('❌ Erreur création profil Supabase:', insertError);
        throw insertError;
      }

      // 2. Sauvegarder localement
      const localProfile = { ...data, password_hash: passwordHash };
      await this.saveProfileLocally(localProfile);

      // 3. Invalider le cache
      this.profileCache = data;
      this.cacheTimestamp = Date.now();

      console.log('✅ Profil créé avec succès:', data.id);
      return data;

    } catch (error) {
      console.error('❌ Erreur création profil:', error);
      throw error;
    }
  }

  /**
   * Récupérer le profil actuel
   */
  async getCurrentProfile(): Promise<UserProfile | null> {
    try {
      // Vérifier le cache d'abord
      const now = Date.now();
      if (this.profileCache && (now - this.cacheTimestamp) < this.CACHE_TTL) {
        console.log('📦 Utilisation du cache profil');
        return this.profileCache;
      }

      const deviceId = await getDeviceId();
      
      // Utiliser maybeSingle() au lieu de single() pour éviter PGRST116
      const { data, error } = await supabase
        .from('user_profile_media')
        .select('*')
        .eq('device_id', deviceId)
        .maybeSingle();

      if (error) {
        console.error('❌ Erreur récupération profil:', error);
        return null;
      }

      if (!data) {
        console.log('ℹ️ Aucun profil trouvé pour ce device_id:', deviceId);
        // Mettre en cache le résultat null pour éviter les appels répétifs
        this.profileCache = null;
        this.cacheTimestamp = now;
        return null;
      }

      // Mettre en cache le profil
      this.profileCache = data;
      this.cacheTimestamp = now;
      console.log('✅ Profil récupéré et mis en cache');

      return data;

    } catch (error) {
      console.error('❌ Erreur getCurrentProfile:', error);
      return null;
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
   * Démarrer la synchronisation automatique
   */
  private startAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }

    this.syncTimer = setInterval(async () => {
      try {
        await this.syncProfile();
      } catch (error) {
        console.error('❌ Erreur synchronisation automatique:', error);
      }
    }, this.SYNC_INTERVAL);

    console.log('⏰ Synchronisation automatique démarrée (30 minutes)');
  }

  /**
   * Arrêter la synchronisation automatique
   */
  stopAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
      console.log('⏹ Synchronisation automatique arrêtée');
    }
  }

  /**
   * Synchroniser le profil
   */
  async syncProfile(): Promise<{ success: boolean; message: string }> {
    try {
      const localProfile = await this.getProfileLocally();
      if (!localProfile) {
        return { success: false, message: 'Aucun profil local à synchroniser' };
      }

      const deviceId = await getDeviceId();
      const { data: remoteProfile, error } = await supabase
        .from('user_profile_media')
        .select('*')
        .eq('device_id', deviceId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (!remoteProfile) {
        // Pas de profil distant, créer le profil distant
        const { data: createdProfile, error: createError } = await supabase
          .from('user_profile_media')
          .insert(localProfile)
          .select()
          .single();

        if (createError) {
          throw createError;
        }

        await this.saveProfileLocally(createdProfile);
        return {
          success: true,
          message: 'Profil synchronisé (créé sur Supabase)'
        };
      }

      // Comparer les dates pour déterminer quel profil est plus récent
      const localTime = new Date(localProfile.last_sync || localProfile.created_at || '');
      const remoteTime = new Date(remoteProfile.last_sync || remoteProfile.created_at || '');

      if (remoteTime > localTime) {
        // Le distant est plus récent
        await this.saveProfileLocally(remoteProfile);
        return {
          success: true,
          message: 'Profil synchronisé (distant plus récent)'
        };
      } else if (localTime.getTime() > remoteTime.getTime() + 300000) { // 5 minutes de tolérance
        // Le local est plus récent (avec tolérance)
        await this.updateRemoteProfile(localProfile);
        return {
          success: true,
          message: 'Profil synchronisé (local plus récent)'
        };
      }

      return { success: true, message: 'Profil déjà synchronisé' };

    } catch (error) {
      console.error('❌ Erreur synchronisation profil:', error);
      return { success: false, message: 'Erreur de synchronisation' };
    }
  }

  /**
   * Mettre à jour les préférences du profil
   */
  async updatePreferences(preferences: Partial<UserProfile['profile_data']>): Promise<void> {
    try {
      const deviceId = await getDeviceId();
      
      // Récupérer le profil existant
      const existingProfile = await this.getCurrentProfile();
      
      if (!existingProfile) {
        throw new Error('Aucun profil trouvé');
      }

      // Fusionner les préférences
      const updatedProfileData = {
        ...existingProfile.profile_data,
        ...preferences
      };

      // Mettre à jour le profil
      const { error } = await supabase
        .from('user_profile_media')
        .update({
          profile_data: updatedProfileData,
          updated_at: new Date().toISOString()
        })
        .eq('device_id', deviceId);

      if (error) {
        throw error;
      }

      console.log('✅ Préférences mises à jour avec succès');
    } catch (error) {
      console.error('❌ Erreur mise à jour préférences:', error);
      throw error;
    }
  }

  /**
   * Mettre à jour le profil distant
   */
  private async updateRemoteProfile(profile: UserProfile): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_profile_media')
        .update({
          profile_data: profile.profile_data,
          updated_at: new Date().toISOString(),
          last_sync: new Date().toISOString()
        })
        .eq('device_id', profile.device_id);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('❌ Erreur mise à jour profil distant:', error);
      throw error;
    }
  }
}

// Export singleton
export const profileService = new ProfileService();
