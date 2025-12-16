export default {
  expo: {
    name: "Femme D'Afrique Magazine",
    slug: "FemmeDAfriqueMagazine",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    ios: {
      bundleIdentifier: "com.defmaks.fda",
      supportsTablet: true,
      infoPlist: {
        UIBackgroundModes: ["remote-notification"]
      },
      entitlements: {
        "aps-environment": "development",
        "com.apple.security.application-groups": [
          "group.${ios.bundleIdentifier}.onesignal"
        ]
      }
    },
    android: {
      package: "com.defmaks.fda",
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false
    },
    plugins: [
      [
        "onesignal-expo-plugin",
        {
          mode: "development",
          appId: process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID || "e9dda2dd-a0c7-4221-ad6c-71ce91c540ce"
        }
      ]
    ],
    web: {
      favicon: "./assets/favicon.png"
    },
    extra: {
      EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
      EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      EXPO_PUBLIC_TWIGAPAIE_API_URL: process.env.EXPO_PUBLIC_TWIGAPAIE_API_URL,
      EXPO_PUBLIC_TWIGAPAIE_API_KEY: process.env.EXPO_PUBLIC_TWIGAPAIE_API_KEY,
      EXPO_PUBLIC_WALLET_ID: process.env.EXPO_PUBLIC_WALLET_ID,
      EXPO_PUBLIC_WORDPRESS_API_URL: process.env.EXPO_PUBLIC_WORDPRESS_API_URL,
      EXPO_PUBLIC_ONESIGNAL_APP_ID: process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID,
    }
  }
};
