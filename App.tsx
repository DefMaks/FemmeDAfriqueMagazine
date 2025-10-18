// App.tsx
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { OneSignal, LogLevel } from 'react-native-onesignal';
import RootNavigator from './src/navigation/RootNavigator';

// OneSignal.initialize("e9dda2dd-a0c7-4221-ad6c-71ce91c540ce");
// OneSignal.Notifications.requestPermission(false);
// OneSignal.promptForPushNotificationsWithUserResponse();

// Initialisation OneSignal (doit être ici, au plus haut niveau)
// OneSignal.initialize("e9dda2dd-a0c7-4221-ad6c-71ce91c540ce");
// OneSignal.promptForPushNotificationsWithUserResponse();

// OneSignal.setNotificationWillShowInForegroundHandler((notificationReceivedEvent) => {
//   console.log("Notification will show in foreground:", notificationReceivedEvent);
//   const notification = notificationReceivedEvent.getNotification();
//   notificationReceivedEvent.complete(notification);
// });

// OneSignal.setNotificationOpenedHandler((notification) => {
//   console.log("Notification opened by user:", notification);
//   // Tu pourras naviguer vers un article ici plus tard
// });

export default function App() {
  useEffect(() => {
    // Enable verbose logging for debugging (remove in production)
    OneSignal.Debug.setLogLevel(LogLevel.Verbose);
    // Initialize with your OneSignal App ID
    OneSignal.initialize("e9dda2dd-a0c7-4221-ad6c-71ce91c540ce");
    // Use this method to prompt for push notifications.
    // We recommend removing this method after testing and instead use In-App Messages to prompt for notification permission.
    OneSignal.Notifications.requestPermission(false);
  }, []); // Ensure this only runs once on app mount
  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <RootNavigator />
    </SafeAreaProvider>
  );
}