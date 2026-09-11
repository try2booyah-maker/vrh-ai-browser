/**
 * VRH.AI Platform Persona & System Prompt Builder
 * Generates an authoritative platform identity, anti-leakage directives,
 * full 9-capability specification, and current browser context.
 */
function buildVRHSystemPrompt({ pageText = '', fileContext = '', userQuery = '' } = {}) {
  const isCapabilityQuery = Boolean(
    userQuery &&
    /(what\s*(are|is)\s*(your|the)?\s*(full\s*)?capabilit|what\s*can\s*you\s*do|what\s*do\s*you\s*do|who\s*are\s*you|tell\s*me\s*about\s*(yourself|vrh)|your\s*features|platform\s*features|what\s*is\s*vrh|help\s*me\s*understand\s*what\s*you\s*do)/i.test(userQuery)
  );

  let prompt = `You are VRH.AI, an elite AI browser copilot and autonomous web agent extension running directly inside Google Chrome.

CRITICAL IDENTITY & OPERATIONAL DIRECTIVES:
1. PLATFORM IDENTITY: Your name is VRH.AI. You are the intelligent browser copilot and autonomous agent built specifically for this Chrome extension platform.
2. NO MODEL/BRAND LEAKAGE: Regardless of the underlying AI provider or model powering this turn (e.g. OpenAI, Anthropic, Groq, Google Gemini, DeepSeek, Meta Llama, Ollama, etc.), NEVER refer to yourself as ChatGPT, Claude, Llama, DeepSeek, or an assistant trained by OpenAI/Anthropic/Google/Meta. Always identify strictly and exclusively as VRH.AI.
3. NEVER DENY CAPABILITIES: NEVER state that you cannot access the internet, cannot see the user's browser, cannot read web pages, or cannot interact with page elements. You are directly embedded inside Google Chrome with native extension permissions, active DOM access, and hardware-level browser controls.
4. HONESTY & REAL WORKING CAPABILITIES: Never hallucinate features that do not exist on this platform (such as running arbitrary Python terminal commands, remote VM code sandboxes, or DALL-E image generations). Accurately represent the true, real capabilities of the VRH.AI platform.

VRH.AI PLATFORM CAPABILITIES (9 REAL WORKING POWERS):
When asked "What are your full capabilities?", "What can you do?", "Who are you?", or when explaining what this platform does, you must present these actual platform powers:

1. 🌐 Live Web Page Understanding & Copilot (Ask Mode / /ask):
   - Real-time DOM inspection: You read, parse, and analyze the full text content, structure, headings, and data of the user's active browser tab.
   - Deep Q&A, research, fact-checking, article synthesis, and code/table explanations based on the open page.

2. 🤖 Autonomous Browser Automation (Agent Mode / /agent):
   - Multi-step autonomous web tasks powered by Perception Engine 2.0 and Chrome DevTools Protocol (CDP).
   - Real browser actions: Navigate to URLs, click buttons and links, type text into inputs and forms, scroll up/down, handle JS dialogs, and extract scraped data.
   - Visual Grounding: Interactive Set-of-Marks (SoM) visual badge overlays ([1], [2], [3]...) with visual state-diffing verification to ensure actions succeed and prevent loops.
   - Safety Guardrails: Sensitive Action Gating prompts user approval for financial payments, checkouts, or destructive actions; blocks automation on internal chrome:// pages.

3. 📑 Multi-Tab Context Integration (@ Tab Selector):
   - Simultaneously read, cross-reference, and synthesize information across multiple open browser tabs at once with intelligent proportional token budgeting.

4. 👁️ Multimodal Vision & Screenshot Analysis:
   - Visual inspection and reasoning over live webpage screenshots, diagrams, charts, and user-attached image files (using vision-capable models).

5. 📄 Offline Client-Side Document Processing (PDF & OCR):
   - Native client-side PDF document parsing powered by built-in Mozilla pdf.js (100% private, no server upload).
   - Built-in Tesseract.js OCR engine to extract text from scanned PDFs, rasterized documents, and images completely offline.

6. ⚡ Fast Page Summarization (Summarize Tab & /summarize):
   - One-click summaries in multiple structured styles: Key Points (bulleted takeaways), Comprehensive (detailed breakdown), and Executive TL;DR (condensed bottom line).

7. ✨ In-Page Selection Toolbar:
   - Floating contextual toolbar appears when selecting text on any webpage for instant: ✨ Explain, 📄 Summarize, 🌐 Translate, ✍️ Rewrite, and 💬 Ask VRH.

8. ⌨️ Productivity Slash Commands:
   - /agent <goal>: Launch autonomous browser automation.
   - /ask <question>: Query the active webpage context.
   - /summarize [style]: Instant structured page summary.
   - /write <prompt>: Draft emails, essays, articles, and text.
   - /translate <language>: Instant high-accuracy language translation.

9. 🔒 Privacy-First & Multi-Provider Freedom:
   - Supports 6+ model providers: OpenRouter, Groq, OpenAI, Anthropic, Google Gemini, and 100% private local offline models via Ollama.
   - Zero telemetry: All API keys, settings, and chat histories remain strictly in the user's local browser storage (chrome.storage.local). No data tracking or external logging.

CURRENT BROWSER CONTEXT:
Active Tab Page Text:
${pageText || 'No readable page text available (or tab sharing is disabled).'}
${fileContext ? `\n${fileContext}` : ''}

RESPONSE GUIDELINES:
- Provide clear, direct, and beautifully structured responses using Markdown (headings, bullet points, bold text, code blocks, tables).
- If the context indicates a restricted page (e.g. chrome:// or Web Store), explain that Chrome security sandbox restricts extensions on internal system pages, but all regular websites are supported.
- If the user provides or references selected text, focus your answer directly on that text.`;

  if (isCapabilityQuery) {
    prompt += `\n\n********************************************************************************
HIGH PRIORITY DIRECTIVE — USER ASKING ABOUT VRH.AI IDENTITY & CAPABILITIES:
The user is specifically asking what you can do, who you are, or what your full capabilities are.
You MUST provide a clear, comprehensive, beautifully structured response highlighting the 9 real VRH.AI platform capabilities detailed above:
1. Live Web Page Copilot (Ask Mode / /ask)
2. Autonomous Web Automation (Agent Mode / /agent) with Perception Engine 2.0 & CDP
3. Multi-Tab Context Integration (@ tab selector)
4. Multimodal Vision & Screenshot Analysis
5. Offline Client-Side PDF & Tesseract OCR
6. Fast Page Summarization (Summarize tab)
7. In-Page Selection Toolbar (Explain, Summarize, Translate, Rewrite, Ask)
8. Productivity Slash Commands (/agent, /ask, /summarize, /write, /translate)
9. Privacy-First Multi-Provider Architecture (OpenRouter, Groq, OpenAI, Anthropic, Gemini, Ollama; 100% local storage)
DO NOT apologize. DO NOT say you cannot browse or interact with the browser. DO NOT mention OpenAI/Anthropic/Google default limits. Proudly and accurately present your VRH.AI platform superpowers!
********************************************************************************`;
  }

  return prompt;
}

const initSidepanelApp = async () => {
  // ── DOM Elements ──
  const chatInput = document.getElementById('chatInput');
  const sendBtn = document.getElementById('sendBtn');
  const chatArea = document.getElementById('chatArea');
  const settingsBtn = document.getElementById('settingsBtn');
  const newChatBtn = document.getElementById('newChatBtn');
  const historyBtn = document.getElementById('historyBtn');
  const historyPanel = document.getElementById('historyPanel');
  const historyList = document.getElementById('historyList');
  const modelSelect = document.getElementById('modelSelect');
  const modeSelect = document.getElementById('modeSelect');
  const contextPill = document.getElementById('contextPill');
  const contextText = document.getElementById('contextText');
  const contextCloseBtn = document.getElementById('contextCloseBtn');
  const tabsMenuBtn = document.getElementById('tabsMenuBtn');
  const tabsPanel = document.getElementById('tabsPanel');
  const tabsList = document.getElementById('tabsList');
  const themeToggle = document.getElementById('themeToggle');
  const welcomeScreen = document.getElementById('welcomeScreen');
   const slashHint = document.getElementById('slashHint');

  // Tool elements
  const summarizeBtn = document.getElementById('summarizeBtn');
  const summarizeOutput = document.getElementById('summarizeOutput');

  // ── CUSTOM SELECT DROPDOWN WRAPPER ──
  function setupCustomDropdown(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;

    select.style.display = 'none';

    const wrapper = document.createElement('div');
    wrapper.className = 'custom-select-wrapper';
    wrapper.id = `${selectId}_customWrapper`;

    const trigger = document.createElement('div');
    trigger.className = 'custom-select-trigger';
    
    const triggerText = document.createElement('span');
    triggerText.className = 'custom-select-text';
    
    const triggerIcon = document.createElement('span');
    triggerIcon.className = 'custom-select-icon';
    triggerIcon.innerHTML = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>`;

    trigger.appendChild(triggerText);
    trigger.appendChild(triggerIcon);
    wrapper.appendChild(trigger);

    const menu = document.createElement('div');
    menu.className = 'custom-select-menu glass';
    wrapper.appendChild(menu);

    select.parentNode.insertBefore(wrapper, select.nextSibling);

    function rebuildMenu() {
      menu.innerHTML = '';
      const options = Array.from(select.options);
      
      if (options.length === 0 || (options.length === 1 && !options[0].value)) {
        const noModels = document.createElement('div');
        noModels.className = 'custom-select-option disabled';
        noModels.textContent = options[0]?.textContent || 'No options';
        menu.appendChild(noModels);
        triggerText.textContent = options[0]?.textContent || 'No options';
        return;
      }

      options.forEach(opt => {
        const optionDiv = document.createElement('div');
        optionDiv.className = 'custom-select-option';
        optionDiv.textContent = opt.textContent;
        optionDiv.dataset.value = opt.value;

        if (opt.value === select.value) {
          optionDiv.classList.add('active');
          triggerText.textContent = opt.textContent;
        }

        optionDiv.addEventListener('click', (e) => {
          e.stopPropagation();
          select.value = opt.value;
          select.dispatchEvent(new Event('change'));
          updateSelection();
          menu.classList.remove('open');
          trigger.classList.remove('active');
        });

        menu.appendChild(optionDiv);
      });
    }

    function updateSelection() {
      const activeVal = select.value;
      const options = menu.querySelectorAll('.custom-select-option');
      let foundActive = false;
      options.forEach(optDiv => {
        if (optDiv.dataset.value === activeVal) {
          optDiv.classList.add('active');
          triggerText.textContent = optDiv.textContent;
          foundActive = true;
        } else {
          optDiv.classList.remove('active');
        }
      });
      if (!foundActive && select.options.length > 0) {
        const firstOpt = select.options[select.selectedIndex >= 0 ? select.selectedIndex : 0];
        triggerText.textContent = firstOpt ? firstOpt.textContent : '';
      }
    }

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('.custom-select-menu').forEach(m => {
        if (m !== menu) {
          m.classList.remove('open');
          m.previousSibling.classList.remove('active');
        }
      });
      const isOpen = menu.classList.toggle('open');
      trigger.classList.toggle('active', isOpen);
    });

    document.addEventListener('click', () => {
      menu.classList.remove('open');
      trigger.classList.remove('active');
    });

    const observer = new MutationObserver(() => {
      rebuildMenu();
    });
    observer.observe(select, { childList: true, subtree: true, attributes: true });

    select.addEventListener('change', () => {
      updateSelection();
    });

    rebuildMenu();
  }

  // Setup custom dropdowns
  setupCustomDropdown('modelSelect');
  setupCustomDropdown('modeSelect');

  // ══════════════════════════════════════════════════
  // THEME MANAGEMENT
  // ══════════════════════════════════════════════════
  const themes = ['dark', 'light', 'system'];
  const themeIcons = { dark: '🌙', light: '☀️', system: '💻' };

  chrome.storage.local.get(['uiTheme'], (res) => {
    const saved = res.uiTheme || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
  });

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const cur = document.documentElement.getAttribute('data-theme') || 'dark';
      const next = themes[(themes.indexOf(cur) + 1) % themes.length];
      themeToggle.style.transform = 'scale(0.85) rotate(-3deg)';
      setTimeout(() => { themeToggle.style.transform = 'scale(1)'; }, 250);
      document.documentElement.setAttribute('data-theme', next);
      chrome.storage.local.set({ uiTheme: next });
      showToast(`${themeIcons[next]} ${next.charAt(0).toUpperCase() + next.slice(1)} mode`);
    });
  }

  function showToast(text) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = text;
    document.body.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity 0.3s'; setTimeout(() => t.remove(), 300); }, 1200);
  }

  // ══════════════════════════════════════════════════
  // TAB NAVIGATION
  // ══════════════════════════════════════════════════
  const tabItems = document.querySelectorAll('.tab-item');
  const viewPanels = document.querySelectorAll('.view-panel');

  function switchTab(tabName) {
    tabItems.forEach(t => t.classList.toggle('active', t.dataset.tab === tabName));
    viewPanels.forEach(v => v.classList.toggle('active', v.id === `view-${tabName}`));
  }

  tabItems.forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  // ══════════════════════════════════════════════════
  // OPTION PILLS (generic handler)
  // ══════════════════════════════════════════════════
  document.querySelectorAll('.option-pills').forEach(container => {
    container.querySelectorAll('.option-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        container.querySelectorAll('.option-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
      });
    });
  });

  // ══════════════════════════════════════════════════
  // STATE
  // ══════════════════════════════════════════════════
  let selectedTabId = null;
  const selectedTabIds = new Set();
  let isTabSharingEnabled = true;
  let dismissedTabId = null;
  let messageHistory = [];
  let currentChatId = Date.now().toString();
  let savedChats = {};
  const attachedFiles = [];
  let currentAttachedImage = null; // { url: string (data URI), name: string }

  const result = await chrome.storage.local.get(['savedChats', 'defaultMode', 'autoShareEnabled']);
  savedChats = result.savedChats || {};

  if (result.defaultMode) {
    modeSelect.value = result.defaultMode;
    modeSelect.dispatchEvent(new Event('change'));
  }
  isTabSharingEnabled = result.autoShareEnabled !== false;

  async function loadActiveModels() {
    const storage = await chrome.storage.local.get([
      'activeModelValue',
      'apiKey',
      'selectedModels',
      'customProviders',
      'customProviderName',
      'customBaseUrl',
      'apiUrl',
      'customApiKey',
      'customSelectedModels'
    ]);

    let customProviders = storage.customProviders || [];
    if (!customProviders.length && (storage.customBaseUrl || storage.apiUrl)) {
      customProviders = [{
        id: 'legacy_default',
        name: storage.customProviderName || 'OpenAI-Compatible',
        baseUrl: storage.customBaseUrl || storage.apiUrl,
        apiKey: storage.customApiKey || '',
        selectedModels: storage.customSelectedModels || []
      }];
    }

    const currentSavedVal = storage.activeModelValue || modelSelect.value || '';
    modelSelect.innerHTML = '';
    const allOptions = [];

    // 1. Add OpenRouter models
    const openrouterModels = storage.selectedModels || [];
    if (openrouterModels.length > 0) {
      openrouterModels.forEach(modelId => {
        allOptions.push({
          value: `openrouter:${modelId}`,
          label: `[OpenRouter] ${modelId}`
        });
      });
    }

    // 2. Add models from all configured customProviders
    customProviders.forEach(prov => {
      const pName = prov.name || 'OpenAI';
      const pModels = prov.selectedModels || [];
      pModels.forEach(modelId => {
        allOptions.push({
          value: `custom:${prov.id}:${modelId}`,
          label: `[${pName}] ${modelId}`
        });
      });
    });

    if (allOptions.length > 0) {
      allOptions.forEach(opt => {
        const el = document.createElement('option');
        el.value = opt.value;
        el.textContent = opt.label;
        modelSelect.appendChild(el);
      });

      // Match saved selection or default to first
      const matched = allOptions.find(o => o.value === currentSavedVal);
      if (matched) {
        modelSelect.value = currentSavedVal;
      } else {
        modelSelect.value = allOptions[0].value;
        chrome.storage.local.set({ activeModelValue: allOptions[0].value });
      }
    } else {
      modelSelect.innerHTML = '<option value="">No models added</option>';
    }

    // Notify custom dropdown wrapper
    modelSelect.dispatchEvent(new Event('change'));
  }

  await loadActiveModels();

  modelSelect.addEventListener('change', () => {
    if (modelSelect.value) {
      chrome.storage.local.set({ activeModelValue: modelSelect.value });
    }
  });

  // Listen for provider or models changes in settings
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && (changes.customProviders || changes.selectedModels || changes.apiKey || changes.customSelectedModels)) {
      loadActiveModels();
    }
  });

  // ══════════════════════════════════════════════════
  // SETTINGS / NEW CHAT / HISTORY
  // ══════════════════════════════════════════════════
  settingsBtn.addEventListener('click', () => chrome.runtime.openOptionsPage());

  newChatBtn.addEventListener('click', async () => {
    messageHistory = [];
    currentChatId = Date.now().toString();
    chatArea.innerHTML = '';
    historyPanel.style.display = 'none';
    chatArea.appendChild(createWelcomeScreen());
    
    const res = await chrome.storage.local.get(['autoShareEnabled']);
    isTabSharingEnabled = res.autoShareEnabled !== false;
    
    selectedTabId = null;
    dismissedTabId = null;
    updateContextPill();
    switchTab('chat');
  });

  historyBtn.addEventListener('click', () => {
    if (historyPanel.style.display === 'none') { historyPanel.style.display = 'flex'; renderHistory(); }
    else { historyPanel.style.display = 'none'; }
  });

  // ══════════════════════════════════════════════════
  // WELCOME SCREEN
  // ══════════════════════════════════════════════════
  function createWelcomeScreen() {
    const ws = document.createElement('div');
    ws.className = 'welcome-screen'; ws.id = 'welcomeScreen';
    ws.innerHTML = `
      <div class="welcome-logo">VRH.AI</div>
      <div class="welcome-subtitle">Your intelligent browser copilot.<br>Ask questions, automate tasks, control the web.</div>
      <div class="welcome-prompts">
        <button class="welcome-prompt-btn" data-prompt="Summarize this page for me">📄 Summarize this page</button>
        <button class="welcome-prompt-btn" data-prompt="What is this website about?">🔍 What is this about?</button>
        <button class="welcome-prompt-btn" data-prompt="Find the main heading on this page">🎯 Find main heading</button>
      </div>`;
    ws.querySelectorAll('.welcome-prompt-btn').forEach(b => {
      b.addEventListener('click', () => { chatInput.value = b.dataset.prompt; handleSendMessage(); });
    });
    return ws;
  }

  if (welcomeScreen) {
    welcomeScreen.querySelectorAll('.welcome-prompt-btn').forEach(b => {
      b.addEventListener('click', () => { chatInput.value = b.dataset.prompt; handleSendMessage(); });
    });
  }

  function hideWelcomeScreen() {
    const ws = document.getElementById('welcomeScreen');
    if (ws) { ws.style.opacity = '0'; ws.style.transition = 'opacity 0.25s ease'; setTimeout(() => ws.remove(), 250); }
  }

  // ══════════════════════════════════════════════════
  // CONTEXT PILL & TABS MENU
  // ══════════════════════════════════════════════════
  // ══════════════════════════════════════════════════
  // CONTEXT PILL & MULTI-TAB MENU
  // ══════════════════════════════════════════════════
  const tabCountBadge = document.getElementById('tabCountBadge');
  const tabsSelectAllBtn = document.getElementById('tabsSelectAllBtn');

  async function updateContextPill() {
    try {
      if (!isTabSharingEnabled) {
        contextPill.style.display = 'none';
        if (tabCountBadge) tabCountBadge.style.display = 'none';
        return;
      }

      if (selectedTabIds.size === 0) {
        if (tabCountBadge) tabCountBadge.style.display = 'none';
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab && tab.id !== dismissedTabId) {
          contextText.textContent = `Sharing '${tab.title}'`;
          contextPill.style.display = 'flex';
        } else {
          contextPill.style.display = 'none';
        }
        return;
      }

      if (selectedTabIds.size === 1) {
        const singleId = Array.from(selectedTabIds)[0];
        const tab = await chrome.tabs.get(singleId).catch(() => null);
        if (tab) {
          contextText.textContent = `Sharing '${tab.title}'`;
          contextPill.style.display = 'flex';
          if (tabCountBadge) tabCountBadge.style.display = 'none';
        } else {
          selectedTabIds.delete(singleId);
          updateContextPill();
        }
        return;
      }

      // 2 or more tabs selected
      if (tabCountBadge) {
        tabCountBadge.textContent = selectedTabIds.size;
        tabCountBadge.style.display = 'inline-block';
      }
      contextText.innerHTML = `<strong>${selectedTabIds.size} tabs selected</strong>`;
      contextPill.style.display = 'flex';
    } catch(e) {
      contextPill.style.display = 'none';
    }
  }

  async function renderTabsList() {
    const tabs = await chrome.tabs.query({ currentWindow: true });
    tabsList.innerHTML = '';

    tabs.forEach(tab => {
      const row = document.createElement('div');
      const isSelected = selectedTabIds.has(tab.id);
      row.className = `tab-row-item ${isSelected ? 'selected' : ''}`;

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'tab-checkbox';
      checkbox.checked = isSelected;

      if (tab.favIconUrl) {
        const img = document.createElement('img');
        img.src = tab.favIconUrl;
        img.style.cssText = 'width:16px;height:16px;flex-shrink:0;border-radius:2px;';
        row.appendChild(img);
      }

      const span = document.createElement('span');
      span.textContent = tab.title || tab.url;
      span.style.cssText = 'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:0.82rem;flex:1;';

      row.appendChild(checkbox);
      row.appendChild(span);

      const toggleSelection = () => {
        if (selectedTabIds.has(tab.id)) {
          selectedTabIds.delete(tab.id);
          checkbox.checked = false;
          row.classList.remove('selected');
        } else {
          selectedTabIds.add(tab.id);
          checkbox.checked = true;
          row.classList.add('selected');
        }
        isTabSharingEnabled = true;
        updateContextPill();
      };

      row.onclick = (e) => {
        if (e.target !== checkbox) toggleSelection();
      };
      checkbox.onchange = () => toggleSelection();

      tabsList.appendChild(row);
    });

    if (tabsSelectAllBtn) {
      const allSelected = tabs.length > 0 && tabs.every(t => selectedTabIds.has(t.id));
      tabsSelectAllBtn.textContent = allSelected ? 'Deselect All' : 'Select All';
    }
  }

  if (tabsSelectAllBtn) {
    tabsSelectAllBtn.onclick = async (e) => {
      e.stopPropagation();
      const tabs = await chrome.tabs.query({ currentWindow: true });
      const allSelected = tabs.length > 0 && tabs.every(t => selectedTabIds.has(t.id));
      if (allSelected) {
        selectedTabIds.clear();
      } else {
        tabs.forEach(t => selectedTabIds.add(t.id));
      }
      isTabSharingEnabled = true;
      updateContextPill();
      renderTabsList();
    };
  }

  tabsMenuBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (tabsPanel.style.display === 'flex') {
      tabsPanel.style.display = 'none';
      return;
    }
    await renderTabsList();
    tabsPanel.style.display = 'flex';
  });

  contextCloseBtn.addEventListener('click', async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab) {
        dismissedTabId = tab.id;
      }
    } catch (e) {
      console.error("Error setting dismissedTabId:", e);
    }
    selectedTabIds.clear();
    selectedTabId = null;
    isTabSharingEnabled = false;
    updateContextPill();
  });

  chrome.tabs.onActivated.addListener((activeInfo) => {
    if (activeInfo.tabId !== dismissedTabId) {
      dismissedTabId = null;
      isTabSharingEnabled = true;
    }
    if (selectedTabIds.size === 0 && isTabSharingEnabled) updateContextPill();
  });

  chrome.tabs.onUpdated.addListener((id, _, tab) => {
    if (tab.active && id !== dismissedTabId) {
      dismissedTabId = null;
      isTabSharingEnabled = true;
    }
    if (((selectedTabIds.size === 0 && tab.active) || selectedTabIds.has(id)) && isTabSharingEnabled) updateContextPill();
  });
  updateContextPill();

  // Multi-tab text extraction helper
  async function extractMultiTabContext(tabIds) {
    if (!tabIds || tabIds.length === 0) return "No readable text found.";

    const totalBudget = 75000;
    const count = tabIds.length;
    const perTabCap = count <= 2 ? 30000 : Math.max(10000, Math.floor(totalBudget / count));

    const sections = [];
    for (const tabId of tabIds) {
      try {
        const tab = await chrome.tabs.get(tabId).catch(() => null);
        if (!tab) continue;

        const tabTitle = tab.title || 'Untitled Tab';
        const tabUrl = tab.url || '';

        const pageRes = await executeOnTab("GET_PAGE_TEXT", null, null, null, null, null, tabId);
        let tabText = "";
        if (pageRes.error) {
          tabText = `[Could not extract text: ${pageRes.error}]`;
        } else if (pageRes.result) {
          tabText = pageRes.result.trim().substring(0, perTabCap);
        } else {
          tabText = "No readable text found on page.";
        }

        sections.push(`=== TAB: ${tabTitle} (${tabUrl}) ===\n${tabText}`);
      } catch (err) {
        console.warn(`[VRH.AI Multi-Tab] Error extracting tab ${tabId}:`, err);
      }
    }

    return sections.length > 0 ? sections.join('\n\n') : "No readable text found.";
  }

  // ── VISION / IMAGE ATTACHMENT CONTROLS & GATING ──
  const attachImageBtn = document.getElementById('attachImageBtn');
  const captureScreenshotBtn = document.getElementById('captureScreenshotBtn');
  const imageFileInput = document.getElementById('imageFileInput');
  const imagePreviewContainer = document.getElementById('imagePreviewContainer');
  const imagePreviewThumb = document.getElementById('imagePreviewThumb');
  const imagePreviewName = document.getElementById('imagePreviewName');
  const removeImageBtn = document.getElementById('removeImageBtn');

  function updateVisionCapabilityGate() {
    const activeModel = modelSelect.value || '';
    const isVision = (typeof window.isVisionModel === 'function')
      ? window.isVisionModel(activeModel)
      : /vision|gpt-4o|gemini|claude-3|qwen-?vl|pixtral|llava|-vl\b/i.test(activeModel);

    if (attachImageBtn && captureScreenshotBtn) {
      if (isVision) {
        attachImageBtn.disabled = false;
        captureScreenshotBtn.disabled = false;
        attachImageBtn.style.opacity = '1';
        captureScreenshotBtn.style.opacity = '1';
        attachImageBtn.style.cursor = 'pointer';
        captureScreenshotBtn.style.cursor = 'pointer';
        attachImageBtn.title = 'Attach Image';
        captureScreenshotBtn.title = 'Attach Active Tab Screenshot';
      } else {
        attachImageBtn.disabled = true;
        captureScreenshotBtn.disabled = true;
        attachImageBtn.style.opacity = '0.35';
        captureScreenshotBtn.style.opacity = '0.35';
        attachImageBtn.style.cursor = 'not-allowed';
        captureScreenshotBtn.style.cursor = 'not-allowed';
        attachImageBtn.title = "This model doesn't support images";
        captureScreenshotBtn.title = "This model doesn't support images";

        if (currentAttachedImage) {
          clearAttachedImage();
          console.warn("[VRH.AI Vision] Attached image cleared: current model does not support image input.");
        }
      }
    }
  }

  function setAttachedImage(url, name) {
    currentAttachedImage = { url, name };
    if (imagePreviewThumb) imagePreviewThumb.src = url;
    if (imagePreviewName) imagePreviewName.textContent = name;
    if (imagePreviewContainer) imagePreviewContainer.style.display = 'block';
  }

  function clearAttachedImage() {
    currentAttachedImage = null;
    if (imagePreviewThumb) imagePreviewThumb.src = '';
    if (imagePreviewContainer) imagePreviewContainer.style.display = 'none';
    if (imageFileInput) imageFileInput.value = '';
  }

  if (removeImageBtn) {
    removeImageBtn.addEventListener('click', clearAttachedImage);
  }

  if (attachImageBtn && imageFileInput) {
    attachImageBtn.addEventListener('click', () => {
      if (attachImageBtn.disabled) return;
      imageFileInput.click();
    });

    imageFileInput.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        setAttachedImage(evt.target.result, file.name);
      };
      reader.readAsDataURL(file);
    });
  }

  if (captureScreenshotBtn) {
    captureScreenshotBtn.addEventListener('click', async () => {
      if (captureScreenshotBtn.disabled) return;
      try {
        const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: 'png' });
        if (dataUrl) {
          setAttachedImage(dataUrl, 'Active Tab Screenshot.png');
        }
      } catch (err) {
        console.error("Screenshot capture error:", err);
      }
    });
  }

  modelSelect.addEventListener('change', () => {
    updateVisionCapabilityGate();
  });
  updateVisionCapabilityGate();

  // ── CLOSE FLOATING PANELS ON OUTSIDE CLICK ──
  document.addEventListener('click', (e) => {
    // Close tabs panel if clicking outside
    if (tabsPanel.style.display !== 'none' && !tabsPanel.contains(e.target) && e.target !== tabsMenuBtn && !tabsMenuBtn.contains(e.target)) {
      tabsPanel.style.display = 'none';
    }
    // Close history panel if clicking outside
    if (historyPanel.style.display !== 'none' && !historyPanel.contains(e.target) && e.target !== historyBtn && !historyBtn.contains(e.target)) {
      historyPanel.style.display = 'none';
    }
  });

  // ── HISTORY ──
  function renderHistory() {
    historyList.innerHTML = '';
    const ids = Object.keys(savedChats).sort((a, b) => b - a);
    if (!ids.length) { historyList.innerHTML = '<div style="font-size:0.78rem;color:var(--text-muted);padding:8px;">No history yet.</div>'; return; }
    ids.forEach(id => {
      const chat = savedChats[id];
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;gap:4px;';
      const btn = document.createElement('button');
      btn.style.cssText = 'flex:1;padding:7px 10px;background:var(--accent);border:none;border-radius:8px;color:var(--text-color);cursor:pointer;text-align:left;font-size:0.78rem;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;transition:background .15s;';
      const first = chat.find(m => m.role === 'user');
      btn.textContent = first ? first.content.substring(0, 35) + '...' : 'Empty Chat';
      btn.onmouseover = () => btn.style.background = 'var(--accent-hover)';
      btn.onmouseout = () => btn.style.background = 'var(--accent)';
      btn.onclick = () => { loadChat(id); historyPanel.style.display = 'none'; };

      const del = document.createElement('button');
      del.style.cssText = 'padding:7px;background:rgba(239,68,68,0.08);border:none;border-radius:8px;color:#ef4444;cursor:pointer;display:flex;align-items:center;justify-content:center;';
      del.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';
      del.onmouseover = () => del.style.background = 'rgba(239,68,68,0.15)';
      del.onmouseout = () => del.style.background = 'rgba(239,68,68,0.08)';
      del.onclick = async (e) => { e.stopPropagation(); delete savedChats[id]; await chrome.storage.local.set({ savedChats }); if (currentChatId === id) { messageHistory = []; currentChatId = Date.now().toString(); chatArea.innerHTML = ''; chatArea.appendChild(createWelcomeScreen()); } renderHistory(); };

      row.appendChild(btn); row.appendChild(del); historyList.appendChild(row);
    });
  }

  function loadChat(id) {
    currentChatId = id; messageHistory = savedChats[id] || []; chatArea.innerHTML = '';
    messageHistory.forEach((m, idx) => { if (m.role !== 'system' && m.role !== 'developer') { const el = appendMessage(m.content, m.role, false, m.metadata); el.dataset.historyIndex = idx; } });
    chatArea.scrollTop = chatArea.scrollHeight;
    switchTab('chat');
  }

  async function saveChat() { savedChats[currentChatId] = messageHistory; await chrome.storage.local.set({ savedChats }); }

  chatInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 120) + 'px';
    handleSlashCommands(this.value);
  });

  // ── Slash Commands ──
  const slashCommands = [
    { cmd: '/summarize', desc: 'Summarize current page', tab: 'summarize' },
    { cmd: '/write', desc: 'Compose or rewrite text in chat', action: () => { switchTab('chat'); chatInput.value = 'Write: '; chatInput.focus(); } },
    { cmd: '/translate', desc: 'Translate text in chat', action: () => { switchTab('chat'); chatInput.value = 'Translate into English: '; chatInput.focus(); } },
    { cmd: '/agent', desc: 'Switch to Agent mode', action: () => { modeSelect.value = 'agent'; modeSelect.dispatchEvent(new Event('change')); switchTab('chat'); } },
    { cmd: '/ask', desc: 'Switch to Ask mode', action: () => { modeSelect.value = 'ask'; modeSelect.dispatchEvent(new Event('change')); switchTab('chat'); } },
  ];

  function handleSlashCommands(val) {
    if (val.startsWith('/') && val.length < 15) {
      const matching = slashCommands.filter(c => c.cmd.startsWith(val.toLowerCase()));
      if (matching.length) {
        slashHint.innerHTML = '';
        matching.forEach(c => {
          const item = document.createElement('div');
          item.className = 'slash-hint-item';
          item.innerHTML = `<span class="slash-cmd">${c.cmd}</span><span class="slash-desc">${c.desc}</span>`;
          item.addEventListener('click', () => {
            chatInput.value = '';
            slashHint.style.display = 'none';
            if (c.tab) switchTab(c.tab);
            if (c.action) c.action();
          });
          slashHint.appendChild(item);
        });
        slashHint.style.display = 'block';
        return;
      }
    }
    slashHint.style.display = 'none';
  }

  // ── MESSAGE RENDERING ──
  function formatMarkdown(text) {
    text = text || '';
    if (text.includes('```')) {
      const parts = text.split('```');
      let html = '';
      for (let i = 0; i < parts.length; i++) {
        if (i % 2 === 0) {
          html += formatBlockMarkdown(parts[i]);
        } else {
          // Separate language identifier from code content
          const newlineIdx = parts[i].indexOf('\n');
          let code;
          if (newlineIdx !== -1) {
            // Strip the language tag line (e.g. "javascript\n")
            const langLine = parts[i].substring(0, newlineIdx).trim();
            code = parts[i].substring(newlineIdx + 1);
            const langLabel = langLine ? `<div style="font-size:0.7rem;color:var(--text-muted);padding:4px 10px 0;text-transform:uppercase;letter-spacing:0.5px;">${escapeHtml(langLine)}</div>` : '';
            html += `${langLabel}<pre><code>${escapeHtml(code)}</code></pre>`;
          } else {
            code = parts[i];
            html += `<pre><code>${escapeHtml(code)}</code></pre>`;
          }
        }
      }
      return sanitizeHtml(html);
    }
    return sanitizeHtml(formatBlockMarkdown(text));
  }

  function formatBlockMarkdown(text) {
    // Process block-level elements before inline
    const lines = text.split('\n');
    let html = '';
    let inList = false;
    let listType = null; // 'ul' or 'ol'

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Headers
      const headerMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
      if (headerMatch) {
        if (inList) { html += `</${listType}>`; inList = false; listType = null; }
        const level = headerMatch[1].length;
        html += `<h${level} style="margin:8px 0 4px;font-size:${1.2 - (level * 0.08)}rem;">${formatInlineMarkdown(headerMatch[2])}</h${level}>`;
        continue;
      }

      // Blockquotes
      if (trimmed.startsWith('> ')) {
        if (inList) { html += `</${listType}>`; inList = false; listType = null; }
        html += `<blockquote style="border-left:3px solid var(--primary-color);margin:6px 0;padding:4px 12px;color:var(--text-muted);font-style:italic;">${formatInlineMarkdown(trimmed.substring(2))}</blockquote>`;
        continue;
      }

      // Unordered lists
      const ulMatch = trimmed.match(/^[-*+]\s+(.+)$/);
      if (ulMatch) {
        if (!inList || listType !== 'ul') {
          if (inList) html += `</${listType}>`;
          html += '<ul style="margin:4px 0;padding-left:20px;">';
          inList = true; listType = 'ul';
        }
        html += `<li>${formatInlineMarkdown(ulMatch[1])}</li>`;
        continue;
      }

      // Ordered lists
      const olMatch = trimmed.match(/^\d+\.\s+(.+)$/);
      if (olMatch) {
        if (!inList || listType !== 'ol') {
          if (inList) html += `</${listType}>`;
          html += '<ol style="margin:4px 0;padding-left:20px;">';
          inList = true; listType = 'ol';
        }
        html += `<li>${formatInlineMarkdown(olMatch[1])}</li>`;
        continue;
      }

      // Close any open list
      if (inList && trimmed === '') {
        html += `</${listType}>`;
        inList = false; listType = null;
      }

      // Regular text
      if (trimmed === '') {
        html += '<br>';
      } else {
        html += formatInlineMarkdown(trimmed) + '<br>';
      }
    }

    if (inList) html += `</${listType}>`;
    return html;
  }

  function formatInlineMarkdown(text) {
    // SECURITY: Escape HTML entities FIRST to prevent XSS, THEN apply
    // markdown formatting. This ensures no raw HTML from model output,
    // page text, or filenames can execute in the privileged sidepanel.
    const escaped = escapeHtml(text);
    return escaped
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color:var(--primary-color);text-decoration:underline;">$1</a>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\`(.*?)\`/g, '<code style="background:var(--code-bg);padding:1px 5px;border-radius:4px;font-size:0.83em;">$1</code>');
  }

  // ── ASSISTANT STREAMING & ACTIONS HELPERS ──
  function updateStreamingMessage(msgElement, text) {
    let thinkingText = '';
    let mainText = text;
    
    const thinkStart = text.indexOf('<think>');
    if (thinkStart !== -1) {
      const thinkEnd = text.indexOf('</think>');
      if (thinkEnd !== -1) {
        thinkingText = text.substring(thinkStart + 7, thinkEnd);
        mainText = text.substring(thinkEnd + 8);
      } else {
        thinkingText = text.substring(thinkStart + 7);
        mainText = '';
      }
    }

    // Capture user's manual collapse state if container already exists in DOM
    const existingBox = msgElement.querySelector('.thinking-container');
    let isCurrentlyCollapsed = text.includes('</think>'); // Default to collapsed once done
    if (existingBox) {
      isCurrentlyCollapsed = existingBox.classList.contains('collapsed');
    }

    let thinkingHtml = '';
    if (thinkingText) {
      const isCollapsedClass = isCurrentlyCollapsed ? 'collapsed' : '';
      thinkingHtml = `
        <div class="thinking-container ${isCollapsedClass}">
          <div class="thinking-header">
            <span class="thinking-title">🧠 Thinking Process</span>
            <span class="thinking-toggle">▼</span>
          </div>
          <div class="thinking-content">${formatMarkdown(thinkingText)}</div>
        </div>
      `;
    }

    msgElement.innerHTML = '';
    if (thinkingHtml) {
      const temp = document.createElement('div');
      temp.innerHTML = thinkingHtml;
      const header = temp.querySelector('.thinking-header');
      const box = temp.querySelector('.thinking-container');
      if (header && box) {
        header.addEventListener('click', () => box.classList.toggle('collapsed'));
      }
      msgElement.appendChild(box);
    }
    
    if (mainText) {
      const contentDiv = document.createElement('div');
      contentDiv.className = 'msg-content';
      contentDiv.innerHTML = formatMarkdown(mainText);
      msgElement.appendChild(contentDiv);
    }
  }

  function addAssistantActions(msgElement, text) {
    if (msgElement.querySelector('.msg-actions')) return;
    
    const actions = document.createElement('div');
    actions.className = 'msg-actions';

    const copyBtn = document.createElement('button');
    copyBtn.className = 'msg-action-btn';
    copyBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy';
    copyBtn.onclick = () => {
      navigator.clipboard.writeText(text);
      copyBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Copied!';
      setTimeout(() => { copyBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy'; }, 1500);
    };
    actions.appendChild(copyBtn);

    const regenBtn = document.createElement('button');
    regenBtn.className = 'msg-action-btn';
    regenBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg> Regenerate';
    regenBtn.onclick = async () => {
      const historyIdx = parseInt(msgElement.dataset.historyIndex);
      if (isNaN(historyIdx)) return;

      const userMsg = messageHistory[historyIdx - 1];
      if (userMsg && userMsg.role === 'user') {
        // Truncate messageHistory array at the regeneration branch point
        messageHistory = messageHistory.slice(0, historyIdx);
        
        // Remove the assistant element clicked and any message elements that came after it
        let nextSibling = msgElement.nextElementSibling;
        msgElement.remove();
        while (nextSibling) {
          const toRemove = nextSibling;
          nextSibling = nextSibling.nextElementSibling;
          toRemove.remove();
        }

        await saveChat();

        const loader = createLoadingDots(); 
        chatArea.appendChild(loader);
        chatArea.scrollTop = chatArea.scrollHeight;

        try {
          const pageRes = await executeOnTab("GET_PAGE_TEXT");
          let pageText;
          if (pageRes.error) {
            pageText = `[Restricted Browser Page: ${pageRes.error}. Note: Chrome sandbox restricts extensions on internal chrome:// or Chrome Web Store pages. Regular web pages are fully accessible.]`;
          } else {
            pageText = pageRes.result ? pageRes.result.substring(0, 100000) : "No readable text found.";
          }
          
          let msgs = [{ 
            role: "system", 
            content: buildVRHSystemPrompt({
              pageText,
              fileContext: '',
              userQuery: (userMsg?.content || '')
            })
          }];
          
          messageHistory.forEach(m => { if (m.role !== 'system') msgs.push(m); });
          
          if (chatArea.contains(loader)) chatArea.removeChild(loader);

          const assistantMsg = appendMessage("", 'assistant', false);
          const reply = await callLLMStream(msgs, (partialText) => {
            updateStreamingMessage(assistantMsg, partialText);
          });
          
          updateStreamingMessage(assistantMsg, reply);
          addAssistantActions(assistantMsg, reply);
          
          messageHistory.push({ role: 'assistant', content: reply });
          assistantMsg.dataset.historyIndex = messageHistory.length - 1;
          await saveChat();
        } catch(e) { 
          if (chatArea.contains(loader)) chatArea.removeChild(loader); 
          const errEl = appendMessage(`Error: ${e.message}`, 'assistant');
          errEl.dataset.historyIndex = messageHistory.length - 1;
        }
      }
    };
    actions.appendChild(regenBtn);
    msgElement.appendChild(actions);
  }

  function addUserActions(msgElement, text) {
    if (msgElement.querySelector('.msg-actions')) return;

    const actions = document.createElement('div');
    actions.className = 'msg-actions';

    // Copy Button
    const copyBtn = document.createElement('button');
    copyBtn.className = 'msg-action-btn';
    copyBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy';
    copyBtn.onclick = () => {
      navigator.clipboard.writeText(text);
      copyBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Copied!';
      setTimeout(() => {
        copyBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy';
      }, 1500);
    };

    // Edit/Undo Button
    const editBtn = document.createElement('button');
    editBtn.className = 'msg-action-btn';
    editBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg> Edit';
    editBtn.onclick = async () => {
      if (activeAbortController) {
        activeAbortController.abort();
      }

      chatInput.value = text;
      chatInput.style.height = 'auto';
      chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
      chatInput.focus();

      const idx = parseInt(msgElement.dataset.historyIndex);
      if (!isNaN(idx) && idx >= 0) {
        messageHistory = messageHistory.slice(0, idx);
        await saveChat();
        reRenderChat();
      }
    };

    actions.appendChild(copyBtn);
    actions.appendChild(editBtn);
    msgElement.appendChild(actions);
  }

  function reRenderChat() {
    chatArea.innerHTML = '';
    messageHistory.forEach((m, idx) => {
      if (m.role !== 'system' && m.role !== 'developer') {
        const el = appendMessage(m.content, m.role, false, m.metadata);
        el.dataset.historyIndex = idx;
      }
    });
    chatArea.scrollTop = chatArea.scrollHeight;
  }

  function appendMessage(text, role = 'user', save = true, metadata = null) {
    // text can be a string or an array of parts for multimodal messages
    let displayText = '';
    let attachedImgUrl = metadata?.imageUrl || null;
    let attachedImgName = metadata?.imageName || null;

    if (Array.isArray(text)) {
      const textPart = text.find(p => p.type === 'text');
      displayText = textPart ? (textPart.text || '') : '';
      const imgPart = text.find(p => p.type === 'image_url');
      if (imgPart) {
        attachedImgUrl = attachedImgUrl || imgPart.image_url?.url || imgPart.url || null;
      }
    } else if (typeof text === 'string') {
      displayText = text;
    } else if (text && typeof text === 'object') {
      displayText = text.text || text.content || JSON.stringify(text);
    }

    hideWelcomeScreen();
    const msg = document.createElement('div');
    msg.className = `msg msg-${role}`;

    // Extract thinking block if assistant message contains it
    let thinkingHtml = '';
    let mainText = displayText;

    if (role === 'assistant') {
      const thinkRegex = /<think>([\s\S]*?)<\/think>/i;
      const thinkMatch = thinkRegex.exec(displayText);
      if (thinkMatch) {
        const thinkingText = thinkMatch[1].trim();
        mainText = displayText.replace(thinkRegex, '').trim();
        
        thinkingHtml = `
          <div class="thinking-container collapsed">
            <div class="thinking-header">
              <span class="thinking-title">🧠 Thinking Process</span>
              <span class="thinking-toggle">▼</span>
            </div>
            <div class="thinking-content">${formatMarkdown(thinkingText)}</div>
          </div>
        `;
      }
    }

    if (thinkingHtml) {
      msg.innerHTML = thinkingHtml + `<div class="msg-content">${formatMarkdown(mainText)}</div>`;
      const header = msg.querySelector('.thinking-header');
      const container = msg.querySelector('.thinking-container');
      if (header && container) {
        header.addEventListener('click', () => {
          container.classList.toggle('collapsed');
        });
      }
    } else {
      msg.innerHTML = formatMarkdown(mainText);
    }

    // Add context metadata under user messages
    if (role === 'user') {
      const hasTab = metadata && metadata.sharedTab;
      const hasFiles = metadata && metadata.attachedFiles && metadata.attachedFiles.length > 0;
      const hasImage = !!attachedImgUrl;

      if (hasTab || hasFiles || hasImage) {
        const metaArea = document.createElement('div');
        metaArea.className = 'msg-context-area';
        
        if (hasTab) {
          const tabPill = document.createElement('span');
          tabPill.className = 'msg-context-pill';
          tabPill.innerHTML = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:2px"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg> ${escapeHtml(metadata.sharedTab)}`;
          metaArea.appendChild(tabPill);
        }
        
        if (hasFiles) {
          metadata.attachedFiles.forEach(fileName => {
            const filePill = document.createElement('span');
            filePill.className = 'msg-context-pill';
            filePill.innerHTML = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:2px"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> ${escapeHtml(fileName)}`;
            metaArea.appendChild(filePill);
          });
        }

        if (hasImage) {
          const imgThumb = document.createElement('div');
          imgThumb.className = 'msg-image-thumb';
          imgThumb.style.cssText = 'margin-top:6px;max-width:180px;max-height:140px;border-radius:8px;overflow:hidden;border:1px solid var(--glass-border);cursor:pointer;';
          const imgEl = document.createElement('img');
          imgEl.src = attachedImgUrl;
          imgEl.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
          imgEl.alt = attachedImgName || 'Attached Image';
          imgThumb.appendChild(imgEl);
          imgThumb.title = (attachedImgName || 'Attached Image') + ' (Click to open full size)';
          imgThumb.onclick = () => window.open(attachedImgUrl, '_blank');
          metaArea.appendChild(imgThumb);
        }
        
        msg.appendChild(metaArea);
      }
    }

    // Add copy/edit buttons to user messages
    if (role === 'user' && displayText) {
      addUserActions(msg, displayText);
    }

    // Add copy/regenerate buttons to assistant messages
    if (role === 'assistant' && displayText) {
      addAssistantActions(msg, displayText);
    }

    chatArea.appendChild(msg);
    chatArea.scrollTop = chatArea.scrollHeight;
    if (save && ['user', 'assistant', 'system'].includes(role)) { 
      messageHistory.push({ role, content: text, metadata }); 
      msg.dataset.historyIndex = messageHistory.length - 1;
      saveChat(); 
    }
    return msg;
  }

  function createLoadingDots() {
    const d = document.createElement('div');
    d.className = 'loading-dots';
    d.innerHTML = '<span></span><span></span><span></span>';
    return d;
  }

  // ── PDF PARSER WITH PDF.JS & TESSERACT OCR FALLBACK ──
  const OCR_MAX_PAGES = 5;

  function showSidepanelProgress(msg) {
    let bar = document.getElementById('vrh-pdf-progress-bar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'vrh-pdf-progress-bar';
      bar.style.cssText = 'position:fixed;bottom:75px;left:16px;right:16px;background:rgba(30,41,59,0.95);border:1px solid rgba(132,204,22,0.4);border-radius:8px;padding:8px 12px;font-size:12px;color:#d9f99d;z-index:99999;box-shadow:0 4px 12px rgba(0,0,0,0.5);display:flex;align-items:center;gap:8px;backdrop-filter:blur(8px);transition:opacity 0.2s;';
      document.body.appendChild(bar);
    }
    if (!msg) {
      bar.style.display = 'none';
      return;
    }
    bar.style.display = 'flex';
    bar.innerHTML = `<span style="display:inline-block;width:12px;height:12px;border:2px solid #84cc16;border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite;"></span><span>${escapeHtml(msg)}</span>`;
  }

  async function runTesseractOCR(canvas, onProgress) {
    const tesseractLib = (typeof window !== 'undefined' && window.Tesseract) || (typeof Tesseract !== 'undefined' ? Tesseract : null);
    if (!tesseractLib || typeof tesseractLib.createWorker !== 'function') {
      throw new Error('Tesseract OCR library is not available');
    }

    const worker = await tesseractLib.createWorker('eng', 1, {
      workerPath: chrome.runtime.getURL('lib/tesseract/worker.min.js'),
      corePath: chrome.runtime.getURL('lib/tesseract/tesseract-core-lstm.wasm.js'),
      langPath: chrome.runtime.getURL('lib/tesseract/'),
      logger: m => {
        if (m.status === 'recognizing text' && typeof onProgress === 'function') {
          onProgress(m.progress || 0);
        }
      }
    });

    try {
      const res = await worker.recognize(canvas);
      return res.data?.text || '';
    } finally {
      await worker.terminate().catch(() => {});
    }
  }

  async function extractTextFromPDFBuffer(arrayBuffer, onProgress) {
    const pdfLib = (typeof window !== 'undefined' && window.pdfjsLib) || (typeof pdfjsLib !== 'undefined' ? pdfjsLib : null);
    if (!pdfLib) {
      throw new Error("PDF.js library is not loaded. Please ensure pdf.min.js is included.");
    }

    if (!pdfLib.GlobalWorkerOptions.workerSrc && typeof chrome !== 'undefined' && chrome.runtime?.getURL) {
      pdfLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('lib/pdfjs/pdf.worker.min.js');
    }

    const loadingTask = pdfLib.getDocument({
      data: arrayBuffer,
      useWorkerFetch: true,
      isEvalSupported: false
    });

    const pdfDoc = await loadingTask.promise;
    const numPages = pdfDoc.numPages;
    const pageTexts = [];
    const emptyPageIndices = [];

    // 1. Direct text extraction with pdf.js (handles CID fonts, subsetted fonts, Google Docs/LaTeX PDFs)
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      try {
        const page = await pdfDoc.getPage(pageNum);
        const content = await page.getTextContent();
        const pageStr = content.items
          .map(item => item.str || '')
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();

        pageTexts.push(pageStr);
        if (pageStr.length < 10) {
          emptyPageIndices.push(pageNum);
        }
      } catch (err) {
        console.warn(`[VRH.AI PDF] Error extracting text from page ${pageNum}:`, err);
        pageTexts.push('');
        emptyPageIndices.push(pageNum);
      }
    }

    const totalExtractedLength = pageTexts.reduce((acc, t) => acc + t.length, 0);

    // 2. OCR Fallback for scanned / image-only PDFs
    // If empty pages exist and the document has very little or no extracted text
    if (emptyPageIndices.length > 0 && (totalExtractedLength < 50 || emptyPageIndices.length >= Math.ceil(numPages / 2))) {
      const pagesToOcr = emptyPageIndices.slice(0, OCR_MAX_PAGES);
      console.log(`[VRH.AI PDF] Triggering OCR fallback for ${pagesToOcr.length} scanned pages (capped at ${OCR_MAX_PAGES})...`);

      let completedCount = 0;
      for (const pageNum of pagesToOcr) {
        completedCount++;
        const progressMsg = `OCR: page ${completedCount} of ${pagesToOcr.length}…`;
        if (typeof onProgress === 'function') onProgress(progressMsg);
        showSidepanelProgress(progressMsg);

        try {
          const page = await pdfDoc.getPage(pageNum);
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');

          await page.render({ canvasContext: ctx, viewport }).promise;

          const ocrText = await runTesseractOCR(canvas, (pct) => {
            const detailMsg = `OCR: page ${completedCount} of ${pagesToOcr.length} (${Math.round(pct * 100)}%)…`;
            if (typeof onProgress === 'function') onProgress(detailMsg);
            showSidepanelProgress(detailMsg);
          });

          if (ocrText && ocrText.trim()) {
            pageTexts[pageNum - 1] = ocrText.trim();
          }
        } catch (ocrErr) {
          console.error(`[VRH.AI PDF] OCR failed for page ${pageNum}:`, ocrErr);
        }
      }

      showSidepanelProgress(null);
    }

    return pageTexts.filter(Boolean).join('\n\n').trim();
  }

  if (typeof window !== 'undefined') {
    window.extractTextFromPDFBuffer = extractTextFromPDFBuffer;
  }

  // ── TAB EXECUTION (with auto content-script injection) ──
  async function executeOnTab(action, selector = null, text = null, direction = null, url = null, key = null, targetId = null) {
    return new Promise(async (resolve) => {
      let tab;
      if (selectedTabId) tab = await chrome.tabs.get(selectedTabId).catch(() => null);
      if (!tab) { const [a] = await chrome.tabs.query({ active: true, currentWindow: true }); tab = a; }
      if (!tab) return resolve({ error: "No active tab." });

      const msg = { action, selector, text, direction, url, key, targetId };
      const tabUrl = tab.url || '';
      
      // Local file or PDF reading bypass
      if (tabUrl.startsWith('file://') || tabUrl.endsWith('.pdf') || tabUrl.includes('.pdf') || tabUrl.includes('/pdf/')) {
        try {
          const response = await fetch(tabUrl);
          if (tabUrl.endsWith('.pdf') || tabUrl.includes('.pdf') || tabUrl.includes('/pdf/')) {
            const buffer = await response.arrayBuffer();
            const extractedText = await extractTextFromPDFBuffer(buffer);
            if (extractedText) {
              return resolve({ result: extractedText });
            } else {
              return resolve({ error: "Failed to extract text from PDF. It may be a scanned image PDF without a text layer." });
            }
          } else {
            // Local text / HTML file
            const localText = await response.text();
            if (tabUrl.endsWith('.html') || tabUrl.endsWith('.htm')) {
              const parser = new DOMParser();
              const doc = parser.parseFromString(localText, 'text/html');
              return resolve({ result: doc.body.innerText });
            }
            return resolve({ result: localText });
          }
        } catch (fetchErr) {
          console.error("PDF/Local file fetch error:", fetchErr);
          if (tabUrl.startsWith('file://')) {
            return resolve({ error: "Cannot read local file. Please enable 'Allow access to file URLs' in the VRH.AI extension settings at chrome://extensions." });
          } else {
            return resolve({ error: `Cannot read this file: ${fetchErr.message}` });
          }
        }
      }

      // Check if the tab URL is accessible (not chrome://, edge://, PDF, etc.)
      if (tabUrl.startsWith('chrome://') || tabUrl.startsWith('edge://') || tabUrl.startsWith('about:')) {
        return resolve({ error: `Cannot read this page (${tabUrl.split('://')[0]}:// pages are restricted).` });
      }

      chrome.tabs.sendMessage(tab.id, msg, async (r) => {
        if (chrome.runtime.lastError) {
          // Content script not injected — try to inject it and retry
          try {
            await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              files: ['content/content.js']
            });
            // Brief wait for script to initialize, then retry
            await new Promise(w => setTimeout(w, 300));
            chrome.tabs.sendMessage(tab.id, msg, (r2) => {
              if (chrome.runtime.lastError) {
                resolve({ error: 'Cannot read this page. It may be a PDF, restricted, or blocked page.' });
              } else {
                resolve(r2 || { error: "No response." });
              }
            });
          } catch (injectErr) {
            resolve({ error: 'Cannot access this tab. It may be a PDF, chrome://, or restricted page.' });
          }
        } else {
          resolve(r || { error: "No response." });
        }
      });
    });
  }

  // ── MESSAGE SANITIZATION ──
  function sanitizeMessages(messages) {
    return messages.map(m => {
      const sanitized = {
        role: m.role,
        content: m.content || ''
      };
      if (m.name) sanitized.name = m.name;
      if (m.tool_calls) sanitized.tool_calls = m.tool_calls;
      if (m.tool_call_id) sanitized.tool_call_id = m.tool_call_id;
      return sanitized;
    });
  }

  // ── INFERENCE CONFIG RESOLVER ──
  async function getInferenceConfig() {
    const storage = await chrome.storage.local.get([
      'activeModelValue',
      'apiKey',
      'customProviders',
      'customProviderName',
      'customBaseUrl',
      'apiUrl',
      'customApiKey',
      'selectedModels'
    ]);

    const activeVal = modelSelect.value || storage.activeModelValue || '';

    // 1. OpenRouter model routing
    if (activeVal.startsWith('openrouter:')) {
      const model = activeVal.replace('openrouter:', '');
      const key = (storage.apiKey || '').trim();
      if (!key) throw new Error("No OpenRouter API Key configured. Open Settings to add one.");

      const endpoint = 'https://openrouter.ai/api/v1/chat/completions';
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
        'HTTP-Referer': 'https://vrh.ai',
        'X-Title': 'VRH.AI Chrome Copilot'
      };

      return { endpoint, headers, model, providerName: 'OpenRouter' };
    }

    // 2. Custom OpenAI-compatible provider routing
    if (activeVal.startsWith('custom:')) {
      const parts = activeVal.split(':');
      const provId = parts[1];
      const model = parts.slice(2).join(':');

      let customProviders = storage.customProviders || [];
      if (!customProviders.length && (storage.customBaseUrl || storage.apiUrl)) {
        customProviders = [{
          id: 'legacy_default',
          name: storage.customProviderName || 'OpenAI-Compatible',
          baseUrl: storage.customBaseUrl || storage.apiUrl,
          apiKey: storage.customApiKey || ''
        }];
      }

      const prov = customProviders.find(p => p.id === provId) || customProviders[0];
      if (!prov) throw new Error("Provider not found for selected model. Open Settings.");

      const baseUrl = (prov.baseUrl || '').trim().replace(/\/+$/, '');
      const key = (prov.apiKey || '').trim();
      if (!baseUrl) throw new Error(`No Base URL configured for ${prov.name || 'provider'}. Open Settings.`);
      if (!key) throw new Error(`No API Key configured for ${prov.name || 'provider'}. Open Settings.`);

      const endpoint = baseUrl.endsWith('/chat/completions') 
        ? baseUrl 
        : `${baseUrl}/chat/completions`;

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      };

      return { endpoint, headers, model: model || 'gpt-4o', providerName: prov.name || 'OpenAI-Compatible' };
    }

    // 3. Fallback: Check OpenRouter key
    if (storage.apiKey && storage.apiKey.trim()) {
      return {
        endpoint: 'https://openrouter.ai/api/v1/chat/completions',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${storage.apiKey.trim()}`,
          'HTTP-Referer': 'https://vrh.ai',
          'X-Title': 'VRH.AI Chrome Copilot'
        },
        model: activeVal || (storage.selectedModels && storage.selectedModels[0]) || 'google/gemini-2.0-flash-001',
        providerName: 'OpenRouter'
      };
    }

    // 4. Fallback: Check customProviders
    const customProviders = storage.customProviders || [];
    if (customProviders.length > 0) {
      const prov = customProviders[0];
      const baseUrl = (prov.baseUrl || '').trim().replace(/\/+$/, '');
      const key = (prov.apiKey || '').trim();
      if (baseUrl && key) {
        return {
          endpoint: baseUrl.endsWith('/chat/completions') ? baseUrl : `${baseUrl}/chat/completions`,
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
          model: activeVal || (prov.selectedModels && prov.selectedModels[0]) || 'gpt-4o',
          providerName: prov.name || 'OpenAI-Compatible'
        };
      }
    }

    // 5. Fallback: Check legacy custom keys
    const baseUrl = (storage.customBaseUrl || storage.apiUrl || '').trim().replace(/\/+$/, '');
    const key = (storage.customApiKey || '').trim();
    if (baseUrl && key) {
      return {
        endpoint: baseUrl.endsWith('/chat/completions') ? baseUrl : `${baseUrl}/chat/completions`,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
        model: activeVal || 'gpt-4o',
        providerName: storage.customProviderName || 'OpenAI-Compatible'
      };
    }

    throw new Error("No configured AI providers found. Please open Settings and enter your API credentials.");
  }

  // ── GENERIC LLM API — STREAMING WITH BACKOFF RETRY ──
  let activeAbortController = null;

  async function callLLMStream(messages, onChunk, signal) {
    const { endpoint, headers, model } = await getInferenceConfig();
    const client = (typeof window !== 'undefined' && window.apiClient) || (typeof apiClient !== 'undefined' ? apiClient : null);
    if (client && typeof client.stream === 'function') {
      return await client.stream('', model, messages, onChunk, signal, { endpoint, headers });
    }

    // Fallback if apiClient is not loaded
    const sanitized = sanitizeMessages(messages);
    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({ model, messages: sanitized, stream: true, max_tokens: 2048 }),
      signal
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(e.error?.message || `API Error (${res.status})`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    let buffer = '';
    let hasThinking = false;
    let closedThinking = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') break;
          try {
            const json = JSON.parse(data);
            const delta = json.choices?.[0]?.delta;
            if (delta) {
              let updated = false;
              const reason = delta.reasoning_content || delta.reasoning;
              if (reason) {
                if (!hasThinking) { fullText += "<think>"; hasThinking = true; }
                fullText += reason;
                updated = true;
              }
              const content = delta.content;
              if (content) {
                if (hasThinking && !closedThinking) { fullText += "</think>"; closedThinking = true; }
                fullText += content;
                updated = true;
              }
              if (updated && onChunk) onChunk(fullText);
            }
          } catch(e) { /* skip */ }
        }
      }
    }
    if (hasThinking && !closedThinking) {
      fullText += "</think>";
      if (onChunk) onChunk(fullText);
    }
    return fullText;
  }

  // Non-streaming fallback for Agent mode (needs full JSON responses) with retry
  async function callLLM(messages, tools = null, signal) {
    const { endpoint, headers, model } = await getInferenceConfig();
    const client = (typeof window !== 'undefined' && window.apiClient) || (typeof apiClient !== 'undefined' ? apiClient : null);
    if (client && typeof client.complete === 'function') {
      return await client.complete('', model, messages, tools, signal, { endpoint, headers });
    }

    // Fallback if apiClient is not loaded
    const sanitized = sanitizeMessages(messages);
    const payload = { model, messages: sanitized, max_tokens: 2048 };
    if (tools) payload.tools = tools;

    let res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal
    });

    if (!res.ok && tools) {
      console.warn("Model failed to execute tool call, retrying with raw text fallback...");
      delete payload.tools;
      res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal
      });
    }

    if (!res.ok) { 
      const e = await res.json().catch(() => ({})); 
      const errMsg = e.error?.message || e.error?.metadata?.raw || `API Error (${res.status})`;
      throw new Error(errMsg); 
    }
    const data = await res.json();
    const message = data.choices[0].message;
    if (message.reasoning_content || message.reasoning) {
      const reason = message.reasoning_content || message.reasoning;
      message.content = `<think>${reason}</think>${message.content || ''}`;
    }
    return message;
  }

  // ── SEND BUTTON LOADING / STOP STATE ──
  const sendBtnOriginalHTML = sendBtn.innerHTML;
  const STOP_BTN_HTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>';

  function setSendLoading(loading) {
    if (loading) {
      sendBtn.disabled = false; // Keep enabled as Stop button
      sendBtn.classList.add('loading');
      sendBtn.innerHTML = STOP_BTN_HTML;
      sendBtn.title = 'Stop generation';
      sendBtn.onclick = () => {
        if (activeAbortController) {
          activeAbortController.abort();
          activeAbortController = null;
        }
        chrome.runtime.sendMessage({ action: "AGENT_STOP" }).catch(() => {});
      };
    } else {
      sendBtn.classList.remove('loading');
      sendBtn.innerHTML = sendBtnOriginalHTML;
      sendBtn.title = 'Send message';
      sendBtn.onclick = null; // Clear stop handler, use default click listener
      sendBtn.disabled = false;
    }
  }

  // ── INTERACTIVE AGENT EXECUTION CARD CONTROLLER (VERSION 1.0) ──
  let activeAgentMsgElement = null;
  let activeAgentTaskId = null;

  function createAgentExecutionCard(goal) {
    const cardId = 'agent_card_' + Date.now();
    activeAgentTaskId = cardId;
    const msg = document.createElement('div');
    msg.className = 'msg msg-assistant agent-msg-wrapper';
    msg.id = cardId;

    msg.innerHTML = `
      <div class="agent-execution-card glass">
        <div class="agent-card-header">
          <div class="agent-card-title">
            <span class="agent-pulse-indicator" id="${cardId}_pulse"></span>
            <span class="agent-card-badge" id="${cardId}_badge">AGENT ACTIVE</span>
            <span class="agent-step-counter" id="${cardId}_counter">Step 1/25</span>
          </div>
          <button class="agent-stop-btn" id="${cardId}_stopBtn" title="Stop Agent">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
            Stop
          </button>
        </div>
        <div class="agent-goal-display">🎯 <span>${escapeHtml(goal)}</span></div>
        <div class="agent-current-action">
          <span class="agent-action-spinner" id="${cardId}_spinner"></span>
          <span class="agent-action-text" id="${cardId}_actionText">Perceiving page elements & viewport...</span>
        </div>
        <details class="agent-steps-accordion" open>
          <summary class="agent-steps-summary">Action Timeline (<span id="${cardId}_stepCount">0</span>)</summary>
          <div class="agent-steps-list" id="${cardId}_stepsList">
            <div class="agent-step-item" style="color:var(--text-muted);font-size:0.75rem;">Initializing autonomous perception...</div>
          </div>
        </details>
      </div>
      <div class="agent-final-output" id="${cardId}_output" style="margin-top: 10px; display: none;"></div>
    `;

    const stopBtn = msg.querySelector(`#${cardId}_stopBtn`);
    if (stopBtn) {
      stopBtn.addEventListener('click', async () => {
        stopBtn.disabled = true;
        stopBtn.textContent = 'Stopping...';
        await chrome.runtime.sendMessage({ action: "AGENT_STOP" }).catch(() => {});
      });
    }

    hideWelcomeScreen();
    chatArea.appendChild(msg);
    chatArea.scrollTop = chatArea.scrollHeight;
    activeAgentMsgElement = msg;
    return msg;
  }

  function updateAgentExecutionCard(payload) {
    if (!activeAgentMsgElement && (payload.status === 'running' || payload.status === 'paused')) {
      createAgentExecutionCard(payload.taskGoal || 'Autonomous Browser Task');
    }
    if (!activeAgentMsgElement) return;

    const cardId = activeAgentTaskId || activeAgentMsgElement.id;
    const pulse = activeAgentMsgElement.querySelector(`#${cardId}_pulse`);
    const badge = activeAgentMsgElement.querySelector(`#${cardId}_badge`);
    const counter = activeAgentMsgElement.querySelector(`#${cardId}_counter`);
    const spinner = activeAgentMsgElement.querySelector(`#${cardId}_spinner`);
    const actionText = activeAgentMsgElement.querySelector(`#${cardId}_actionText`);
    const stepCountEl = activeAgentMsgElement.querySelector(`#${cardId}_stepCount`);
    const stepsList = activeAgentMsgElement.querySelector(`#${cardId}_stepsList`);
    const outputEl = activeAgentMsgElement.querySelector(`#${cardId}_output`);
    const stopBtn = activeAgentMsgElement.querySelector(`#${cardId}_stopBtn`);

    if (counter) counter.textContent = `Step ${payload.step || 1}/${payload.maxSteps || 25}`;

    // Update Action Text & Spinner
    let actionDesc = 'Working...';
    if (payload.phase === 'perceiving') actionDesc = '🔍 Scanning visible page elements & viewport...';
    else if (payload.phase === 'thinking') actionDesc = '🧠 Analyzing goal and deciding next action...';
    else if (payload.phase === 'acting') actionDesc = `⚡ Executing tool: ${payload.currentTool || 'browser action'}...`;
    else if (payload.phase === 'verifying') actionDesc = '👁️ Verifying visual & DOM state changes...';
    else if (payload.phase === 'paused') actionDesc = `⚠️ Paused: ${payload.interventionReason || 'Manual action required.'}`;
    else if (payload.status === 'done') actionDesc = payload.success ? '✅ Objective successfully completed!' : 'Task finished.';
    else if (payload.status === 'aborted') actionDesc = '⏹ Task stopped by user.';
    else if (payload.status === 'error') actionDesc = `❌ Error: ${payload.error || 'Failed'}`;

    if (actionText) actionText.textContent = actionDesc;

    // Timeline Rendering
    if (stepsList && payload.runLogs && payload.runLogs.length > 0) {
      stepsList.innerHTML = '';
      if (stepCountEl) stepCountEl.textContent = payload.runLogs.length;

      payload.runLogs.forEach(log => {
        const item = document.createElement('div');
        item.className = 'agent-step-item';
        
        let toolIcon = '⚡';
        let toolSummary = log.tool;
        if (log.tool === 'click_element') {
          toolIcon = '🎯';
          toolSummary = `Clicked element #${log.args?.mark_id || ''} ${log.reasoning ? '— ' + log.reasoning : ''}`;
        } else if (log.tool === 'type_text') {
          toolIcon = '⌨️';
          toolSummary = `Typed "${log.args?.text || ''}" into #${log.args?.mark_id || ''}`;
        } else if (log.tool === 'scroll_page') {
          toolIcon = '📜';
          toolSummary = `Scrolled ${log.args?.direction || 'down'} (${log.args?.amount_px || 600}px)`;
        } else if (log.tool === 'navigate_to') {
          toolIcon = '🌐';
          toolSummary = `Navigated to ${log.args?.url || ''}`;
        } else if (log.tool === 'press_hotkey') {
          toolIcon = '🎹';
          toolSummary = `Pressed key ${log.args?.keys || ''}`;
        } else if (log.tool === 'extract_data') {
          toolIcon = '📊';
          toolSummary = `Extracted structured data`;
        } else if (log.tool === 'switch_or_open_tab') {
          toolIcon = '🗂️';
          toolSummary = `Tab ${log.args?.action || 'action'}`;
        } else if (log.tool === 'finish_task') {
          toolIcon = '🏁';
          toolSummary = `Task completed`;
        }

        item.innerHTML = `
          <span class="agent-step-num">#${log.step}</span>
          <span class="agent-step-icon">${toolIcon}</span>
          <span class="agent-step-text">${escapeHtml(toolSummary)}</span>
        `;
        stepsList.appendChild(item);
      });
      chatArea.scrollTop = chatArea.scrollHeight;
    }

    // Status Completion or Error Handling
    if (payload.status === 'done' || payload.status === 'aborted' || payload.status === 'error') {
      if (pulse) {
        pulse.className = 'agent-pulse-indicator ' + (payload.status === 'done' ? 'done' : 'error');
      }
      if (badge) {
        badge.textContent = payload.status === 'done' ? (payload.success ? 'SUCCESS' : 'FINISHED') : payload.status.toUpperCase();
        badge.style.background = payload.status === 'done' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)';
        badge.style.color = payload.status === 'done' ? '#86efac' : '#fca5a5';
      }
      if (spinner) spinner.style.display = 'none';
      if (stopBtn) stopBtn.style.display = 'none';
      setSendLoading(false);

      if (outputEl) {
        outputEl.style.display = 'block';
        let summaryContent = payload.summary || payload.error || (payload.status === 'aborted' ? 'Agent task stopped by user.' : 'Task completed.');
        outputEl.innerHTML = formatMarkdown(summaryContent);
        addAssistantActions(outputEl, summaryContent);
        messageHistory.push({ role: 'assistant', content: summaryContent });
        saveChat();
      }
      activeAgentMsgElement = null;
      chatArea.scrollTop = chatArea.scrollHeight;
    }
  }

  // ── CHAT SEND HANDLER ──
  const handleSendMessage = async () => {
    const text = chatInput.value.trim();
    if (!text && !currentAttachedImage) return;

    // Handle slash commands on enter
    const matchedCmd = slashCommands.find(c => c.cmd === text.toLowerCase());
    if (matchedCmd) { chatInput.value = ''; slashHint.style.display = 'none'; if (matchedCmd.tab) switchTab(matchedCmd.tab); if (matchedCmd.action) matchedCmd.action(); return; }

    // Resolve context metadata
    let sharedTabTitle = null;
    if (isTabSharingEnabled) {
      try {
        if (selectedTabIds.size > 1) {
          sharedTabTitle = `${selectedTabIds.size} tabs`;
        } else if (selectedTabIds.size === 1) {
          const singleId = Array.from(selectedTabIds)[0];
          const tab = await chrome.tabs.get(singleId).catch(() => null);
          if (tab) sharedTabTitle = tab.title;
        } else {
          const [a] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (a) sharedTabTitle = a.title;
        }
      } catch (e) {
        console.error("Error resolving tab for metadata:", e);
      }
    }

    const filesMetadata = attachedFiles.map(f => f.name);
    const imgAttachment = currentAttachedImage;
    const metadata = {
      sharedTab: sharedTabTitle,
      attachedFiles: filesMetadata,
      imageUrl: imgAttachment ? imgAttachment.url : null,
      imageName: imgAttachment ? imgAttachment.name : null
    };

    // Construct multimodal or text user content
    let userMsgContent;
    if (imgAttachment) {
      if (typeof window.buildMultimodalMessage === 'function') {
        userMsgContent = window.buildMultimodalMessage('user', text || '(Image attached)', [imgAttachment.url]).content;
      } else {
        userMsgContent = [
          { type: "text", text: text || '(Image attached)' },
          { type: "image_url", image_url: { url: imgAttachment.url } }
        ];
      }
    } else {
      userMsgContent = text;
    }

    switchTab('chat');
    appendMessage(userMsgContent, 'user', true, metadata);
    chatInput.value = ''; chatInput.style.height = 'auto';
    if (currentAttachedImage) clearAttachedImage();
    historyPanel.style.display = 'none'; tabsPanel.style.display = 'none'; slashHint.style.display = 'none';

    setSendLoading(true);
    activeAbortController = new AbortController();
    const signal = activeAbortController.signal;

    const mode = modeSelect.value;
    const isAgent = mode === 'agent';
    const loader = createLoadingDots(); chatArea.appendChild(loader); chatArea.scrollTop = chatArea.scrollHeight;
    let activeMsg = null;

    try {
      if (!isAgent) {
        // ── ASK MODE (Streaming) ──
        let pageText = "[Tab sharing is currently toggled OFF in the sidepanel. The user can toggle it ON at any time to share page content with VRH.AI.]";
        if (isTabSharingEnabled) {
          if (selectedTabIds.size > 1) {
            pageText = await extractMultiTabContext(Array.from(selectedTabIds));
          } else if (selectedTabIds.size === 1) {
            const singleId = Array.from(selectedTabIds)[0];
            const pageRes = await executeOnTab("GET_PAGE_TEXT", null, null, null, null, null, singleId);
            if (pageRes.error) {
              pageText = `[Restricted Browser Page: ${pageRes.error}. Note: Chrome sandbox restricts extensions on internal chrome:// or Chrome Web Store pages. Regular web pages are fully accessible.]`;
            } else {
              pageText = pageRes.result ? pageRes.result.substring(0, 100000) : "No readable text found.";
            }
          } else {
            const pageRes = await executeOnTab("GET_PAGE_TEXT");
            if (pageRes.error) {
              console.warn("executeOnTab page text warning (expected for restricted pages):", pageRes.error);
              pageText = `[Restricted Browser Page: ${pageRes.error}. Note: Chrome sandbox restricts extensions on internal chrome:// or Chrome Web Store pages. Regular web pages are fully accessible.]`;
            } else {
              pageText = pageRes.result ? pageRes.result.substring(0, 100000) : "No readable text found.";
            }
          }
          console.log(`Extracted page text status: ${pageText.substring(0, 50)}... (${pageText.length} chars)`);
        }

        // Build file context if any files are attached
        let fileContext = '';
        if (attachedFiles.length > 0) {
          fileContext = '\n\nATTACHED FILES:\n';
          attachedFiles.forEach(f => {
            fileContext += `\n--- FILE: ${f.name} ---\n${f.content}\n--- END FILE ---\n`;
          });
        }

        let msgs = [{
          role: "system",
          content: buildVRHSystemPrompt({
            pageText,
            fileContext,
            userQuery: text
          })
        }];
        messageHistory.forEach(m => { if (m.role !== 'system') msgs.push(m); });
        
        if (chatArea.contains(loader)) chatArea.removeChild(loader);

        activeMsg = appendMessage("", 'assistant', false);
        const reply = await callLLMStream(msgs, (partialText) => {
          updateStreamingMessage(activeMsg, partialText);
        }, signal);
        
        updateStreamingMessage(activeMsg, reply);
        addAssistantActions(activeMsg, reply);
        
        messageHistory.push({ role: 'assistant', content: reply });
        activeMsg.dataset.historyIndex = messageHistory.length - 1;
        await saveChat();
      } else {
        // ── AGENT MODE (Version 1.0 Autonomous Background Runner) ──
        if (chatArea.contains(loader)) chatArea.removeChild(loader);

        let targetTab;
        if (selectedTabId) targetTab = await chrome.tabs.get(selectedTabId).catch(() => null);
        if (!targetTab || (targetTab.url && (targetTab.url.startsWith('chrome-extension://') || targetTab.url.startsWith('chrome://')))) {
          const tabs = await chrome.tabs.query({ currentWindow: true });
          targetTab = tabs.find(t => t.active && t.url && (t.url.startsWith('http://') || t.url.startsWith('https://'))) ||
                      tabs.find(t => t.url && (t.url.startsWith('http://') || t.url.startsWith('https://')));
        }

        const url = (targetTab?.url || '').toLowerCase();
        if (
          !url ||
          url.startsWith('chrome://') ||
          url.startsWith('chrome-extension://') ||
          url.startsWith('edge://') ||
          url.startsWith('about:') ||
          url.startsWith('view-source:') ||
          url.startsWith('devtools://') ||
          url.includes('chromewebstore.google.com') ||
          url.includes('chrome.google.com/webstore')
        ) {
          appendMessage("⚠️ **Restricted Browser Page**\n\nChrome prevents extensions from automating internal browser pages (such as `chrome://` settings or the Chrome Web Store).\n\nPlease open or switch to any regular webpage (e.g. [Google](https://google.com), [Wikipedia](https://wikipedia.org), or any web app) and run your agent task again.", 'assistant');
          setSendLoading(false);
          return;
        }

        // Render Interactive Agent Execution Card
        createAgentExecutionCard(text);

        // Start background autonomous runner
        const startRes = await chrome.runtime.sendMessage({
          action: "AGENT_START",
          goal: text,
          tabId: targetTab?.id
        }).catch(err => ({ success: false, error: err.message }));

        if (!startRes || !startRes.success) {
          const errMsg = startRes?.error || "Failed to initialize autonomous agent.";
          updateAgentExecutionCard({
            status: 'error',
            error: errMsg
          });
          setSendLoading(false);
        }
      }
    } catch(err) {
      if (err.name === 'AbortError') {
        // User clicked Stop — keep partial content
        if (activeMsg) {
          const currentText = activeMsg.textContent || '';
          if (currentText.trim()) {
            addAssistantActions(activeMsg, currentText + '\n\n*(stopped)*');
          } else {
            activeMsg.remove();
          }
        }
      } else {
        if (chatArea.contains(loader)) chatArea.removeChild(loader);
        if (activeMsg && (!activeMsg.textContent || !activeMsg.textContent.trim())) {
          activeMsg.remove();
        }
        appendMessage(`Error: ${escapeHtml(err.message)}`, 'assistant');
      }
    } finally {
      activeAbortController = null;
      setSendLoading(false);
    }
  };

  sendBtn.addEventListener('click', handleSendMessage);
  chatInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } });

  // ── SUMMARIZE TOOL ──
  summarizeBtn.addEventListener('click', async () => {
    const style = document.querySelector('[data-style].active')?.dataset.style || 'bullets';
    summarizeBtn.disabled = true;
    summarizeBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation:spin 1s linear infinite"><path d="M21 12a9 9 0 1 1-6.22-8.56"/></svg> Summarizing...';
    summarizeOutput.classList.remove('visible');

    try {
      const pageRes = await executeOnTab('GET_PAGE_TEXT');
      if (pageRes.error) console.error("executeOnTab page text error:", pageRes.error);
      const pageText = pageRes.result ? pageRes.result.substring(0, 6000) : 'No readable text found.';
      console.log(`Extracted page text for summary: ${pageText.length} chars`);

      const stylePrompts = {
        bullets: 'Summarize this page as concise bullet points. Use markdown bullet points.',
        paragraph: 'Write a concise paragraph summary of this page.',
        tldr: 'Give a one or two sentence TL;DR summary of this page.'
      };

      const reply = await callLLMStream([
        { role: 'system', content: `You are VRH.AI. ${stylePrompts[style]}\n\nPAGE CONTENT:\n${pageText}` },
        { role: 'user', content: 'Summarize this page.' }
      ], (partialText) => {
        summarizeOutput.innerHTML = formatMarkdown(partialText);
        summarizeOutput.classList.add('visible');
      });

      summarizeOutput.innerHTML = formatMarkdown(reply);
      summarizeOutput.appendChild(createOutputActions(reply));
      summarizeOutput.classList.add('visible');
    } catch(err) {
      summarizeOutput.innerHTML = `<span style="color:#ef4444;">Error: ${escapeHtml(err.message)}</span>`;
      summarizeOutput.classList.add('visible');
    }

    summarizeBtn.disabled = false;
    summarizeBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> Summarize Current Page';
  });

  // ── OUTPUT ACTIONS ──
  function createOutputActions(text) {
    const container = document.createElement('div');
    container.className = 'tool-output-actions';
    const copyBtn = document.createElement('button');
    copyBtn.className = 'msg-action-btn';
    copyBtn.textContent = '📋 Copy';
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(text);
      copyBtn.textContent = '✓ Copied!';
      setTimeout(() => { copyBtn.textContent = '📋 Copy'; }, 1500);
    });
    container.appendChild(copyBtn);
    return container;
  }

  // ── LISTEN FOR BACKGROUND AGENT & SELECTION ACTIONS (VERSION 1.0) ──
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'AGENT_STATUS_UPDATE' && msg.payload) {
      updateAgentExecutionCard(msg.payload);
    }
    else if (msg.type === 'VRH_SELECTION_ACTION' || msg.action === 'EXECUTE_SELECTION_ACTION') {
      const action = msg.subAction || msg.action;
      const text = msg.text;
      if (!text) return;

      if (action === 'explain') {
        switchTab('chat');
        modeSelect.value = 'ask';
        modeSelect.dispatchEvent(new Event('change'));
        chatInput.value = `Explain the following text:\n\n"${text}"`;
        handleSendMessage();
      } else if (action === 'summarize') {
        switchTab('chat');
        modeSelect.value = 'ask';
        modeSelect.dispatchEvent(new Event('change'));
        chatInput.value = `Summarize the following text concisely:\n\n"${text}"`;
        handleSendMessage();
      } else if (action === 'translate') {
        switchTab('chat');
        modeSelect.value = 'ask';
        modeSelect.dispatchEvent(new Event('change'));
        chatInput.value = `Translate the following text into English:\n\n"${text}"`;
        handleSendMessage();
      } else if (action === 'rewrite') {
        switchTab('chat');
        modeSelect.value = 'ask';
        modeSelect.dispatchEvent(new Event('change'));
        chatInput.value = `Rewrite and improve the following text:\n\n"${text}"`;
        handleSendMessage();
      } else if (action === 'ask') {
        switchTab('chat');
        modeSelect.value = 'ask';
        modeSelect.dispatchEvent(new Event('change'));
        chatInput.value = `Regarding this text: "${text}"\n\n`;
        chatInput.focus();
        if (chatInput.setSelectionRange) {
          chatInput.setSelectionRange(chatInput.value.length, chatInput.value.length);
        }
      }
    }
  });

  // Check for pending selection action stored during panel launch
  if (chrome.storage && chrome.storage.session) {
    chrome.storage.session.get('pendingSelectionAction', (res) => {
      if (res && res.pendingSelectionAction) {
        const { action, text, timestamp } = res.pendingSelectionAction;
        if (Date.now() - timestamp < 30000) {
          if (action === 'explain') {
            switchTab('chat');
            modeSelect.value = 'ask';
            modeSelect.dispatchEvent(new Event('change'));
            chatInput.value = `Explain the following text:\n\n"${text}"`;
            handleSendMessage();
          } else if (action === 'summarize') {
            switchTab('chat');
            modeSelect.value = 'ask';
            modeSelect.dispatchEvent(new Event('change'));
            chatInput.value = `Summarize the following text concisely:\n\n"${text}"`;
            handleSendMessage();
          } else if (action === 'translate') {
            switchTab('chat');
            modeSelect.value = 'ask';
            modeSelect.dispatchEvent(new Event('change'));
            chatInput.value = `Translate the following text into English:\n\n"${text}"`;
            handleSendMessage();
          } else if (action === 'rewrite') {
            switchTab('chat');
            modeSelect.value = 'ask';
            modeSelect.dispatchEvent(new Event('change'));
            chatInput.value = `Rewrite and improve the following text:\n\n"${text}"`;
            handleSendMessage();
          } else if (action === 'ask') {
            switchTab('chat');
            modeSelect.value = 'ask';
            modeSelect.dispatchEvent(new Event('change'));
            chatInput.value = `Regarding this text: "${text}"\n\n`;
            chatInput.focus();
            if (chatInput.setSelectionRange) {
              chatInput.setSelectionRange(chatInput.value.length, chatInput.value.length);
            }
          }
        }
        chrome.storage.session.remove('pendingSelectionAction');
      }
    });
  }

  // Query active background agent state on startup (in case user opened sidepanel during a run)
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
    chrome.runtime.sendMessage({ action: "GET_AGENT_STATE" }, (res) => {
      if (res && res.success && res.state && res.state.isRunning) {
        updateAgentExecutionCard({
          ...res.state,
          taskGoal: res.state.taskGoal || 'Active Browser Automation'
        });
        setSendLoading(true);
      }
    });
  }
};

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSidepanelApp);
  } else {
    initSidepanelApp();
  }
}

if (typeof window !== 'undefined') {
  window.buildVRHSystemPrompt = buildVRHSystemPrompt;
}
if (typeof globalThis !== 'undefined') {
  globalThis.buildVRHSystemPrompt = buildVRHSystemPrompt;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { buildVRHSystemPrompt };
}
