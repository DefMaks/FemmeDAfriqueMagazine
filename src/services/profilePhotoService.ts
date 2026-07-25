// src/services/profilePhotoService.ts
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { profileService } from './profileService';
import { analyticsService } from './analytics.simple';

export interface ProfilePhotoData {
  uuid: string;
  original_filename: string;
  format: string;
  size: number;
  url: string;
  created_at: string;
  metadata?: {
    width?: number;
    height?: number;
    device_type?: string;
    app_version?: string;
  };
}

export interface UploadResult {
  success: boolean;
  url?: string;
  uuid?: string;
  error?: string;
}

class ProfilePhotoService {
  private readonly UPLOADCARE_URL = 'https://upload.uploadcare.com/base/';
  private readonly UPLOADCARE_API_KEY = Constants.expoConfig?.extra?.EXPO_PUBLIC_UPLOADCARE_API_KEY || '';
  private readonly STORAGE_KEY = '@fda_profile_photo';

  /**
   * Uploader une photo de profil vers Uploadcare
   */
  async uploadProfilePhoto(imageUri: string): Promise<UploadResult> {
    try {
      console.log('📸 Début upload photo profil Uploadcare:', imageUri);

      // 1. Lire le fichier en base64
      const response = await fetch(imageUri);
      const blob = await response.blob();
      const reader = new FileReader();

      return new Promise((resolve) => {
        reader.onloadend = async () => {
          try {
            const base64data = reader.result as string;

            // Vérifier que le base64 est valide
            if (!base64data || typeof base64data !== 'string' || !base64data.startsWith('data:')) {
              throw new Error('Base64 invalide ou vide');
            }

            // 2. Créer le formulaire pour Uploadcare
            const formData = new FormData();
            formData.append('file', base64data);
            formData.append('UPLOADCARE_PUB_KEY', this.UPLOADCARE_API_KEY);
            formData.append('UPLOADCARE_STORE', '1'); // Stockage permanent

            // 3. Uploader vers Uploadcare
            const uploadResponse = await fetch(this.UPLOADCARE_URL, {
              method: 'POST',
              body: formData,
              headers: {
                'Accept': 'application/vnd.uploadcare-v0.5+json',
                'User-Agent': 'FDA-Mobile/1.0.0',
              },
            });

            const result = await uploadResponse.json();

            if (!uploadResponse.ok || result.error) {
              console.error('❌ Erreur upload Uploadcare:', result);
              await analyticsService.trackError('upload_photo_failed', result.error || 'Unknown error', 'ProfileScreen');
              resolve({
                success: false,
                error: result.error?.message || 'Erreur upload photo',
              });
              return;
            }

            const photoData: ProfilePhotoData = {
              uuid: result.uuid,
              original_filename: result.original_filename || 'profile_photo',
              format: result.format || 'jpg',
              size: result.size || 0,
              url: result.url,
              created_at: new Date().toISOString(),
              metadata: {
                width: result.width,
                height: result.height,
                device_type: 'mobile',
                app_version: '1.0.0',
              },
            };

            // 4. Sauvegarder localement
            await this.savePhotoLocally(photoData);

            // 5. Mettre à jour dans Supabase
            await this.updateProfilePhotoInSupabase(photoData);

            // 6. Analytics tracking
            await analyticsService.trackError('upload_photo_success', 'Photo uploaded successfully', 'ProfileScreen');

            console.log('✅ Photo uploadée sur Uploadcare:', {
              uuid: result.uuid,
              url: result.url,
              size: result.size,
            });

            resolve({
              success: true,
              url: result.url,
              uuid: result.uuid,
            });

          } catch (error: any) {
            console.error('❌ Erreur traitement base64:', error);
            resolve({
              success: false,
              error: error.message || 'Erreur traitement image',
            });
          }
        };

        reader.readAsDataURL(blob);
      });

    } catch (error: any) {
      console.error('❌ Erreur upload photo:', error);
      await analyticsService.trackError('upload_photo_error', error.message, 'ProfileScreen');
      return {
        success: false,
        error: error.message || 'Erreur upload photo',
      };
    }
  }

  /**
   * Sauvegarder la photo localement
   */
  private async savePhotoLocally(photoData: ProfilePhotoData): Promise<void> {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(photoData));
      console.log('💾 Photo sauvegardée localement');
    } catch (error) {
      console.error('❌ Erreur sauvegarde locale photo:', error);
    }
  }

  /**
   * Mettre à jour la photo dans Supabase
   */
  private async updateProfilePhotoInSupabase(photoData: ProfilePhotoData): Promise<void> {
    try {
      const currentProfile = await profileService.getCurrentProfile();

      if (!currentProfile) {
        throw new Error('Aucun profil trouvé');
      }

      // Ajouter la photo au profile_data
      const updatedProfileData = {
        ...currentProfile.profile_data,
        profile_photo: photoData,
      };

      // Mettre à jour le profil
      const { error } = await supabase
        .from('user_profile_media')
        .update({
          profile_data: updatedProfileData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentProfile.id);

      if (error) {
        throw new Error(`Erreur mise à jour profil: ${error.message}`);
      }

      console.log('✅ Photo mise à jour dans Supabase');

    } catch (error) {
      console.error('❌ Erreur mise à jour Supabase:', error);
      throw error;
    }
  }

  /**
   * Récupérer la photo de profil actuelle
   */
  async getCurrentProfilePhoto(): Promise<ProfilePhotoData | null> {
    try {
      // 1. Essayer AsyncStorage d'abord
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }

      // 2. Essayer depuis le profil Supabase
      const currentProfile = await profileService.getCurrentProfile();
      if (currentProfile?.profile_data?.profile_photo) {
        const photoData = currentProfile.profile_data.profile_photo as any;

        // Créer un objet ProfilePhotoData complet avec les champs manquants
        const completePhotoData: ProfilePhotoData = {
          uuid: photoData.uuid || '',
          original_filename: photoData.original_filename || photoData.filename || 'profile.jpg',
          format: photoData.format || 'jpeg',
          size: photoData.size || 0,
          url: photoData.url || '',
          created_at: photoData.created_at || new Date().toISOString(),
          metadata: photoData.metadata || {}
        };

        // Sauvegarder localement pour usage futur
        await this.savePhotoLocally(completePhotoData);

        return completePhotoData;
      }

      return null;

    } catch (error) {
      console.error('❌ Erreur récupération photo profil:', error);
      return null;
    }
  }

  /**
   * Supprimer la photo de profil actuelle
   */
  async deleteProfilePhoto(): Promise<boolean> {
    try {
      const currentPhoto = await this.getCurrentProfilePhoto();

      if (!currentPhoto) {
        console.warn('⚠️ Aucune photo à supprimer');
        return false;
      }

      // 1. Supprimer d'Uploadcare (optionnel - Uploadcare ne supprime pas directement)
      // On pourrait utiliser l'API REST pour supprimer si nécessaire
      console.log('🗑️ Photo marquée pour suppression:', currentPhoto.uuid);

      // 2. Mettre à jour dans Supabase
      const currentProfile = await profileService.getCurrentProfile();
      if (currentProfile) {
        const updatedProfileData = {
          ...currentProfile.profile_data,
          profile_photo: null,
        };

        await supabase
          .from('user_profile_media')
          .update({
            profile_data: updatedProfileData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', currentProfile.id);
      }

      // 3. Supprimer localement
      await AsyncStorage.removeItem(this.STORAGE_KEY);

      console.log('✅ Photo supprimée avec succès');
      return true;

    } catch (error: any) {
      console.error('❌ Erreur suppression photo:', error);
      return false;
    }
  }

  /**
   * Vérifier si une photo existe
   */
  async hasProfilePhoto(): Promise<boolean> {
    const photo = await this.getCurrentProfilePhoto();
    return photo !== null;
  }

  /**
   * Obtenir les informations de stockage
   */
  async getStorageInfo(): Promise<{ count: number; totalSize: number }> {
    try {
      const photo = await this.getCurrentProfilePhoto();

      if (!photo) {
        return { count: 0, totalSize: 0 };
      }

      return {
        count: 1,
        totalSize: photo.size || 0,
      };

    } catch (error) {
      console.error('❌ Erreur infos stockage:', error);
      return { count: 0, totalSize: 0 };
    }
  }

  /**
   * Optimiser une image avant upload
   */
  async optimizeImage(imageUri: string): Promise<string> {
    try {
      // Pour l'instant, retourner l'URI originale
      // Dans une vraie implémentation, on pourrait compresser l'image ici
      console.log('🖼️ Image optimisée (placeholder)');
      return imageUri;
    } catch (error) {
      console.error('❌ Erreur optimisation image:', error);
      return imageUri;
    }
  }

  /**
   * Obtenir l'URL CDN pour une photo
   */
  getCdnUrl(uuid: string, transformations?: string): string {
    const baseUrl = `https://ucarecdn.com/${uuid}/`;
    const transformString = transformations ? `-/crop/200x200/center/${transformations}` : '-/crop/200x200/center/';
    return `${baseUrl}${transformString}`;
  }
}

// Export singleton
export const profilePhotoService = new ProfilePhotoService();
