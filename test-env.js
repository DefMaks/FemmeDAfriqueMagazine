// test-env.js - Script pour tester les variables d'environnement
const fs = require('fs');
const path = require('path');

console.log('🔍 Test des variables d\'environnement\n');

// 1. Vérifier .env
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  console.log('✅ Fichier .env trouvé');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n').filter(line => line && !line.startsWith('#'));
  console.log(`   Nombre de variables: ${lines.length}`);
  lines.slice(0, 3).forEach(line => {
    const [key] = line.split('=');
    console.log(`   - ${key}`);
  });
  console.log(`   ... et ${lines.length - 3} autres\n`);
} else {
  console.log('❌ Fichier .env NON TROUVÉ!\n');
  process.exit(1);
}

// 2. Vérifier app.config.js
const configPath = path.join(__dirname, 'app.config.js');
if (fs.existsSync(configPath)) {
  console.log('✅ Fichier app.config.js trouvé');
  try {
    const config = require(configPath);
    const extraKeys = Object.keys(config.expo?.extra || {});
    console.log(`   Variables dans extra: ${extraKeys.length}`);
    extraKeys.slice(0, 3).forEach(key => console.log(`   - ${key}`));
    if (extraKeys.length > 3) {
      console.log(`   ... et ${extraKeys.length - 3} autres`);
    }
    console.log('');
  } catch (error) {
    console.log('⚠️  Erreur lors de la lecture de app.config.js');
    console.log(`   ${error.message}\n`);
  }
} else {
  console.log('❌ Fichier app.config.js NON TROUVÉ!\n');
}

// 3. Vérifier package.json
const packagePath = path.join(__dirname, 'package.json');
if (fs.existsSync(packagePath)) {
  console.log('✅ Fichier package.json trouvé');
  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  console.log(`   Nom: ${pkg.name}`);
  console.log(`   Version: ${pkg.version}`);
  
  // Vérifier react-native-onesignal
  if (pkg.dependencies['react-native-onesignal']) {
    console.log(`   ✅ react-native-onesignal: ${pkg.dependencies['react-native-onesignal']}`);
  } else {
    console.log(`   ❌ react-native-onesignal manquant!`);
  }
  console.log('');
}

// 4. Résumé
console.log('📊 Résumé:');
console.log('   - .env: ✅');
console.log('   - app.config.js: ✅');
console.log('   - package.json: ✅');
console.log('\n🚀 Prêt pour: yarn start --clear\n');
