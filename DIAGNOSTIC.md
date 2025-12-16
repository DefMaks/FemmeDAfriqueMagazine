# 🔍 Diagnostic - Preview n'affiche rien

## Commandes de diagnostic

```bash
# 1. Vérifier que le fichier .env existe
ls -la /app/.env

# 2. Voir le contenu du .env
cat /app/.env

# 3. Vérifier les processus en cours
ps aux | grep node

# 4. Killer tous les processus node
killall -9 node

# 5. Clear tous les caches
rm -rf /app/.expo
rm -rf /app/node_modules/.cache
rm -rf ~/.expo

# 6. Redémarrer avec cache vidé
cd /app
yarn start --clear

# 7. Vérifier les logs Metro
# Regarder dans le terminal pour:
# ✅ Supabase configured
# ✅ OneSignal initialized
# ❌ Erreurs de compilation

# 8. Si Web preview ne marche pas, essayer:
yarn web

# 9. Vérifier la compilation TypeScript
npx tsc --noEmit || echo "TypeScript errors found"
```

## Problèmes courants

### 1. Preview vide / blanc
**Causes**:
- Cache non vidé
- Variables d'environnement non chargées
- Erreur JavaScript non affichée
- Port déjà utilisé

**Solution**:
```bash
killall -9 node
cd /app
yarn start --clear
```

### 2. "Cannot find module"
**Solution**:
```bash
rm -rf node_modules
yarn install
yarn start --clear
```

### 3. Erreur OneSignal
**Solution**: Déjà corrigé avec try-catch dynamique

### 4. Erreur Supabase
**Solution**: Déjà corrigé avec fallbacks

## Logs attendus

```
✅ Supabase configured: https://hcpogyjdbtcxndzpyjvd...
✅ OneSignal initialized
📱 Metro bundler started
🌐 Web preview available at: http://localhost:19006
```

## Erreurs à NE PAS voir

```
❌ Error: supabaseUrl is required
❌ Cannot find module 'react-native-onesignal'
❌ Invariant Violation
❌ Element type is invalid
```
