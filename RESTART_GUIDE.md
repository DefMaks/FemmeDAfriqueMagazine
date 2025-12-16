# 🔄 Guide de Redémarrage - Variables d'Environnement

## ⚠️ IMPORTANT: Après modification du .env

Les variables d'environnement dans Expo/React Native nécessitent un **redémarrage complet** de l'application.

---

## 📋 Procédure de Redémarrage

### 1. Arrêter Expo complètement
```bash
# Dans le terminal où Expo tourne, faire:
Ctrl + C

# OU tuer tous les processus Expo:
killall -9 node
```

### 2. Clear le cache Metro
```bash
cd /app

# Clear cache Expo
expo start --clear

# OU si vous avez déjà expo en cours:
yarn start --clear
```

### 3. Rebuild si nécessaire (iOS/Android)
```bash
# Pour iOS
yarn ios

# Pour Android  
yarn android

# Pour Web
yarn web
```

---

## ✅ Vérification des Variables

Après redémarrage, vérifier dans les logs:

### Logs attendus:
```
✅ Supabase configured: https://hcpogyjdbtcxndzpyjvd.supabase.co
✅ TwigaPaie configured
🔔 OneSignal initialized
```

### Erreurs possibles:
```
⚠️ CRITICAL: Supabase credentials are missing!
⚠️ WARNING: TwigaPaie API key is not configured
```

---

## 🐛 Troubleshooting

### Problème 1: Variables toujours vides après redémarrage

**Solution**:
```bash
# 1. Supprimer node_modules
rm -rf node_modules

# 2. Supprimer les caches
rm -rf .expo
rm -rf ~/.expo

# 3. Réinstaller
yarn install

# 4. Redémarrer avec clear cache
yarn start --clear
```

### Problème 2: "supabaseUrl is required"

**Causes possibles**:
- Le fichier `.env` n'existe pas à la racine du projet
- Les variables ne commencent pas par `EXPO_PUBLIC_`
- Le cache n'a pas été vidé

**Solution**:
```bash
# Vérifier que .env existe
ls -la .env

# Vérifier le contenu
cat .env

# S'assurer que les variables commencent par EXPO_PUBLIC_
# CORRECT: EXPO_PUBLIC_SUPABASE_URL
# INCORRECT: SUPABASE_URL

# Clear cache et redémarrer
expo start --clear
```

### Problème 3: OneSignal "Unrecognized module"

**Solution**:
```bash
# Installer la dépendance manquante
yarn add react-native-onesignal

# Rebuild
yarn ios  # ou yarn android
```

---

## 📝 Variables d'Environnement Configurées

Votre `.env` actuel:

```env
# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://hcpogyjdbtcxndzpyjvd.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...

# TwigaPaie
EXPO_PUBLIC_TWIGAPAIE_API_URL=https://api-gateway-production-9ad5.up.railway.app
EXPO_PUBLIC_TWIGAPAIE_API_KEY=e50a2ac2...

# Wallet
EXPO_PUBLIC_WALLET_ID=9c70bf66-ad64-4693-9973-8f1e26af9f3a

# WordPress
EXPO_PUBLIC_WORDPRESS_API_URL=https://femmedafrique.net/wp-json/wp/v2/

# OneSignal
EXPO_PUBLIC_ONESIGNAL_APP_ID=e9dda2dd-a0c7-4221-ad6c-71ce91c540ce
```

---

## 🎯 Checklist de Vérification

- [ ] Fichier `.env` existe à la racine `/app/.env`
- [ ] Toutes les variables commencent par `EXPO_PUBLIC_`
- [ ] `app.config.js` charge les variables dans `extra`
- [ ] Cache Expo vidé avec `--clear`
- [ ] Application redémarrée complètement
- [ ] Logs montrent "✅ Supabase configured"
- [ ] Pas d'erreur "supabaseUrl is required"
- [ ] OneSignal initialisé correctement

---

## 🚀 Commandes Rapides

```bash
# Redémarrage complet (recommandé)
killall -9 node && expo start --clear

# Ou avec yarn
yarn start --clear

# Rebuild iOS
yarn ios

# Rebuild Android
yarn android
```

---

## 📞 Support

Si le problème persiste après avoir suivi ce guide:

1. Vérifier que `.env` est bien à la racine du projet
2. Vérifier que les variables sont bien exportées dans `app.config.js`
3. Essayer de hardcoder temporairement dans `supabase.config.ts` pour tester
4. Consulter les logs Expo pour plus de détails

---

**Dernière mise à jour**: Janvier 2025
