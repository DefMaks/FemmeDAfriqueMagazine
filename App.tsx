// App.tsx
import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import RootNavigator from './src/navigation/RootNavigator';
import ErrorBoundary from './src/components/ErrorBoundary';
import { OneSignal, LogLevel } from 'react-native-onesignal';

export default function App() {
  useEffect(() => {
    // 🔔 OneSignal Push Notifications Configuration
    if (__DEV__) {
      OneSignal.Debug.setLogLevel(LogLevel.Verbose);
    }
    
    const appId = process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID;
    if (appId) {
      OneSignal.initialize(appId);
      OneSignal.Notifications.requestPermission(true);
    } else {
      console.warn('⚠️ OneSignal App ID not configured in .env');
    }
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