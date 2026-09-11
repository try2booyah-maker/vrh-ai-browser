# VRH.AI — Autonomous Browser Copilot & Agent

[![Test Suite](https://img.shields.io/badge/tests-55%20passing-brightgreen.svg)](tests/)
[![Manifest V3](https://img.shields.io/badge/Chrome%20Extension-Manifest%20V3-blue.svg)](extension/manifest.json)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-2.0.0-purple.svg)](package.json)

**VRH.AI** is an open-source, private, autonomous browser copilot and co-agent built directly into Google Chrome. It supercharges your daily browsing, reading, document synthesis, and repetitive web tasks with modern frontier AI models—running 100% client-side with Bring-Your-Own-Key (BYOK) privacy.

---

## ⚡ The 9 Superpowers of VRH.AI

1. 🌐 **Live Tab Copilot (`/ask`)**: Instantly query active webpage DOM text with zero latency.
2. 🤖 **Autonomous Agent (`/agent`)**: Multi-step browser automation with Set-of-Marks visual perception, Chrome DevTools Protocol (CDP) execution, and sensitive action gating.
3. 📑 **Multi-Tab Cross-Context (`@` mentions)**: Tag multiple open tabs in your prompt to synthesize cross-tab context with proportional character budgeting.
4. 👁️ **Vision & Multimodal Input**: Seamlessly send screenshots and visual page buffers to vision models (GPT-4o, Claude 3.5 Sonnet, Gemini 1.5 Pro).
5. 📄 **Offline PDF & OCR**: Vendored Mozilla `pdf.js` for digital PDFs and `Tesseract.js` client-side OCR for scanned documents.
6. ⚡ **Instant Page Summarizer**: Switch to the Summarize tab to distill long documents into Key Bullet Points, Executive Paragraph, or a 1-sentence TL;DR.
7. 💬 **In-Page Selection Toolbar**: Highlight any text on any page for 1-click Explain, Summarize, Translate, Rewrite, or direct insertion into the sidepanel chat.
8. ⌨️ **Slash Commands**: Rapid command shortcuts (`/agent`, `/ask`, `/summarize`, `/write`, `/translate`).
9. 🔒 **100% Client-Side Privacy (BYOK)**: Supports OpenRouter, Groq, OpenAI, Anthropic Claude, Google Gemini, and local Ollama. Keys stay strictly in `chrome.storage.local`.

---

## 📂 Repository Layout

```text
/
├── extension/                     # Chrome Extension Source (Manifest V3)
│   ├── manifest.json              # Extension manifest & permissions
│   ├── background/
│   │   └── background.js          # Service Worker lifecycle & keep-alives
│   ├── content/
│   │   └── content.js             # In-page DOM scraper & floating selection toolbar
│   ├── sidepanel/
│   │   ├── sidepanel.html         # Native Chrome side panel layout
│   │   ├── sidepanel.js           # Core sidepanel controller & VRH persona engine
│   │   ├── sidepanel.css          # Cream-white & Obsidian dark mode styles
│   │   ├── agentRunner.js         # Autonomous agent execution loop
│   │   └── cdpController.js       # Chrome DevTools Protocol (CDP) driver
│   ├── settings/
│   │   ├── settings.html          # Options page & provider configuration UI
│   │   ├── settings.js            # Multi-provider management & latency tester
│   │   └── settings.css           # Settings page styling
│   ├── lib/                       # Vendored client-side engines
│   │   ├── pdfjs/                 # Mozilla pdf.js engine & worker
│   │   ├── tesseract/             # Tesseract.js OCR engine & worker
│   │   └── dompurify.min.js       # Strict HTML sanitization engine
│   └── legal/
│       ├── privacy.html           # Extension privacy policy
│       └── terms.html             # Extension terms of service
├── store-assets/                  # Chrome Web Store submission kit
│   ├── web_store_assets.md        # Store listing copy, justifications & disclosures
│   ├── promo_tile_small.png       # 440x280 small promo tile
│   └── screenshots/               # 1280x800 verified store screenshots (1 to 5)
├── scripts/
│   ├── package-extension.cjs      # Packaging pipeline for dist archive
│   └── generate-store-assets.cjs  # Store screenshot generator
├── tests/                         # Node.js automated test suites (55 tests)
├── dist/                          # Production distribution archives (.gitignore)
├── package.json                   # Project metadata & npm scripts
└── README.md                      # Project documentation (this file)
```

---

## 🚀 Setup & Installation

### Option A: Install from Production Package

1. Download or generate the production bundle:
   ```bash
   npm run package
   ```
2. Unzip `dist/vrh-ai-browser-v2.0.0.zip` into a local directory.
3. Open Google Chrome and navigate to `chrome://extensions/`.
4. Enable **Developer mode** in the top-right corner.
5. Click **Load unpacked** and select the unzipped directory (or the repository's `extension/` directory).
6. Click the extension icon in your Chrome toolbar to launch the Side Panel!

### Option B: Developer Setup

```bash
# Clone the repository
git clone https://github.com/try2booyah-maker/vrh-ai-browser.git
cd vrh-ai-browser

# Install devDependencies (for tests & packaging)
npm install

# Run automated verification test suite
npm test

# Build production zip archive
npm run package
```

---

## ⚙️ Model Provider Configuration

1. Open the Side Panel and click the ⚙️ (**Settings**) icon in the top header.
2. Under **Model Providers**, choose your preferred provider:
   - **Groq**: Ultra-fast low latency inference (Llama 3.3 70B, etc.)
   - **OpenRouter**: Access hundreds of models with flexible routing
   - **Anthropic**: Claude 3.5 Sonnet & Claude 3.5 Haiku
   - **OpenAI**: GPT-4o, GPT-4o-mini
   - **Google Gemini**: Gemini 1.5 Pro, Gemini 1.5 Flash
   - **Ollama**: Local, completely private offline models
3. Enter your API key and click **Test Connection** to check real-time latency.
4. Set your default model and start chatting!

---

## 🧪 Automated Testing Suite

VRH.AI includes a comprehensive, 55-test suite covering:
- **Agent Lifecycle & Sensitive Action Gating**: Hardware-level interception of payment/checkout forms.
- **VRH.AI System Persona Contract**: Ensuring models respond accurately as VRH.AI without leaking base provider defaults.
- **DOMPurify Sanitization**: Zero XSS tolerance across rendered markdown and live DOM data.
- **Exponential Backoff & Retries**: Robust HTTP 429/503 network resilience.
- **Multimodal & Multi-Tab Routing**: Proportional context budgeting across open tabs.
- **Vendored PDF & OCR Pipelines**: Text and image-based document extraction.

Run all tests:
```bash
npm test
```

---

## 📦 Publishing to Chrome Web Store

Everything needed for the Chrome Web Store Developer Console is packaged and documented:
1. Run `npm run package` to create `dist/vrh-ai-browser-v2.0.0.zip`.
2. Follow the step-by-step checklist in [`store-assets/web_store_assets.md`](store-assets/web_store_assets.md) for copy-paste descriptions, permission justifications, and store screenshots.

---

## 📄 License

Distributed under the [MIT License](LICENSE).
