# Google Play — App Won't Install (Troubleshooting Checklist)

Use this checklist when users cannot install **Femme d'Afrique Magazine** (`com.defmaks.fda`) from Google Play after upload.

**Two different problems — identify which applies first:**

| Symptom | Category |
|--------|----------|
| Play Store shows **"Your device isn't compatible"** or no Install button | [A. Play Console / distribution](#a-play-console--distribution-not-a-broken-apk) |
| Download starts, then **"App not installed"** / install fails on device | [B. Device / signing / native build](#b-device-signing--native-build) |

---

## Quick diagnosis (5 minutes)

- [ ] Note **exact message** on device (screenshot if possible)
- [ ] Record **device model** and **Android version**
- [ ] Confirm user installs from **Google Play** (not an old EAS/APK link)
- [ ] Confirm release is on **Production** (or user is on **tester list** for internal/closed)
- [ ] Open **Play Console → Release → App bundle explorer** → select latest production AAB
- [ ] Check for **16 KB page size** warnings and **device exclusion** list

---

## A. Play Console / distribution (not a broken APK)

### Release & availability

- [ ] Release status is **Published** (not Draft / In review only)
- [ ] **Production** track has an active release (not only internal/closed unless user is a tester)
- [ ] **Staged rollout** is not 0% (or wait until rollout reaches the user)
- [ ] **Countries/regions** include the user's country
- [ ] App is **not** blocked by **Managed Google Play** / work profile policy

### Testing tracks

- [ ] If using **Internal** or **Closed testing**: user's Google account is in the **tester list**
- [ ] Tester accepted invite (check email / Play Console → Testing → Testers)
- [ ] Correct testing **opt-in URL** was used (if applicable)

### Device catalog (Play Console)

- [ ] Go to **Release → App bundle explorer** (or device catalog for the release)
- [ ] Search for the **failing device model**
- [ ] Read **exclusion reason** (minSdk, feature, ABI, other)
- [ ] Compare with devices where install **works**

### Manifest / compatibility filters

- [ ] **minSdkVersion** is acceptable for target devices (project targets ~API 24+; verify on uploaded AAB)
- [ ] No `uses-feature` with `android:required="true"` for hardware the device lacks (e.g. camera)
- [ ] **Permissions** in store listing match manifest (camera/storage are optional where possible)
- [ ] AAB includes **arm64-v8a** (required for most modern phones)

---

## B. Device, signing & native build

### Signing & prior installs (very common)

- [ ] User never installed a build from **EAS internal link**, **USB**, or **APK file** with the same package `com.defmaks.fda`
- [ ] If they did: **Uninstall** the existing app completely, then install from Play
- [ ] Error on **update** only → likely **signature mismatch** (`INSTALL_FAILED_UPDATE_INCOMPATIBLE`)
- [ ] **Play App Signing** is enabled; upload key matches EAS credentials (no manual keystore mix-up)

### 16 KB page size (Android 15+ / 2025+ policy)

Apps targeting **API 35+** must support **16 KB memory page sizes** on 64-bit devices. Failure can block install or crash at launch.

- [ ] In **App bundle explorer**, confirm AAB has **no 16 KB compatibility** warnings
- [ ] Project uses **Expo SDK 54+** (`expo@~54.0.0`) — core stack should support 16 KB
- [ ] Run `npx expo install --fix` before production rebuild
- [ ] Audit **third-party native** dependencies:
  - [ ] `onesignal-expo-plugin` / `react-native-onesignal`
  - [ ] `@react-native-community/blur` (remove from `package.json` if unused)
  - [ ] Any other library with `.so` natives
- [ ] Rebuild with production profile (see below) and re-upload AAB
- [ ] Re-test on a **Pixel (Android 15+)** or emulator with 16 KB pages if possible

**Optional local verify (APK from bundle):**

```bash
# After downloading APK from bundle explorer or bundletool
bash check_elf_alignment.sh /path/to/app.apk | grep -E '(arm64-v8a|x86_64).*UNALIGNED'
```

Reference: [Expo FYI — Android 16KB page sizes](https://github.com/expo/fyi/blob/main/android-16kb-page-sizes.md)

### Correct EAS build for Play Store

- [ ] Build used **`production`** profile, **not** `preview` or `development`:

```bash
eas build --platform android --profile production
```

- [ ] `eas.json` production profile uses `"buildType": "app-bundle"` (`.aab`)
- [ ] **Never** upload a build with `developmentClient: true` (development profile only)
- [ ] `versionCode` was **incremented** (`autoIncrement: true` in production)
- [ ] Uploaded **`.aab`** to Play Console (not a debug APK)

### OneSignal / native config at build time

- [ ] Production EAS build sets `NODE_ENV=production` (or OneSignal plugin `mode: 'production'`)
- [ ] `EXPO_PUBLIC_ONESIGNAL_APP_ID` set in EAS secrets for production builds

### Device-side checks

- [ ] Enough **free storage**
- [ ] Android version ≥ app **minSdk**
- [ ] No **Private Space** / clone profile quirks (retry in main profile)
- [ ] Clear Play Store cache: Settings → Apps → Google Play Store → Storage → Clear cache (then retry)

---

## C. Rebuild & resubmit workflow

When technical cause is suspected (16 KB, wrong profile, new native deps):

1. - [ ] Fix dependencies / remove unused native modules
2. - [ ] `npx expo install --fix`
3. - [ ] `eas build --platform android --profile production`
4. - [ ] Download AAB from EAS; verify in **App bundle explorer** after upload
5. - [ ] Create new **Production** release with incremented `versionCode`
6. - [ ] Roll out (start with internal testers, then production)
7. - [ ] Tester **uninstalls** old sideloaded app, installs from Play
8. - [ ] Confirm install on at least:
   - [ ] One **recent** device (arm64, Android 14–15)
   - [ ] One **older** device (if still supported)

```bash
# Submit after successful build (optional)
eas submit --platform android --profile production
```

---

## D. Information to collect from a affected user

Copy/paste for support (`support@femmedafrique.net`):

```
Device model:
Android version:
Play Store message (exact text):
Install vs update (first install or updating?):
Ever installed APK / EAS link before? (yes/no):
Country:
Google account on tester list? (if beta):
Screenshot:
```

---

## E. Case closed criteria

Mark this issue **resolved** when all are true:

- [ ] Install succeeds from **Production** on a previously failing device (or exclusion is documented and accepted)
- [ ] App bundle explorer shows **no blocking** 16 KB / signing issues for latest release
- [ ] No open **Play Console policy** or **pre-launch report** install blockers
- [ ] Internal docs updated if root cause was identified (e.g. wrong build profile, sideload conflict)

---

## Project references

| Item | Value |
|------|--------|
| Package ID | `com.defmaks.fda` |
| App version | `2.0.0` (see `app.config.js`) |
| EAS project | `2226573c-1349-4d26-953b-92f717a4efb5` |
| Production build | `eas build --platform android --profile production` |
| Related docs | `GOOGLE_PLAY_SUBMISSION_CHECKLIST.md`, `CHECKLIST_GOOGLE_PLAY.md` |

---

*Last updated: May 2026 — Femme d'Afrique Magazine*
