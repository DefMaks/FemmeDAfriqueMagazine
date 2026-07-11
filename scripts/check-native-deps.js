#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const pkgPath = path.resolve(process.cwd(), 'package.json');
if (!fs.existsSync(pkgPath)) {
  console.error('package.json not found in project root');
  process.exit(1);
}

try {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const banned = ['react-native-worklets', '@react-native-community/blur'];
  const present = banned.filter(name => (pkg.dependencies && pkg.dependencies[name]) || (pkg.devDependencies && pkg.devDependencies[name]));
  if (present.length > 0) {
    console.error('❌ Incompatible native dependency found:', present.join(', '));
    process.exit(1);
  }
  console.log('✅ No known incompatible native deps present.');
  process.exit(0);
} catch (err) {
  console.error('Failed to read/parse package.json:', err);
  process.exit(1);
}
