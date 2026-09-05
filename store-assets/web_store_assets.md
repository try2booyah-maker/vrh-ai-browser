# VRH.AI Chrome Web Store Publication Guidelines & Asset Directory

This directory stores branding assets, promotional graphic guidelines, and store listing copy templates required for submitting **VRH.AI** Chrome Copilot to the Google Chrome Web Store.

---

## 🎨 1. Branding Assets Checklists

### Required Extension Icons (Placeholders to be replaced by compiled PNG assets)
The following icon assets should be placed inside `extension/assets/icons/` (referenced in `manifest.json`):
*   `icon16.png` - 16x16px (Displayed on extension options page and favicon menu).
*   `icon32.png` - 32x32px (Used for Windows and general browser address bars).
*   `icon48.png` - 48x48px (Displayed on the extensions management page `chrome://extensions`).
*   `icon128.png` - 128x128px (Displayed in Chrome Web Store listing).

### Promotional Store Graphics
Place these in the `/store-assets` folder when final designs are generated:
1.  **Small Promotion Tile** (Mandatory): `promo_tile_small.png`
    *   **Dimensions**: 440 x 280 pixels
    *   **Goal**: Visually describe the core summary/rewrite feature in a single, high-contrast mockup.
2.  **Large Promotion Tile** (Optional): `promo_tile_large.png`
    *   **Dimensions**: 920 x 680 pixels
    *   **Goal**: Showcase the sidebar design with a beautiful floating glassmorphism mockup.
3.  **Marquee Promotion Tile** (Optional): `promo_tile_marquee.png`
    *   **Dimensions**: 1400 x 560 pixels
    *   **Goal**: Large hero branding grid. Keep text minimal, focus on a premium gradient visual theme.

---

## 📝 2. Chrome Web Store Listing Templates

### Listing Title
`VRH.AI Chrome Copilot — Autonomous Browser Assistant` *(Limit: 45 characters)*

### Short Description
`An autonomous browser assistant and text companion that translates, summarizes, rewrites, and interacts directly with active tabs.` *(Limit: 132 characters)*

### Long Detailed Description (Markdown formatting allowed in some store sections)
```markdown
VRH.AI is a premium, open-source browser copilot and autonomous co-agent designed to supercharge your web navigation, reading, and content drafting.

With a focus on speed, utility, and gorgeous glassmorphism aesthetics, VRH.AI integrates seamlessly into your Chromium browser to offer sidebar tools and contextual assistance on highlighted text.

🚀 KEY FEATURES:
1. Autonomous Agent Mode: Instruct VRH.AI to execute page clicks, type text, scroll, or navigate to complete multi-step tasks autonomously.
2. Instant Text Assistant: Highlight any text on a webpage to explain, summarize, translate, or rewrite it instantly in 1 click.
3. Interactive Chat with Context: Chat with your open tab context, upload local files, or ask general questions.
4. Connection Diagnostics: Keep track of latency, test connection pathways, and manage API keys easily.
5. Developer BYOK Mode: Connect to OpenRouter keyless via our server proxy, or bring your own API key to customize model routing.

🛡️ PRIVACY BY DESIGN:
Your preferences, exclusions, and chat logs are stored strictly inside your local browser sandbox (`chrome.storage.local`). Exclusions permit blacklisting domains where the extension toolbar should never inject.
```

---

## 🏷️ 3. Meta Categories & Search Keywords

*   **Primary Store Category**: Productivity / Developer Tools
*   **Search Keywords / Tags**:
    1. `AI Copilot`
    2. `Browser Agent`
    3. `Page Summarizer`
    4. `AI Translator`
    5. `Autonomous AI`
