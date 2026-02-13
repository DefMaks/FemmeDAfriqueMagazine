# Femme D'Afrique Magazine

Application mobile React Native/Expo pour Femme D'Afrique Magazine.

## 🚀 Démarrage Rapide

```bash
# Installer les dépendances
npm install

# Démarrer en développement
npx expo start

# Build Android
eas build --platform android --profile preview

# Build iOS
eas build --platform ios --profile preview
```

## 📱 Fonctionnalités

- 📰 **Articles WordPress** : Récupération et affichage des articles
- 🏷️ **Catégories & Tags** : Navigation par catégories et tags
- 🛍️ **Boutique** : E-commerce intégré
- ❤️ **Favoris** : Sauvegarde des articles préférés
- 👤 **Profil** : Gestion du compte utilisateur
- 🔔 **Notifications** : OneSignal manuel
- 📊 **Analytics** : Tracking des événements
- 🐛 **Debug** : Logs d'erreurs intégrés

## 🛠️ Stack Technique

- **Framework** : React Native 0.76.9
- **Plateforme** : Expo SDK 52
- **Navigation** : React Navigation v7
- **API** : WordPress REST API
- **Base de données** : Supabase
- **Notifications** : OneSignal (manuel)
- **Analytics** : Service custom
- **HTTP Client** : Fetch natif (pas d'axios)

## 🔧 Configuration

### Variables d'environnement requises

```bash
# WordPress
EXPO_PUBLIC_WORDPRESS_API_URL=https://votresite.com/wp-json/wp/v2/

# Supabase
EXPO_PUBLIC_SUPABASE_URL=votre_url_supabase
EXPO_PUBLIC_SUPABASE_ANON_KEY=votre_cle_supabase

# OneSignal
EXPO_PUBLIC_ONESIGNAL_APP_ID=votre_app_id_onesignal

# Firebase
EXPO_PUBLIC_FIREBASE_PROJECT_ID=votre_project_id
EXPO_PUBLIC_FIREBASE_API_KEY=votre_api_key
EXPO_PUBLIC_FIREBASE_APP_ID=votre_app_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=votre_bucket
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=votre_measurement_id

# TwigaPaie
EXPO_PUBLIC_TWIGAPAIE_API_URL=votre_url_twigapaie
EXPO_PUBLIC_TWIGAPAIE_API_KEY=votre_cle_twigapaie

# Analytics
EXPO_PUBLIC_GA4_API_SECRET=votre_secret_ga4
```

## 🐛 Débogage

### Logs d'erreurs

L'application inclut un système de logging complet :

1. **Accès aux logs** : Profil → 🔍 Logs d'erreur
2. **Logs automatiques** : Toutes les erreurs sont capturées
3. **Export des logs** : Partage possible avec le support

### Commandes utiles

```bash
# Vider les logs
# Via l'app : Profil → Logs d'erreur → 🗑️ Effacer

# Logs Android
adb logcat | grep "FemmeDAfriqueMagazine"

# Logs EAS Build
# Voir les logs sur : https://expo.dev/accounts/defmaks/projects/FemmeDAfriqueMagazine/builds
```

## 🏗️ Architecture

```
src/
├── components/          # Composants réutilisables
├── config/             # Configuration (env, couleurs)
├── navigation/         # Navigation React Navigation
├── screens/           # Écrans de l'application
├── services/          # Services (API, OneSignal, Analytics)
├── utils/             # Utilitaires (logger, helpers)
└── theme/             # Thème (couleurs, fonts)
```

## 🔧 Résolution de Problèmes

### Crash au démarrage - ✅ RÉSOLU

**Problème** : React 19 incompatible avec React Native 0.81.5 + axios utilisant `crypto`

**Solution** :
- Downgrade React 19 → 18.3.1
- Expo SDK 54 → 52 (stable)
- Remplacement d'axios par fetch natif
- Versions compatibles pour toutes les dépendances

**Fichiers modifiés** :
- `package.json` : Versions mises à jour
- `src/services/api.ts` : Remplacement axios → fetch
- `src/services/api.simple.ts` : Service API avec fetch

### OneSignal Plugin - ✅ RÉSOLU

**Problème** : `onesignal-expo-plugin` causait des builds

**Solution** :
- Suppression du plugin problématique
- Implémentation manuelle de OneSignal
- Service `oneSignal.simple.ts` sans dépendance externe

### Variables d'environnement EAS

Pour les builds EAS, configurez les variables sur :
https://expo.dev/accounts/defmaks/projects/FemmeDAfriqueMagazine/variables

## 📦 Déploiement

### Build Preview

```bash
eas build --platform android --profile preview
eas build --platform ios --profile preview
```

### Build Production

```bash
eas build --platform android --profile production
eas build --platform ios --profile production
```

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature
3. Commit les changements
4. Push la branche
5. Créer une Pull Request

## 📄 Licence

0BSD

## 📞 Support

Pour toute question ou problème :
- Logs d'erreur : Profil → 🔍 Logs d'erreur
- Support technique : [Contacter l'équipe]

---

**Dernière mise à jour** : Février 2026  
**Version** : 1.0.0  
**Statut** : ✅ Stable et fonctionnel
