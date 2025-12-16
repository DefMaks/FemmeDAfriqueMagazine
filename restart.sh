#!/bin/bash

echo "🔄 Redémarrage de l'application FDA..."

# 1. Tuer tous les processus Node
echo "1️⃣ Arrêt des processus en cours..."
killall -9 node 2>/dev/null || echo "Aucun processus Node à arrêter"

# 2. Nettoyer les caches
echo "2️⃣ Nettoyage des caches..."
rm -rf .expo
rm -rf node_modules/.cache
rm -rf ~/.expo/metro-cache

# 3. Vérifier que .env existe
echo "3️⃣ Vérification du .env..."
if [ -f ".env" ]; then
    echo "✅ .env trouvé"
    echo "Première ligne: $(head -n 1 .env)"
else
    echo "❌ .env manquant!"
    exit 1
fi

# 4. Vérifier node_modules
if [ ! -d "node_modules" ]; then
    echo "4️⃣ Installation des dépendances..."
    yarn install
else
    echo "4️⃣ node_modules présent ✅"
fi

# 5. Redémarrer Expo avec cache vidé
echo "5️⃣ Démarrage d'Expo avec cache vidé..."
echo ""
echo "🚀 Lancement de: yarn start --clear"
echo ""

yarn start --clear
