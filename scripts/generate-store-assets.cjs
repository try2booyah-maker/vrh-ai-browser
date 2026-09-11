const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const BRAIN_DIR = 'C:/Users/boyin/.gemini/antigravity-ide/brain/7285fb66-cd6e-45a6-b530-fa186735a842';
const OUTPUT_DIR = path.join(__dirname, '..', 'store-assets', 'screenshots');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const screenshots = [
  {
    src: path.join(BRAIN_DIR, 'vrh_capabilities_dark_mode_1789135183093.png'),
    dest: path.join(OUTPUT_DIR, '1-capabilities-dark.png'),
    title: 'VRH.AI Capabilities — Obsidian Dark Mode'
  },
  {
    src: path.join(BRAIN_DIR, 'vrh_capabilities_light_mode_1789135172551.png'),
    dest: path.join(OUTPUT_DIR, '2-capabilities-light.png'),
    title: 'VRH.AI Capabilities — Warm Cream Light Mode'
  },
  {
    src: path.join(BRAIN_DIR, 'vrh_summarize_dark_mode_1789135193541.png'),
    dest: path.join(OUTPUT_DIR, '3-summarize-mode.png'),
    title: 'Instant Page Summarization & Key Takeaways'
  },
  {
    src: path.join(BRAIN_DIR, 'settings_page_groq_1788615242681.png'),
    dest: path.join(OUTPUT_DIR, '4-multi-provider-settings.png'),
    title: 'Multi-Provider Engine & Latency Diagnostics'
  },
  {
    src: path.join(BRAIN_DIR, 'agent_execution_card_1788713527214.png'),
    dest: path.join(OUTPUT_DIR, '5-autonomous-agent.png'),
    title: 'Autonomous Browser Agent & Set-of-Marks Navigation'
  }
];

async function generateScreenshots() {
  console.log('[VRH.AI] Generating Chrome Web Store 1280x800 screenshots...');

  for (const item of screenshots) {
    if (!fs.existsSync(item.src)) {
      console.warn(`Source not found: ${item.src}`);
      continue;
    }

    // Resize and pad to exactly 1280x800 with stylish obsidian dark background
    await sharp(item.src)
      .resize(1280, 800, {
        fit: 'contain',
        background: { r: 12, g: 14, b: 20, alpha: 1 } // #0c0e14 VRH Dark
      })
      .png({ quality: 95 })
      .toFile(item.dest);

    console.log(`Generated: ${path.basename(item.dest)}`);
  }

  // Generate Small Promo Tile 440x280
  const promoSrc = path.join(BRAIN_DIR, 'vrh_capabilities_dark_mode_1789135183093.png');
  const promoDest = path.join(__dirname, '..', 'store-assets', 'promo_tile_small.png');
  if (fs.existsSync(promoSrc)) {
    await sharp(promoSrc)
      .resize(440, 280, {
        fit: 'cover',
        position: 'top'
      })
      .png({ quality: 95 })
      .toFile(promoDest);
    console.log(`Generated: promo_tile_small.png (440x280)`);
  }
}

generateScreenshots().catch(console.error);
