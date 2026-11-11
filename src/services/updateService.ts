import * as Updates from 'expo-updates';
import { Alert, Platform } from 'react-native';
import { logger } from '../utils/logger';

export interface UpdateInfo {
  isEnabled: boolean;
  isEmbeddedLaunch: boolean;
  updateId?: string;
  channel?: string;
  runtimeVersion?: string;
  createdAt?: string;
  manifest?: any;
}

class UpdateService {
  private isChecking = false;

  /**
   * Retourne les métadonnées de l'application et de la mise à jour active
   */
  getUpdateInfo(): UpdateInfo {
    try {
      return {
        isEnabled: Updates.isEnabled,
        isEmbeddedLaunch: Updates.isEmbeddedLaunch,
        updateId: Updates.updateId ?? 'binaire-natif',
        channel: Updates.channel ?? 'aucun',
        runtimeVersion: Updates.runtimeVersion ? String(Updates.runtimeVersion) : undefined,
        createdAt: Updates.createdAt ? Updates.createdAt.toISOString() : undefined,
        manifest: Updates.manifest,
      };
    } catch (error) {
      console.warn('⚠️ Impossible de récupérer les infos de mise à jour:', error);
      return {
        isEnabled: false,
        isEmbeddedLaunch: true,
        updateId: 'inconnu',
      };
    }
  }

  /**
   * Vérifie et applique une mise à jour silencieusement au démarrage
   * Utilisé dans App.tsx
   */
  async checkOnAppLaunch(): Promise<void> {
    if (__DEV__ || !Updates.isEnabled) {
      console.log('[updateService] OTA desactive en mode developpement ou non supporte');
      return;
    }

    try {
      await logger.info('OTA : Recherche de mise a jour au demarrage...');
      const check = await Updates.checkForUpdateAsync();

      if (check.isAvailable) {
        await logger.info('OTA : Nouvelle mise a jour trouvee, telechargement...');
        const fetchResult = await Updates.fetchUpdateAsync();

        if (fetchResult.isNew) {
          await logger.info('OTA : Mise a jour telechargee avec succes. Application...');
          // On recharge l'application pour charger le nouveau bundle
          await Updates.reloadAsync();
        }
      } else {
        await logger.info("OTA : L'application est a jour");
      }
    } catch (error: any) {
      console.warn('[updateService] Erreur recherche OTA au demarrage:', error?.message);
    }
  }

  /**
   * Vérification manuelle déclenchée par l'utilisateur (depuis l'écran Debug ou Profil)
   */
  async checkManually(): Promise<{ success: boolean; message: string }> {
    if (this.isChecking) {
      return { success: false, message: 'Vérification déjà en cours...' };
    }

    if (__DEV__ || !Updates.isEnabled) {
      const msg = 'Les mises à jour OTA sont désactivées en mode développement ou client de test.';
      Alert.alert('Information', msg);
      return { success: false, message: msg };
    }

    this.isChecking = true;

    try {
      const check = await Updates.checkForUpdateAsync();

      if (check.isAvailable) {
        Alert.alert(
          'Mise à jour disponible',
          'Une nouvelle version est disponible. Voulez-vous la télécharger maintenant ?',
          [
            { text: 'Plus tard', style: 'cancel' },
            {
              text: 'Télécharger',
              onPress: async () => {
                try {
                  const result = await Updates.fetchUpdateAsync();
                  if (result.isNew) {
                    Alert.alert(
                      'Mise à jour prête',
                      'La mise à jour a été téléchargée. Redémarrez l\'application pour l\'activer.',
                      [
                        {
                          text: 'Redémarrer maintenant',
                          onPress: async () => {
                            await Updates.reloadAsync();
                          },
                        },
                      ]
                    );
                  }
                } catch (err: any) {
                  Alert.alert('Erreur', `Échec du téléchargement : ${err?.message || 'Inconnu'}`);
                }
              },
            },
          ]
        );
        return { success: true, message: 'Mise à jour disponible trouvée' };
      } else {
        Alert.alert('Application à jour', 'Vous utilisez déjà la version la plus récente.');
        return { success: true, message: 'Application déjà à jour' };
      }
    } catch (error: any) {
      const errMessage = error?.message || 'Erreur inconnue';
      Alert.alert('Erreur', `Impossible de vérifier les mises à jour : ${errMessage}`);
      return { success: false, message: errMessage };
    } finally {
      this.isChecking = false;
    }
  }
}

export const updateService = new UpdateService();
export default updateService;

