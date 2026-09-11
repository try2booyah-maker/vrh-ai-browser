/**
 * Create GitHub Release & Upload Production Zip Asset
 * Token is retrieved dynamically from environment or git configuration.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function getGitHubToken() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  try {
    const remoteUrl = execSync('git config --get remote.origin.url', { encoding: 'utf8' }).trim();
    const match = remoteUrl.match(/ghp_[a-zA-Z0-9]+/);
    if (match) return match[0];
  } catch (e) {}
  return null;
}

const GITHUB_TOKEN = getGitHubToken();
const REPO = 'try2booyah-maker/vrh-ai-browser';
const TAG = 'v2.0.0';
const RELEASE_NAME = 'VRH.AI v2.0.0 — Autonomous Browser Copilot & Multi-Provider Engine';

const zipPath = path.join(__dirname, '..', 'dist', 'vrh-ai-browser-v2.0.0.zip');

const releaseBody = `## 🚀 Welcome to VRH.AI v2.0.0!

**VRH.AI** is an open-source, private, autonomous browser copilot and co-agent built directly into Google Chrome. It supercharges your daily browsing, reading, document synthesis, and repetitive web tasks with modern frontier AI models—running 100% client-side with Bring-Your-Own-Key (BYOK) privacy.

### ⚡ The 9 Superpowers
1. 🌐 **Live Tab Copilot (\`/ask\`)**: Real-time DOM context Q&A with streaming responses.
2. 🤖 **Autonomous Web Agent (\`/agent\`)**: Set-of-Marks visual perception, CDP-level navigation, and sensitive action gating.
3. 📑 **Multi-Tab Cross-Context (\`@\` mentions)**: Synthesize context across multiple open tabs with proportional token budgeting.
4. 👁️ **Multimodal Vision**: Send screenshots and visual elements directly to vision-capable models (GPT-4o, Claude 3.5 Sonnet, Gemini 1.5 Pro).
5. 📄 **Offline PDF & Tesseract OCR**: Vendored Mozilla \`pdf.js\` and \`Tesseract.js\` for digital and scanned document extraction with zero external servers.
6. ⚡ **Instant Page Summarizer**: Distill pages into Key Bullets, Executive Paragraph, or a 1-sentence TL;DR.
7. 💬 **In-Page Selection Toolbar**: 1-click Explain, Summarize, Translate, Rewrite, and Ask VRH on highlighted text.
8. ⌨️ **Slash Commands**: \`/agent\`, \`/ask\`, \`/summarize\`, \`/write\`, \`/translate\`.
9. 🔒 **100% Client-Side Privacy (BYOK)**: Supports OpenRouter, Groq, Anthropic Claude, OpenAI, Google Gemini, and local Ollama.

### 📦 Quick Install
1. Download the attached \`vrh-ai-browser-v2.0.0.zip\` below and extract it.
2. Open Google Chrome and go to \`chrome://extensions/\`.
3. Turn ON **Developer mode** (top-right switch).
4. Click **Load unpacked** (top-left button) and select the extracted folder.
5. Click the VRH.AI icon in your Chrome toolbar to launch the copilot sidepanel!

---
**Full Changelog**: https://github.com/try2booyah-maker/vrh-ai-browser/commits/v2.0.0
`;

async function main() {
  if (!GITHUB_TOKEN) {
    console.error('❌ GITHUB_TOKEN not found in environment or git remote config.');
    process.exit(1);
  }

  console.log(`[VRH.AI] Checking releases on ${REPO}...`);

  // 1. Check if release already exists
  const listRes = await fetch(`https://api.github.com/repos/${REPO}/releases`, {
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'VRH-AI-Release-Script'
    }
  });

  if (!listRes.ok) {
    throw new Error(`Failed to list releases: ${listRes.status} ${await listRes.text()}`);
  }

  const releases = await listRes.json();
  let release = releases.find((r) => r.tag_name === TAG);

  if (release) {
    console.log(`Release ${TAG} already exists (ID: ${release.id}). Updating...`);
    const patchRes = await fetch(`https://api.github.com/repos/${REPO}/releases/${release.id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'VRH-AI-Release-Script'
      },
      body: JSON.stringify({
        name: RELEASE_NAME,
        body: releaseBody,
        draft: false,
        prerelease: false
      })
    });
    release = await patchRes.json();
  } else {
    console.log(`Creating new release for ${TAG}...`);
    const createRes = await fetch(`https://api.github.com/repos/${REPO}/releases`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'VRH-AI-Release-Script'
      },
      body: JSON.stringify({
        tag_name: TAG,
        target_commitish: 'main',
        name: RELEASE_NAME,
        body: releaseBody,
        draft: false,
        prerelease: false
      })
    });

    if (!createRes.ok) {
      throw new Error(`Failed to create release: ${createRes.status} ${await createRes.text()}`);
    }
    release = await createRes.json();
    console.log(`✅ Release created successfully! ID: ${release.id}`);
  }

  console.log(`Release URL: ${release.html_url}`);

  // 2. Upload zip asset
  if (!fs.existsSync(zipPath)) {
    throw new Error(`Zip asset not found at ${zipPath}. Run npm run package first.`);
  }

  const zipBuffer = fs.readFileSync(zipPath);
  const zipStats = fs.statSync(zipPath);
  const assetName = path.basename(zipPath);

  // Check if asset already attached
  if (release.assets && release.assets.length > 0) {
    const existingAsset = release.assets.find((a) => a.name === assetName);
    if (existingAsset) {
      console.log(`Deleting existing asset ${existingAsset.name} (ID: ${existingAsset.id})...`);
      await fetch(`https://api.github.com/repos/${REPO}/releases/assets/${existingAsset.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'VRH-AI-Release-Script'
        }
      });
    }
  }

  console.log(`Uploading asset ${assetName} (${(zipStats.size / (1024 * 1024)).toFixed(2)} MB)...`);

  const uploadUrl = release.upload_url.replace(/\{(\?name,label)?\}/, '') + `?name=${encodeURIComponent(assetName)}`;

  const uploadRes = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      'Content-Type': 'application/zip',
      'Content-Length': zipStats.size,
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'VRH-AI-Release-Script'
    },
    body: zipBuffer
  });

  if (!uploadRes.ok) {
    throw new Error(`Failed to upload asset: ${uploadRes.status} ${await uploadRes.text()}`);
  }

  const assetData = await uploadRes.json();
  console.log(`✅ Asset uploaded successfully!`);
  console.log(`Download URL: ${assetData.browser_download_url}`);
  console.log(`\n🎉 GitHub Release v2.0.0 is LIVE at: ${release.html_url}`);
}

main().catch((err) => {
  console.error('❌ Error creating release:', err);
  process.exit(1);
});
