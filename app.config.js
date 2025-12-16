export default {
  expo: {
    name: "Femme D'Afrique Magazine",
    slug: "FemmeDAfriqueMagazine",
    version: "1.0.0",
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
      supportsTablet: true
    },
    android: {
      package: "com.defmaks.fda",
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
      EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
      EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      EXPO_PUBLIC_WORDPRESS_API_URL: process.env.EXPO_PUBLIC_WORDPRESS_API_URL,
      EXPO_PUBLIC_TWIGAPAIE_API_KEY: process.env.EXPO_PUBLIC_TWIGAPAIE_API_KEY,
    }
  }
};
