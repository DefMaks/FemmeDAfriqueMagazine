# Femme d'Afrique Magazine

Application mobile React Native/Expo pour le magazine Femme d'Afrique.

## 🚀 Démarrage Rapide

```bash
# Installer les dépendances
npm install

# Démarrer en développement (web)
npx expo start --web --port 5000

# Démarrer sur appareil/émulateur
npx expo start

# Build Android (APK interne)
eas build --platform android --profile preview

# Build Android (Google Play)
eas build --platform android --profile production

# Build iOS
eas build --platform ios --profile preview
```

## 📱 Fonctionnalités

- 📰 **Articles WordPress** : Récupération, cache et affichage des articles avec circuit breaker
- 🏷️ **Catégories & Tags** : Navigation filtrée par catégorie et tag
- 🛍️ **Boutique** : E-commerce via TwigaPaie (Mobile Money + carte)
- ❤️ **Favoris** : Sauvegarde des articles (Supabase)
- 👤 **Profil** : Compte utilisateur WordPress JWT
- 🔔 **Notifications** : OneSignal push (mode production)
- 📊 **Analytics** : Firebase GA4 + tracking custom
- 📴 **Mode hors-ligne** : Lecture des articles sans connexion
- 🔗 **Deep Links** : `femmedafrique://` + `https://femmedafrique.net`
- 🐛 **Debug** : Écran de logs et état des services

## 🛠️ Stack Technique

- **Framework** : React Native 0.76.9
- **Plateforme** : Expo SDK **54**
- **Navigation** : React Navigation v7 (Stack + BottomTabs)
- **API contenu** : WordPress REST API v2
- **Base de données** : Supabase (PostgreSQL)
- **Paiements** : TwigaPaie / FlexPaie (Mobile Money, carte)
- **Notifications** : OneSignal (implémentation manuelle, sans plugin)
- **Analytics** : Firebase GA4
- **HTTP Client** : `fetch` natif (pas d'axios)

## 🔧 Variables d'environnement

Les variables sont préfixées `EXPO_PUBLIC_` et configurées dans `eas.json` pour les builds EAS.

```bash
# WordPress
EXPO_PUBLIC_WORDPRESS_API_URL=https://femmedafrique.net/wp-json/wp/v2/

# Supabase
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=

# TwigaPaie
EXPO_PUBLIC_TWIGAPAIE_API_URL=
EXPO_PUBLIC_TWIGAPAIE_API_KEY=
EXPO_PUBLIC_WALLET_ID=

# OneSignal
EXPO_PUBLIC_ONESIGNAL_APP_ID=

# Firebase
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_APP_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=
EXPO_PUBLIC_GA4_API_SECRET=

# Uploadcare
EXPO_PUBLIC_UPLOADCARE_API_KEY=

# Interne
EXPO_PUBLIC_MEDIA=FDA
EXPO_PUBLIC_AGENT=
EXPO_PUBLIC_AGENT_PASS=
```

## 🔗 Deep Links

L'app supporte l'ouverture directe sur n'importe quel écran.

| URL | Écran |
|---|---|
| `femmedafrique://article/123` | Article |
| `femmedafrique://categorie/20` | Catégorie |
| `femmedafrique://articles` | Tous les articles |
| `femmedafrique://connexion` | Authentification |
| `femmedafrique://checkout` | Paiement |
| `https://femmedafrique.net/article/123` | Article (Universal/App Link) |

> **Note** : Les Universal Links iOS et App Links Android nécessitent des fichiers
> de vérification sur le serveur. Voir `CONTEXT.md` et `AUDIT.md` pour les détails.

## 🏗️ Architecture

```
src/
├── components/     # Composants réutilisables (ArticleCard, AdBanner, etc.)
├── config/         # Configuration et validation des env vars
├── lib/            # Clients initialisés (Supabase)
├── navigation/     # NavigationContainer + deep links (RootNavigator.tsx)
├── screens/        # Écrans de l'application
├── services/       # API, paiements, notifications, analytics, cache
├── theme/          # Couleurs et constantes de style
└── utils/          # Logger, helpers
```

## 🏗️ Builds EAS

```bash
# Développement (dev client, distribution interne)
eas build --platform android --profile development

# Preview (APK, distribution interne)
eas build --platform android --profile preview

# Production (AAB, Google Play)
eas build --platform android --profile production

# Soumettre sur Google Play
eas submit --platform android --profile production
```

Dashboard EAS : https://expo.dev/accounts/defmaks/projects/FemmeDAfriqueMagazine

## 🐛 Débogage

### Logs in-app
Profil → 🔍 Logs d'erreur

### Logs Android
```bash
adb logcat | grep "FemmeDAfriqueMagazine"
```

### Tester les deep links
```bash
# Android (appareil connecté)
adb shell am start -W -a android.intent.action.VIEW \
  -d "femmedafrique://article/23064" com.defmaks.fda

# iOS Simulator
xcrun simctl openurl booted "femmedafrique://article/23064"
```

### Logs EAS Build
https://expo.dev/accounts/defmaks/projects/FemmeDAfriqueMagazine/builds

## ⚠️ Problèmes connus

### Preview web vide
Le preview dans un navigateur ne charge pas les articles WordPress à cause de headers CORS dupliqués côté serveur. **Les builds Android/iOS natifs fonctionnent normalement.** Voir `AUDIT.md`.

## 📄 Licence

0BSD

---

**Dernière mise à jour** : Juin 2026
**Version app** : 1.0.0
**Expo SDK** : 54
**Statut** : ✅ Prêt pour Google Play
