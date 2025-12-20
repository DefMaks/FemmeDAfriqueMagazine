export default {
  expo: {
    name: "Femme D'Afrique Magazine",
    slug: "FemmeDAfriqueMagazine",
    version: "2.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    newArchEnabled: false,
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    ios: {
      bundleIdentifier: "com.defmaks.fda",
      supportsTablet: true,
      "ITSAppUsesNonExemptEncryption": false,
      NSLocationWhenInUseUsageDescription: "Cette application n'utilise pas votre position. Certaines bibliothèques externes peuvent y faire référence, mais aucune donnée de localisation n'est collectée ni utilisée.",
      buildNumber: "14.0"  // Ajouté pour la version iOS
    },
    android: {
      package: "com.defmaks.fda",
      versionCode: 14,  // Ajouté pour la version Android
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
      }
    },
    plugins: [],
    web: {
      favicon: "./assets/favicon.png"
    },
    extra: {
      // EAS Project ID - AJOUTÉ
      eas: {
        projectId: "2226573c-1349-4d26-953b-92f717a4efb5"
      },
      // Supabase Configuration
      EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
      EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      // WordPress API
      EXPO_PUBLIC_WORDPRESS_API_URL: process.env.EXPO_PUBLIC_WORDPRESS_API_URL,
      // TwigaPaie Payment Gateway
      EXPO_PUBLIC_TWIGAPAIE_API_URL: process.env.EXPO_PUBLIC_TWIGAPAIE_API_URL,
      EXPO_PUBLIC_TWIGAPAIE_API_KEY: process.env.EXPO_PUBLIC_TWIGAPAIE_API_KEY,
      // OneSignal Push Notifications
      EXPO_PUBLIC_ONESIGNAL_APP_ID: process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID,
      // Firebase Analytics
      EXPO_PUBLIC_FIREBASE_API_KEY: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
      EXPO_PUBLIC_FIREBASE_PROJECT_ID: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
      EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
    }
  }
};
