# VRH.AI — Chrome Web Store Submission & Publishing Kit

This document provides exact, copy-paste ready fields, disclosures, permission justifications, and asset references required for submitting **VRH.AI** to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).

---

## 📦 1. Package File

* **Upload File**: `dist/vrh-ai-browser-v2.0.0.zip` (Generated via `npm run package`)
* **Manifest Version**: 3
* **Extension Version**: 2.0.0

---

## 📝 2. Store Listing Information

### Extension Name / Title *(Limit: 45 characters)*
```text
VRH.AI — Autonomous Browser Copilot & Agent
```
*(Length: 43 characters)*

### Summary / Short Description *(Limit: 132 characters)*
```text
Autonomous AI copilot: live tab Q&A, multi-tab context, task automation, visual OCR, summarization, and in-browser writing assistance.
```
*(Length: 130 characters)*

### Category
* **Primary Category**: Productivity
* **Secondary Category** (if requested): Developer Tools

### Language
* **Default Language**: English (United States)

---

## 📄 3. Detailed Description *(Markdown / Plain Text)*

```text
VRH.AI is an open-source, private, autonomous browser copilot and co-agent built directly into Google Chrome. It supercharges your daily browsing, reading, document synthesis, and repetitive web tasks with modern frontier AI models.

Connect your favorite provider using Bring-Your-Own-Key (BYOK): OpenRouter, Groq (ultra-fast inference), OpenAI, Anthropic Claude, Google Gemini, or local Ollama instances.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚡ THE 9 SUPERPOWERS OF VRH.AI
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. 🌐 Live Active Tab Copilot (/ask)
Instantly chat with the webpage you are viewing. Ask questions, extract structured tables, parse articles, and get factual answers grounded in the real-time DOM of your current tab.

2. 🤖 Autonomous Browser Agent (/agent)
Delegate multi-step web tasks to an intelligent agent. Using visual Set-of-Marks perception and Chrome DevTools Protocol (CDP), VRH.AI can navigate pages, click buttons, fill forms, and paginate search results. All sensitive actions (checkout buttons, credentials, payments) are strictly intercepted by hardware-level security gates requiring your confirmation.

3. 📑 Multi-Tab Cross-Context (@ mentions)
Query multiple open tabs at once. Type "@" in the chat to select open tabs; VRH.AI proportionally budgets and merges content across tabs for unified comparative analysis, market research, or code review.

4. 👁️ Vision & Multimodal Understanding
Attach screenshots and visual elements directly into the prompt. VRH.AI auto-detects vision-capable models (e.g., Claude 3.5 Sonnet, GPT-4o, Gemini 1.5 Pro) and passes image buffers seamlessly.

5. 📄 Offline PDF Extraction & OCR
Read and analyze PDF documents directly inside Chrome. Includes vendored Mozilla pdf.js engine and client-side Tesseract.js OCR to extract text from scanned images and digital documents with zero external server dependencies.

6. ⚡ Instant Page Summarizer
Switch to the Summarize tab to distill long documents into 3 actionable formats: Key Bullet Points, Executive Paragraph, or a 1-sentence TL;DR.

7. 💬 In-Page Selection Toolbar
Highlight any text on any webpage to trigger the floating quick-action toolbar:
- 💡 Explain: Simple explanations of complex jargon.
- 📝 Summarize: Immediate summary of selected excerpts.
- 🌐 Translate: Multi-language translation.
- ✨ Rewrite: Tone and grammar polish (Professional, Casual, Concise).
- 💬 Ask VRH: Inserts selected quotes straight into your sidepanel conversation.

8. ⌨️ Slash Commands
Fast command routing from the chat bar:
- /agent <task> — Launch autonomous web agent
- /ask <query> — Query active tab
- /summarize — Open page summarization
- /write <prompt> — Draft emails, articles, or responses
- /translate <text> — Translate text on the fly

9. 🔒 100% Client-Side Privacy (BYOK)
Your keys, chat history, and preferences stay on your machine in chrome.storage.local. VRH.AI communicates directly from your browser to your chosen AI endpoint. No intermediate servers, no telemetry, no tracking.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎨 DESIGNED FOR SPEED & COMFORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Side Panel Native: Runs alongside your browsing without obscuring content.
- Dual Theme Engine: Warm Cream-White for daytime focus and Obsidian Dark for low-light immersion.
- Built-in Diagnostics: Live latency testing across all configured model providers.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔒 PRIVACY & PERMISSIONS POLICY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VRH.AI is open-source. We believe your web data belongs exclusively to you.
- Open Source: https://github.com/try2booyah-maker/vrh-ai-browser
- Privacy Policy: https://try2booyah-maker.github.io/vrh-ai-browser/legal/privacy.html
- Terms of Service: https://try2booyah-maker.github.io/vrh-ai-browser/legal/terms.html
```

---

## 🛡️ 4. Single Purpose Declaration *(Google Developer Policy)*

**Google Prompt**: *"Explain how your extension fulfills a single purpose."*

**Copy-Paste Statement**:
```text
VRH.AI serves a single unified purpose: providing a context-aware AI copilot and autonomous browser assistant inside Google Chrome to analyze web content, answer questions about active pages, summarize documents, and execute user-directed navigation tasks upon explicit instruction.
```

---

## 🔑 5. Permission Justifications *(Required for Chrome Store Review)*

Google reviewers require detailed technical justifications for all declared permissions:

| Permission | Justification for Reviewer |
| :--- | :--- |
| **`activeTab` / `tabs`** | Required to read the DOM text of the currently open tab when the user queries the copilot, to switch tabs during multi-tab `@` context aggregation, and to navigate tabs when the user explicitly triggers an autonomous agent workflow. |
| **`storage`** | Required to store user preferences, custom theme selections (Light/Dark), configured model lists, and user-supplied BYOK API keys locally inside the browser sandbox (`chrome.storage.local`). No data is sent to developer servers. |
| **`debugger`** | Required exclusively for the autonomous browser agent mode. When the user initiates an `/agent` task, the extension attaches via Chrome DevTools Protocol (CDP) to dispatch simulated clicks, keystrokes, and Set-of-Marks coordinate tracking. All sensitive actions (e.g. purchases, forms) require manual user approval. |
| **`webNavigation`** | Required during autonomous agent execution to detect page navigation states and DOM readiness, ensuring the agent waits for dynamic pages to complete loading before attempting subsequent steps. |
| **`alarms`** | Required for background keep-alive pings during multi-step autonomous agent execution, preventing the Manifest V3 service worker from terminating prematurely mid-task. |
| **`scripting`** | Required to inject the lightweight in-page selection toolbar (`content.js`) when the user selects text on a web page to offer one-click Explain, Summarize, Rewrite, and Ask actions. |
| **Host Permissions (`<all_urls>`)** | Required to enable the side panel copilot and selection toolbar across all web domains where the user chooses to browse and invoke AI assistance. |

---

## 🔒 6. Privacy Practices Questionnaire

When filling out the **Privacy Practices** tab in the Developer Dashboard:

1. **Single Purpose**: Check the box confirming compliance.
2. **User Data Disclosure**:
   * **Website Content**: Check "Yes" (Needed to extract page text for answering user questions).
   * **Authentication Information**: Check "Yes" (Only for BYOK API keys stored locally in `chrome.storage.local`).
3. **Data Usage Certifications**:
   * ✅ "I certify that my extension does not sell user data to third parties."
   * ✅ "I certify that my extension does not use or transfer user data for purposes unrelated to the item's core functionality."
   * ✅ "I certify that my extension does not use or transfer user data to determine creditworthiness or for lending purposes."
4. **Data Transmission**:
   * Data is transmitted directly from the client browser to the user's chosen LLM API provider (OpenRouter, Groq, OpenAI, Anthropic, Gemini, or Ollama) using the user's own API credentials.
   * No data is transmitted to or stored on any developer-operated servers.

---

## 🎨 7. Graphic Assets Checklist

All graphic assets are prepared and verified in the repository:

| Asset | Specifications | Location | Status |
| :--- | :--- | :--- | :--- |
| **Store Icon** | 128 x 128 px PNG | `extension/assets/icons/icon128.png` | ✅ Ready |
| **Small Promo Tile** | 440 x 280 px PNG | `store-assets/promo_tile_small.png` | ✅ Ready |
| **Screenshot 1** | 1280 x 800 px PNG | `store-assets/screenshots/1-capabilities-dark.png` | ✅ Ready |
| **Screenshot 2** | 1280 x 800 px PNG | `store-assets/screenshots/2-capabilities-light.png` | ✅ Ready |
| **Screenshot 3** | 1280 x 800 px PNG | `store-assets/screenshots/3-summarize-mode.png` | ✅ Ready |
| **Screenshot 4** | 1280 x 800 px PNG | `store-assets/screenshots/4-multi-provider-settings.png` | ✅ Ready |
| **Screenshot 5** | 1280 x 800 px PNG | `store-assets/screenshots/5-autonomous-agent.png` | ✅ Ready |

---

## 🚀 8. Submission Step-by-Step

1. Log in to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).
2. Click **Add new item**.
3. Drag & drop `dist/vrh-ai-browser-v2.0.0.zip`.
4. In the **Store Listing** tab:
   - Paste **Title**, **Summary**, and **Detailed Description** from Section 2 & 3 above.
   - Upload `extension/assets/icons/icon128.png` as the 128x128 store icon.
   - Upload the 5 screenshots from `store-assets/screenshots/`.
   - Upload `store-assets/promo_tile_small.png` as the Small Promo Tile.
5. In the **Privacy** tab:
   - Fill out the **Single Purpose** field from Section 4.
   - Copy-paste each **Permission Justification** from Section 5.
   - Answer the data usage questions according to Section 6.
   - Enter Privacy Policy URL: `https://try2booyah-maker.github.io/vrh-ai-browser/legal/privacy.html`
6. Click **Save draft**, then click **Submit for review**!
