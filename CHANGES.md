name: prebuild-checks

on: push: branches: [ main ] pull_request: branches: [ main ]

jobs: check-native-deps: runs-on: ubuntu-latest steps: - uses: actions/checkout@v4 - name: Use Node.js 18 uses: actions/setup-node@v4 with: node-version: '18' - name: Install dependencies run: npm ci - name: Run native deps check run: npm run check-native-deps

(That block is exactly the YAML you added to .github/workflows/prebuild-checks.yml — it shouldn't be in the changelog.)
