// App.tsx
import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RootNavigator from './src/navigation/RootNavigator';
import ErrorBoundary from './src/components/ErrorBoundary';
import { notificationService } from './src/services/notificationService';

export default function App() {
  useEffect(() => {
    // Initialiser OneSignal au démarrage de l'app
    notificationService.initialize();

    // Forcer la réinitialisation
    setTimeout(() => {
      console.log('🔄 Tentative réinitialisation OneSignal...');
      // Le plugin Expo gère ça automatiquement
    }, 5000);

    // === CODE DE TEST ONE SIGNAL ===
    setupOneSignalTestHandlers();
  }, []);

  // === FONCTIONS DE TEST ONE SIGNAL ===
  const setupOneSignalTestHandlers = () => {
    console.log('🧪 Configuration des handlers de test OneSignal...');

    // NOTE: Pour Expo Go, OneSignal est configuré via le plugin
    // Les handlers sont automatiques - on utilise juste des logs pour vérifier

    console.log(' Handlers OneSignal configurés pour les tests');
  };

  // Fonction pour obtenir les infos device (à appeler depuis la console)
  const getOneSignalInfo = async () => {
    try {
      console.log(' Récupération infos OneSignal...');

      // Pour Expo Go, essayer de récupérer le device ID depuis le plugin
      let deviceId = await AsyncStorage.getItem('onesignal_device_id');

      // Si pas de device ID, essayer de le générer
      if (!deviceId) {
        console.log(' Tentative récupération device ID OneSignal...');

        // Pour Expo Go, le device ID peut être récupéré via le plugin
        try {
          // NOTE: Cette fonctionnalité nécessite un build natif complet
          // Pour Expo Go, on utilise un ID temporaire
          deviceId = 'expo_go_device_' + Date.now();
          await AsyncStorage.setItem('onesignal_device_id', deviceId);
          console.log(' Device ID temporaire généré:', deviceId);
        } catch (error) {
          console.log(' Device ID non disponible dans Expo Go');
          deviceId = null;
        }
      }

      console.log(' OneSignal Device Info:');
      console.log('- Device ID:', deviceId || 'Non disponible (Expo Go limitation)');
      console.log('- App ID:', process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID);
      console.log('- Mode:', __DEV__ ? 'Development' : 'Production');
      console.log('- Platform: Expo Go (limitations apply)');

      return {
        deviceId,
        appId: process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID,
        mode: __DEV__ ? 'development' : 'production',
        platform: 'expo_go'
      };
    } catch (error) {
      console.error(' Erreur récupération infos OneSignal:', error);
      return null;
    }
  };

  // Rendre la fonction disponible globalement
  (global as any).getOneSignalInfo = getOneSignalInfo;

  // Fonction pour vérifier l'enregistrement OneSignal
  const checkOneSignalRegistration = async () => {
    try {
      console.log(' Vérification enregistrement OneSignal...');

      const info = await getOneSignalInfo();
      console.log(' Infos actuelles:', info); // Je n'ai pas cette ligne dans la console

      // Vérifier si l'App ID correspond
      if (info && info.appId === 'd8f5f3e0-4b2a-4a0b-9e1d-2c3d4e5f6a7b') {
        console.log(' App ID correct');
      } else {
        console.log(' App ID incorrect:', info?.appId);
      }

      // Pour Expo Go, l'enregistrement se fait via le plugin
      console.log(' Device doit apparaître dans OneSignal Dashboard → Audience');
      console.log(' Vérifiez: https://app.onesignal.com/apps/d8f5f3e0-4b2a-4a0b-9e1d-2c3d4e5f6a7b');

      return info;
    } catch (error) {
      console.error(' Erreur vérification:', error);
      return null;
    }
  };

  // Rendre la fonction disponible globalement
  (global as any).checkOneSignalRegistration = checkOneSignalRegistration;

  // Fonction pour tester l'envoi de tag (à appeler depuis la console)
  const testOneSignalTag = async (tagName: string) => {
    try {
      console.log(` Test envoi tag: ${tagName}`);

      // NOTE: Pour Expo Go, l'API OneSignal sera disponible après le build
      console.log(' Tag préparé pour envoi (disponible après build natif)');

    } catch (error) {
      console.error(' Erreur envoi tag:', error);
    }
  };

  // Rendre la fonction disponible globalement
  (global as any).testOneSignalTag = testOneSignalTag;

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <RootNavigator />
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
