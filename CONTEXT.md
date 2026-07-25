# CONTEXT — Femme d'Afrique Magazine App

> Document technique de référence. Mis à jour : Juin 2026.

---

## Stack technique

| Couche | Technologie | Version |
|---|---|---|
| Framework mobile | React Native | 0.76.9 |
| Plateforme | Expo SDK | **54** |
| Navigation | React Navigation | v7 (Stack + BottomTabs) |
| Contenu | WordPress REST API | v2 |
| Base de données | Supabase | latest |
| Paiements | TwigaPaie / FlexPaie | gateway Railway |
| Notifications | OneSignal | manual (pas de plugin Expo) |
| Analytics | Firebase GA4 + custom | — |
| Upload média | Uploadcare | — |
| HTTP | `fetch` natif | (pas d'axios) |

---

## Architecture des fichiers

```
/
├── app.json                    # Configuration Expo (static — pas de app.config.js)
├── eas.json                    # Profils EAS : development / preview / production
├── metro.config.js             # Résolution semver/* + blockList .local/
├── src/
│   ├── config/
│   │   └── env.ts              # Validation des EXPO_PUBLIC_* au démarrage
│   ├── navigation/
│   │   └── RootNavigator.tsx   # NavigationContainer + linking deep links
│   ├── screens/
│   │   ├── HomeScreen.tsx
│   │   ├── DiscoverScreen.tsx
│   │   ├── ShopScreen.tsx
│   │   ├── SavedScreen.tsx
│   │   ├── ProfileScreen.tsx
│   │   ├── ArticleDetailScreen.tsx
│   │   ├── AllArticlesScreen.tsx
│   │   ├── CheckoutScreen.tsx
│   │   ├── AuthScreen.tsx
│   │   └── DebugScreen.tsx
│   ├── services/
│   │   ├── api.ts                      # Fonctions WordPress + fallback offline
│   │   ├── optimizedApiService.ts      # Circuit breaker + timeout adaptatif
│   │   ├── adaptiveTimeoutService.ts   # Retry & timeout dynamique par service
│   │   ├── circuitBreakerService.ts    # Coupe-circuit (CLOSED / OPEN / HALF_OPEN)
│   │   ├── supabaseService.ts          # Favoris, tracking vues, préférences
│   │   ├── twigaPaie.ts                # Mobile Money + paiement carte
│   │   ├── wordpressAuth.ts            # JWT WordPress
│   │   ├── offlineService.ts           # Persistance locale (lecture hors-ligne)
│   │   ├── analyticsService.ts         # Firebase GA4
│   │   ├── notificationService.ts      # OneSignal
│   │   └── networkService.ts           # État réseau (connecté / offline)
│   └── lib/
│       └── supabase.ts                 # Client Supabase initialisé
├── supabase/
│   └── migrations/                     # Migrations SQL Supabase
└── assets/                             # Icônes, splash, polices
```

---

## Navigation & Deep Links

### Structure des routes

```
NavigationContainer (linking: femmedafrique:// + https://femmedafrique.net)
└── Stack.Navigator
    ├── Main (BottomTabs)
    │   ├── Accueil        →  /
    │   ├── Découvrir      →  /decouvrir
    │   ├── Boutique       →  /boutique
    │   ├── Favoris        →  /favoris
    │   └── Profil         →  /profil
    ├── ArticleDetail      →  /article/:id
    ├── AllArticles        →  /articles
    ├── CategoryArticles   →  /categorie/:categoryId
    ├── AuthScreen         →  /connexion
    ├── Checkout           →  /checkout
    └── Debug              →  /debug
```

### Schémas d'URL supportés

| Schéma | Exemple |
|---|---|
| Custom scheme | `femmedafrique://article/23064` |
| Universal Link iOS | `https://femmedafrique.net/article/23064` |
| App Link Android | `https://femmedafrique.net/article/23064` |

### Fichiers requis côté serveur (à déployer)

**iOS — Universal Links** :
`https://femmedafrique.net/.well-known/apple-app-site-association`
```json
{
  "applinks": {
    "apps": [],
    "details": [{ "appID": "<TEAM_ID>.com.defmaks.fda", "paths": ["*"] }]
  }
}
```

**Android — App Links** :
`https://femmedafrique.net/.well-known/assetlinks.json`
```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.defmaks.fda",
    "sha256_cert_fingerprints": ["<SHA256_DE_LA_KEYSTORE>"]
  }
}]
```

---

## Variables d'environnement

Toutes les variables sont préfixées `EXPO_PUBLIC_` et injectées dans les trois profils EAS (`eas.json`).

| Variable | Usage |
|---|---|
| `EXPO_PUBLIC_WORDPRESS_API_URL` | Base URL WordPress REST API |
| `EXPO_PUBLIC_SUPABASE_URL` | URL projet Supabase |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Clé publique Supabase |
| `EXPO_PUBLIC_TWIGAPAIE_API_URL` | Gateway paiement |
| `EXPO_PUBLIC_TWIGAPAIE_API_KEY` | Clé API TwigaPaie |
| `EXPO_PUBLIC_ONESIGNAL_APP_ID` | ID app OneSignal |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project |
| `EXPO_PUBLIC_FIREBASE_API_KEY` | Firebase web API key |
| `EXPO_PUBLIC_FIREBASE_APP_ID` | Firebase app ID |
| `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase Storage |
| `EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID` | GA4 Measurement ID |
| `EXPO_PUBLIC_GA4_API_SECRET` | GA4 API Secret |
| `EXPO_PUBLIC_WALLET_ID` | Wallet TwigaPaie |
| `EXPO_PUBLIC_UPLOADCARE_API_KEY` | Uploadcare |
| `EXPO_PUBLIC_MEDIA` | Identifiant média (`FDA`) |
| `EXPO_PUBLIC_AGENT` | Compte agent WordPress |
| `EXPO_PUBLIC_AGENT_PASS` | Mot de passe agent |

---

## EAS Build — Profils

```
eas build --platform android --profile development   # Dev client (internal)
eas build --platform android --profile preview       # APK interne
eas build --platform android --profile production    # AAB → Google Play
```

Le profil `production` :
- Génère un **Android App Bundle (.aab)**
- Active `autoIncrement` de version
- Cible le channel OTA `production`
- Image builder : `latest`
- Submit vers Google Play track `production`

---

## Problèmes connus

### Preview web vide (Replit/navigateur)
**Cause** : Le serveur `femmedafrique.net` renvoie deux fois l'en-tête
`Access-Control-Allow-Origin: *`, ce que Chrome rejette (violation CORS spec).
**Impact** : Uniquement le preview web. Les builds natifs Android/iOS ne sont pas affectés (CORS n'existe pas dans les apps natives).
**Résolution** : Supprimer l'en-tête dupliqué côté serveur WordPress (nginx/Apache config).

### OneSignal — mode web
OneSignal est simulé en mode web (`Platform.OS === 'web'`). Les notifications push ne fonctionnent que sur les builds natifs.

---

## Décisions d'architecture

| Décision | Raison |
|---|---|
| `fetch` natif (pas d'axios) | axios importait `crypto` → crash React Native |
| OneSignal manual (pas de plugin) | `onesignal-expo-plugin` cassait les builds EAS |
| `app.json` statique (pas de `app.config.js`) | EAS exige une config statique pour les builds CI |
| `metro.config.js` personnalisé | Résolution de `semver/functions/*` (ESM → CJS) + exclusion `.local/` |
| Circuit breaker + timeout adaptatif | WordPress peut être lent (>10s) ; évite les crashes UI |
