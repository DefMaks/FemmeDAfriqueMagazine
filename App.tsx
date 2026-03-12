import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';

// Navigation
import RootNavigator from './src/navigation/RootNavigator';

// Import des services
import { oneSignalService } from './src/services/oneSignal.simple';
import { analyticsService } from './src/services/analytics.simple';
import ErrorBoundary from './src/components/ErrorBoundary';
import { logger } from './src/utils/logger';

export default function App() {
  useEffect(() => {
    initializeServices();
  }, []);

  const initializeServices = async () => {
    try {
      await logger.info('🚀 Début initialisation des services...');

      // Initialiser OneSignal
      await logger.info('📱 Initialisation OneSignal...');
      await oneSignalService.initialize();
      const hasPermission = await oneSignalService.requestPermission();
      await logger.info(`OneSignal permission: ${hasPermission ? '✅ Accordée' : '❌ Refusée'}`);

      // Récupérer les infos device
      const deviceInfo = await oneSignalService.getDeviceInfo();
      await logger.info(`OneSignal Device Info: ${JSON.stringify(deviceInfo)}`);

      // Initialiser Analytics
      await logger.info('📊 Initialisation Analytics...');
      await analyticsService.enable();
      await analyticsService.trackEvent('app_start', {
        timestamp: new Date().toISOString(),
        device_id: deviceInfo.userId,
      });

      await logger.info('✅ Services initialisés avec succès');

    } catch (error) {
      await logger.error('❌ Erreur critique initialisation services', error);
    }
  };

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          {/* Expo button */}
          <StatusBar style="auto" />
          <RootNavigator />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#A93F55',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
});
