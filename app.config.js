export default {
  expo: {
    name: "Femme d'Afrique Magazine",
    slug: "FemmeDAfriqueMagazine",
    version: "2.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "cover",
      backgroundColor: "#ffffff"
    },
    ios: {
      bundleIdentifier: "com.defmaks.fda",
      supportsTablet: true,
      googleServicesFile: "./GoogleService-Info.plist",
      infoPlist: {
        NSLocationWhenInUseUsageDescription: "Cette application n'utilise pas votre position. Certaines bibliothèques externes peuvent y faire référence, mais aucune donnée de localisation n'est collectée ni utilisée.",
        ITSAppUsesNonExemptEncryption: false
      }
    },
    android: {
      package: "com.defmaks.fda",
      googleServicesFile: "./google-services.json",
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
      }
    },
    plugins: [
      'expo-font',
      ['onesignal-expo-plugin', {
        mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
      }]
    ],
    web: {
      favicon: "./assets/favicon.png"
    },
    extra: {
      eas: {
        projectId: "2226573c-1349-4d26-953b-92f717a4efb5"
      },
      EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
      EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      EXPO_PUBLIC_WORDPRESS_API_URL: process.env.EXPO_PUBLIC_WORDPRESS_API_URL,
      EXPO_PUBLIC_TWIGAPAIE_API_URL: process.env.EXPO_PUBLIC_TWIGAPAIE_API_URL,
      EXPO_PUBLIC_TWIGAPAIE_API_KEY: process.env.EXPO_PUBLIC_TWIGAPAIE_API_KEY,
      EXPO_PUBLIC_ONESIGNAL_APP_ID: process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID,
      EXPO_PUBLIC_FIREBASE_PROJECT_ID: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
      EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
      EXPO_PUBLIC_FIREBASE_API_KEY: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
      EXPO_PUBLIC_FIREBASE_APP_ID: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
      EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
      EXPO_PUBLIC_GA4_API_SECRET: process.env.EXPO_PUBLIC_GA4_API_SECRET
    }
  }
};
