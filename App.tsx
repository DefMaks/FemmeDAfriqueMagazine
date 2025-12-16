// App.tsx
import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import RootNavigator from './src/navigation/RootNavigator';
import ErrorBoundary from './src/components/ErrorBoundary';
import Constants from 'expo-constants';

export default function App() {
  useEffect(() => {
    // 🔔 OneSignal Push Notifications Configuration
    const initializeOneSignal = async () => {
      try {
        const { OneSignal, LogLevel } = await import('react-native-onesignal');
        
        if (__DEV__) {
          OneSignal.Debug.setLogLevel(LogLevel.Verbose);
        }
        
        // @ts-ignore
        const appId = Constants.expoConfig?.extra?.EXPO_PUBLIC_ONESIGNAL_APP_ID || 
                     process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID || 
                     'e9dda2dd-a0c7-4221-ad6c-71ce91c540ce';
        
        if (appId) {
          OneSignal.initialize(appId);
          OneSignal.Notifications.requestPermission(true);
          console.log('✅ OneSignal initialized');
        }
      } catch (error) {
        console.log('⚠️ OneSignal not available:', error);
      }
    };

    initializeOneSignal();
  }, []);

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <RootNavigator />
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}