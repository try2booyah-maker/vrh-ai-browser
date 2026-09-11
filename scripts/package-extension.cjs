/**
 * Package Extension for Chrome Web Store
 * Compresses the extension/ folder into dist/vrh-ai-browser-v2.0.0.zip
 * excluding any test files, node_modules, or development artifacts.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const extensionDir = path.join(rootDir, 'extension');
const distDir = path.join(rootDir, 'dist');
const manifest = JSON.parse(fs.readFileSync(path.join(extensionDir, 'manifest.json'), 'utf8'));
const version = manifest.version || '2.0.0';
const zipName = `vrh-ai-browser-v${version}.zip`;
const zipPath = path.join(distDir, zipName);

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

console.log(`[VRH.AI] Packaging extension v${version}...`);
console.log(`Source: ${extensionDir}`);
console.log(`Destination: ${zipPath}`);

if (fs.existsSync(zipPath)) {
  fs.unlinkSync(zipPath);
}

try {
  if (process.platform === 'win32') {
    // Windows PowerShell Compress-Archive
    execSync(
      `powershell -NoProfile -Command "Compress-Archive -Path '${extensionDir}\\*' -DestinationPath '${zipPath}' -Force"`,
      { stdio: 'inherit', cwd: rootDir }
    );
  } else {
    // macOS / Linux zip command
    execSync(`cd "${extensionDir}" && zip -r "${zipPath}" ./*`, { stdio: 'inherit', shell: '/bin/bash' });
  }

  const stats = fs.statSync(zipPath);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  console.log(`✅ Package created successfully: ${zipName} (${sizeMB} MB)`);
  console.log(`Ready for upload to Chrome Web Store Developer Dashboard.`);
} catch (err) {
  console.error(`❌ Packaging failed:`, err.message);
  process.exit(1);
}
