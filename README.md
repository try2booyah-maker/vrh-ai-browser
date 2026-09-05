# VRH.AI — Intelligent Browser Copilot

VRH.AI is an open-source, autonomous browser copilot extension designed to help you ask questions, automate browser tasks, summarize text, translate languages, and improve writing—directly within Chrome.

---

## 🌟 Key Features

- **Autonomous Agent Mode**: Control tabs, click buttons, scroll, type text, and navigate pages using an LLM-driven browser controller.
- **Direct Ask/Chat Mode**: Access active page text context, attach files, and chat with models seamlessly.
- **Page Summary**: Extract key takeaways as bullets, paragraphs, or a quick TL;DR.
- **Writing Tools**: Compose new content, rewrite paragraphs, and fix grammar in multiple tones.
- **Translator**: Translate selected text between several languages.
- **Quick Selection Toolbar**: Highlight any page text to quickly call explanation, summary, translation, or rewriting.
- **PDF Reading**: Extract text directly from PDF files opened in the browser.
- **File Attachments**: Attach local text/code files to provide context for AI conversations.

---

## 📂 Repository Layout

```
/
├── extension/                 # Chrome Extension Codebase
│   ├── manifest.json          # Extension Manifest v3
│   ├── background/
│   │   └── background.js      # Service Worker Lifecycle Controller
│   ├── content/
│   │   └── content.js         # Page DOM Scraper and Highlight Interactor
│   ├── sidepanel/
│   │   ├── sidepanel.html     # Main Panel Layout UI
│   │   ├── sidepanel.js       # Main Panel Controller
│   │   └── sidepanel.css      # Custom HSL-tailored Dark/Light CSS
│   ├── settings/
│   │   ├── settings.html      # Options Page Layout UI
│   │   ├── settings.js        # Options Controller (JSON backup/pools)
│   │   └── settings.css       # Options Styling
│   └── legal/
│       ├── privacy.html       # Privacy Policy Page
│       └── terms.html         # Terms of Service Page
├── store-assets/              # Chrome Web Store listing assets
│   └── web_store_assets.md    # Store listing description & copy
├── tests/                     # Test Suites
│   └── test_extension.js      # Puppeteer Extension E2E script
├── .gitignore                 # File exclusion list
└── README.md                  # Project Documentation (this file)
```

---

## 🚀 Setup & Installation

### 1. Load Chrome Extension

1. Open Google Chrome.
2. Navigate to `chrome://extensions/`.
3. Toggle the **Developer mode** switch in the top-right corner.
4. Click on **Load unpacked** in the top-left.
5. Select the **`extension/`** directory in this project folder.
6. The extension icon will appear in your toolbar. Click it to open the side panel!

---

### 2. Extension Options & Model Pool Setup

1. Open the extension side panel.
2. Click the ⚙️ (Settings) icon.
3. In the **Providers** tab, paste your **OpenRouter API Key**.
4. In the **Model Access Pool**, click **Add model** to search and select models from OpenRouter's catalog (both free and paid models are available).
5. Choose your default theme (Dark, Light, or System) and click save where needed.

> **Note**: VRH.AI connects directly to OpenRouter. No backend server is required. All API calls are made client-side from the extension using your configured API key.

---

## 🧪 E2E Puppeteer Testing

We use Puppeteer to load the extension automatically and verify page rendering.

1. Ensure Node.js is installed.
2. Install Puppeteer:
   ```bash
   npm install puppeteer
   ```
3. Run E2E tests:
   ```bash
   node tests/test_extension.js
   ```
4. Check the `tests/` directory for generated test screenshots.

---

## 📄 License

This project is open-source and licensed under the [MIT License](LICENSE).
