const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <!-- Background Pure Cream-White Luxury Gradient -->
    <linearGradient id="creamBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="40%" stop-color="#fdfbf7" />
      <stop offset="100%" stop-color="#f4eee4" />
    </linearGradient>

    <!-- Warm Stone Hairline Rim Border -->
    <linearGradient id="creamBorder" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.9" />
      <stop offset="50%" stop-color="#d6cebf" stop-opacity="0.65" />
      <stop offset="100%" stop-color="#c4bbaa" stop-opacity="0.5" />
    </linearGradient>

    <!-- Soft Warm Ambient Radiance -->
    <radialGradient id="warmAura" cx="50%" cy="54%" r="46%">
      <stop offset="0%" stop-color="#e8e0d2" stop-opacity="0.55" />
      <stop offset="50%" stop-color="#f0ebe1" stop-opacity="0.25" />
      <stop offset="100%" stop-color="#f4eee4" stop-opacity="0" />
    </radialGradient>

    <!-- Left Wing: Deep Charcoal to Warm Espresso -->
    <linearGradient id="leftWing" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1c1917" />
      <stop offset="60%" stop-color="#292524" />
      <stop offset="100%" stop-color="#1c1917" />
    </linearGradient>

    <!-- Right Wing: Warm Espresso to Deep Graphite -->
    <linearGradient id="rightWing" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#292524" />
      <stop offset="60%" stop-color="#3c3733" />
      <stop offset="100%" stop-color="#262320" />
    </linearGradient>

    <!-- Wing Highlight Sheen -->
    <linearGradient id="wingSheen" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#f5efe6" stop-opacity="0.6" />
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.1" />
    </linearGradient>

    <!-- Subtle Drop Shadow Filter for Mark -->
    <filter id="markShadow" x="-15%" y="-15%" width="130%" height="130%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#382e22" flood-opacity="0.16" />
      <feDropShadow dx="0" dy="3" stdDeviation="6" flood-color="#1c1917" flood-opacity="0.08" />
    </filter>
  </defs>

  <!-- Base Squircle Container (Cream-White Theme) -->
  <rect x="20" y="20" width="472" height="472" rx="108" ry="108" fill="url(#creamBg)" stroke="url(#creamBorder)" stroke-width="5" />

  <!-- Ambient Warm Aura Behind Mark -->
  <circle cx="256" cy="285" r="165" fill="url(#warmAura)" />

  <!-- Monogram Mark -->
  <g id="vrh-mark" filter="url(#markShadow)">
    <!-- Left Wing -->
    <path d="M 108 132 L 192 132 L 256 276 L 256 420 L 236 420 Z" fill="url(#leftWing)" />

    <!-- Right Wing -->
    <path d="M 404 132 L 320 132 L 256 276 L 256 420 L 276 420 Z" fill="url(#rightWing)" />

    <!-- Top Left Cap Highlight -->
    <polygon points="108,132 192,132 182,148 118,148" fill="url(#wingSheen)" />

    <!-- Top Right Cap Highlight -->
    <polygon points="404,132 320,132 330,148 394,148" fill="url(#wingSheen)" opacity="0.8" />

    <!-- Center Precision Seam -->
    <line x1="256" y1="276" x2="256" y2="420" stroke="#fbf9f5" stroke-width="2.5" opacity="0.6" />
  </g>

  <!-- Top Curved Glass Specular Highlight -->
  <path d="M 32 120 C 32 68 68 32 120 32 L 392 32 C 444 32 480 68 480 120 C 340 144 172 160 32 120 Z" fill="#ffffff" opacity="0.45" />
</svg>`;

async function generate() {
  const iconDir = path.join(__dirname, '..', 'extension', 'assets', 'icons');
  if (!fs.existsSync(iconDir)) {
    fs.mkdirSync(iconDir, { recursive: true });
  }

  // Save SVG source of truth
  const svgPath = path.join(iconDir, 'icon.svg');
  fs.writeFileSync(svgPath, svgIcon.trim(), 'utf8');
  console.log(`Wrote SVG source: ${svgPath}`);

  // Also write to store-assets for publication packages
  const storeIconDir = path.join(__dirname, '..', 'store-assets');
  fs.writeFileSync(path.join(storeIconDir, 'icon.svg'), svgIcon.trim(), 'utf8');

  // Rasterize to 16, 32, 48, 128
  const sizes = [16, 32, 48, 128];
  for (const size of sizes) {
    const outPath = path.join(iconDir, `icon${size}.png`);
    await sharp(Buffer.from(svgIcon))
      .resize(size, size)
      .png({ compressionLevel: 9 })
      .toFile(outPath);
    console.log(`Generated ${size}x${size} icon: ${outPath}`);
  }
}

generate().catch(err => {
  console.error(err);
  process.exit(1);
});
