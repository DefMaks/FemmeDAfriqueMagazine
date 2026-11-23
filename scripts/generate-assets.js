const Jimp = require('jimp-compact');
const path = require('path');
const fs = require('fs');

async function main() {
  const assetsDir = path.join(__dirname, '..', 'assets');
  const sourceGradient = path.join(assetsDir, 'FDA-gradient.png');

  console.log('Loading source image:', sourceGradient);
  const imgGrad = await Jimp.read(sourceGradient);

  // Crop the emblem alone (woman with amphora and African continent / globe)
  // Dimensions determined by histogram analysis: x: 17 to 910, y: 10 to 929
  const emblem = imgGrad.clone().crop(17, 10, 893, 919);
  
  // Crop text alone ("FEMME D'AFRIQUE Magazine")
  // x: 950 to 2590, y: 100 to 850
  const text = imgGrad.clone().crop(950, 100, 1640, 750);

  // ==========================================
  // 1. adaptive-icon.png (Android Adaptive Icon Foreground)
  // Canvas: 1024x1024, Transparent background (0x00000000)
  // Safe zone diameter: 66% ~ 675px. We size emblem to ~620px for ideal breathing room.
  // ==========================================
  const adaptiveIcon = new Jimp(1024, 1024, 0x00000000);
  const emblemAdaptive = emblem.clone().resize(620, Jimp.AUTO);
  const xAdapt = Math.round((1024 - emblemAdaptive.bitmap.width) / 2);
  const yAdapt = Math.round((1024 - emblemAdaptive.bitmap.height) / 2);
  adaptiveIcon.composite(emblemAdaptive, xAdapt, yAdapt);
  await adaptiveIcon.writeAsync(path.join(assetsDir, 'adaptive-icon.png'));
  console.log('Generated assets/adaptive-icon.png (1024x1024, transparent background, safe-zone centered)');

  // ==========================================
  // 2. icon.png (iOS App Icon & Fallback)
  // Canvas: 1024x1024, Opaque white background (0xFFFFFFFF)
  // Apple App Store strictly requires NO alpha channel in 1024x1024 app icon
  // ==========================================
  const appIcon = new Jimp(1024, 1024, 0xFFFFFFFF);
  const emblemIcon = emblem.clone().resize(620, Jimp.AUTO);
  const xIcon = Math.round((1024 - emblemIcon.bitmap.width) / 2);
  const yIcon = Math.round((1024 - emblemIcon.bitmap.height) / 2);
  appIcon.composite(emblemIcon, xIcon, yIcon);
  // Ensure no alpha (flatten on white)
  appIcon.background(0xFFFFFFFF);
  await appIcon.writeAsync(path.join(assetsDir, 'icon.png'));
  console.log('Generated assets/icon.png (1024x1024, solid white, no alpha)');

  // ==========================================
  // 3. splash-icon.png (Splash Screen image)
  // Canvas: 1024x1024, White background (0xFFFFFFFF)
  // Stacked prestigious layout: Emblem (top) + "FEMME D'AFRIQUE Magazine" (bottom)
  // ==========================================
  const splash = new Jimp(1024, 1024, 0xFFFFFFFF);
  const embSplash = emblem.clone().resize(480, Jimp.AUTO);
  const txtSplash = text.clone().resize(620, Jimp.AUTO);
  const gap = 30;
  const totalSplashHeight = embSplash.bitmap.height + gap + txtSplash.bitmap.height;
  const startYSplash = Math.round((1024 - totalSplashHeight) / 2);
  
  splash.composite(embSplash, Math.round((1024 - embSplash.bitmap.width) / 2), startYSplash);
  splash.composite(txtSplash, Math.round((1024 - txtSplash.bitmap.width) / 2), startYSplash + embSplash.bitmap.height + gap);
  await splash.writeAsync(path.join(assetsDir, 'splash-icon.png'));
  console.log('Generated assets/splash-icon.png (1024x1024, stacked centered logo)');

  // ==========================================
  // 4. favicon.png (Web Favicon)
  // Canvas: 192x192, Transparent background
  // ==========================================
  const favicon = new Jimp(192, 192, 0x00000000);
  const embFavicon = emblem.clone().resize(180, Jimp.AUTO);
  favicon.composite(embFavicon, Math.round((192 - embFavicon.bitmap.width) / 2), Math.round((192 - embFavicon.bitmap.height) / 2));
  await favicon.writeAsync(path.join(assetsDir, 'favicon.png'));
  console.log('Generated assets/favicon.png (192x192, transparent background)');

  // Clean up temporary scratch candidate files
  const scratchFiles = [
    'scratch_emblem_grad.png',
    'scratch_emblem_masc.png',
    'cand_icon_emblem_grad.png',
    'cand_icon_emblem_masc.png',
    'cand_icon_stacked.png',
    'cand_icon_horizontal.png',
    'cand_splash_full.png',
    'cand_splash_square.png',
    'splash_stacked.png',
    'splash_horizontal.png',
    'mask_test_original.png',
    'mask_test_stacked.png',
    'mask_test_emblem.png',
    'test_small_emblem.png',
    'test_small_stacked.png'
  ];
  for (const f of scratchFiles) {
    const p = path.join(assetsDir, f);
    if (fs.existsSync(p)) {
      fs.unlinkSync(p);
    }
  }
  console.log('Cleaned up scratch files.');
}

main().catch(err => {
  console.error('Error generating assets:', err);
  process.exit(1);
});
