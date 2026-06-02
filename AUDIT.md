# AUDIT — Femme d'Afrique Magazine App

> Journal des problèmes identifiés, correctifs appliqués et état actuel.
> Dernière mise à jour : Juin 2026.

---

## ✅ Correctifs appliqués

### 1. Migration `app.config.js` → `app.json`
- **Problème** : EAS Build nécessite une configuration statique. `app.config.js` avec des `process.env` dynamiques provoque des crashes en CI.
- **Fix** : Suppression de `app.config.js` et `app.config.complex.js`. Création de `app.json` statique complet.
- **Fichiers** : `app.json` (créé), `app.config.js` (supprimé)

---

### 2. Variables d'environnement manquantes dans EAS
- **Problème** : Aucune `EXPO_PUBLIC_*` dans `eas.json` → l'app démarrait mais toutes les API calls échouaient sur les builds EAS.
- **Fix** : Ajout de toutes les 17 variables dans les 3 profils (`development`, `preview`, `production`) de `eas.json`.
- **Fichiers** : `eas.json`

---

### 3. OneSignal en mode `"production"` forcé
- **Problème** : Le mode `"development"` d'OneSignal provoque un crash sur les builds Google Play (`NSE entitlements` invalides).
- **Fix** : `"mode": "production"` dans le plugin OneSignal de `app.json`.
- **Fichiers** : `app.json`

---

### 4. Versions de packages incompatibles (Expo SDK 54)
- **Problème** : Plusieurs packages avaient des versions incompatibles avec SDK 54, causant des crashes EAS :
  - `expo-crypto` : mauvaise version
  - `expo-image-picker` : API obsolète
  - Autres dépendances peer non satisfaites
- **Fix** : Mise à jour vers les versions conformes SDK 54 via `npx expo install --fix`.
- **Fichiers** : `package.json`

---

### 5. Résolution `semver` dans Metro
- **Problème** : Metro bundler ne résolvait pas `semver/functions/satisfies` et `semver/functions/prerelease` (imports ESM dans un contexte CJS).
- **Fix** : Création de `metro.config.js` avec `resolver.resolveRequest` personnalisé + `blockList: [/\.local\/.*/]` (exclut le répertoire Replit agent).
- **Fichiers** : `metro.config.js` (créé)

---

### 6. En-tête `User-Agent` interdit en web
- **Problème** : `User-Agent: 'FDA-App/1.0'` dans les requêtes `fetch` provoque une `TypeError` dans les navigateurs (en-tête interdit par la spec Fetch).
- **Fix** : Suppression de l'en-tête dans `optimizedApiService.ts`.
- **Fichiers** : `src/services/optimizedApiService.ts`

---

### 7. Configuration Deep Links
- **Problème** : Aucun scheme d'URL configuré. Les liens depuis le site web ou les notifications ne pouvaient pas ouvrir l'app sur le bon écran.
- **Fix** :
  - `app.json` : `"scheme": "femmedafrique"`, `associatedDomains` iOS, `intentFilters` Android avec `autoVerify: true`
  - `RootNavigator.tsx` : objet `linking` complet sur le `NavigationContainer`
- **Routes configurées** :
  - `femmedafrique://article/:id` → `ArticleDetail`
  - `femmedafrique://categorie/:categoryId` → `CategoryArticles`
  - `femmedafrique://articles` → `AllArticles`
  - `femmedafrique://connexion` → `AuthScreen`
  - `femmedafrique://checkout` → `Checkout`
- **Fichiers** : `app.json`, `src/navigation/RootNavigator.tsx`

---

## ⚠️ Problèmes ouverts

### P1 — Preview web vide (CORS headers dupliqués)
- **Sévérité** : Faible (impacte uniquement le preview Replit, pas les builds natifs)
- **Cause** : `femmedafrique.net` renvoie deux fois `Access-Control-Allow-Origin: *`. Chrome rejette la réponse.
- **Responsabilité** : Serveur WordPress (nginx/Apache) — hors périmètre app
- **Workaround** : Les builds Android/iOS natifs fonctionnent normalement (CORS ne s'applique pas)
- **Résolution recommandée** : Corriger la config nginx/Apache pour ne renvoyer l'en-tête CORS qu'une seule fois

### P2 — Fichiers `.well-known` à déployer
- **Sévérité** : Moyenne (les App Links / Universal Links ne fonctionnent pas sans ces fichiers)
- **Cause** : Les fichiers de vérification domaine ne sont pas encore déployés sur `femmedafrique.net`
- **Action requise** :
  1. Déployer `/.well-known/apple-app-site-association` (iOS Universal Links)
  2. Déployer `/.well-known/assetlinks.json` avec le SHA256 de la keystore (Android App Links)
  - Voir `CONTEXT.md` pour le contenu exact des fichiers

### P3 — SHA256 keystore Android manquant
- **Sévérité** : Moyenne (bloque la vérification App Links Android)
- **Action requise** : Extraire le SHA256 avec `keytool -list -v -keystore FDA.keystore` et le renseigner dans `assetlinks.json`

---

## 📊 État par fonctionnalité

| Fonctionnalité | Build EAS Android | Preview Web Replit |
|---|---|---|
| Articles WordPress | ✅ | ❌ CORS serveur |
| Navigation / Tabs | ✅ | ✅ |
| Deep Links (scheme) | ✅ | N/A |
| Deep Links (Universal/App) | ⚠️ (fichiers .well-known manquants) | N/A |
| Supabase (favoris, profil) | ✅ | ✅ |
| Paiements TwigaPaie | ✅ | ✅ |
| Notifications OneSignal | ✅ | 🔵 simulé |
| Analytics Firebase | ✅ | ✅ |
| Upload photo (Uploadcare) | ✅ | ✅ |
| Mode hors-ligne | ✅ | ✅ |
| Auth WordPress JWT | ✅ | ❌ CORS serveur |

---

## 🔍 Commandes de diagnostic

```bash
# Vérifier les builds EAS
eas build:list --platform android

# Logs d'un build spécifique
eas build:view <BUILD_ID>

# Tester les deep links Android (appareil connecté)
adb shell am start -W -a android.intent.action.VIEW \
  -d "femmedafrique://article/23064" com.defmaks.fda

# Vérifier les en-têtes CORS WordPress
curl -I "https://femmedafrique.net/wp-json/wp/v2/posts?per_page=1" \
  | grep -i "access-control"

# Vérifier assetlinks.json
curl "https://femmedafrique.net/.well-known/assetlinks.json"

# Vérifier apple-app-site-association
curl "https://femmedafrique.net/.well-known/apple-app-site-association"
```
