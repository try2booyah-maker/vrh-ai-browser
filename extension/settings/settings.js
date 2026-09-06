document.addEventListener('DOMContentLoaded', async () => {
  // ── Element Bindings ──
  const navItems = document.querySelectorAll('.nav-item');
  const sections = document.querySelectorAll('.settings-section');
  
  // OpenRouter elements
  const apiKeyInput = document.getElementById('apiKey');
  const toggleVisibilityBtn = document.getElementById('toggleVisibilityBtn');
  const fetchModelsBtn = document.getElementById('fetchModelsBtn');
  const testOpenRouterBtn = document.getElementById('testOpenRouterBtn');
  const openRouterTestStatus = document.getElementById('openRouterTestStatus');
  const modelSearch = document.getElementById('modelSearch'); // OpenRouter search input
  const modelSearchResults = document.getElementById('modelSearchResults');
  const openrouterPicker = document.getElementById('openrouterPicker');
  const selectedModelsList = document.getElementById('selectedModelsList');

  // Multi-Provider Elements
  const customProvidersContainer = document.getElementById('customProvidersContainer');
  const addCustomProviderBtn = document.getElementById('addCustomProviderBtn');

  const themePills = document.querySelectorAll('#themePills .option-pill');
  const defaultModeSelect = document.getElementById('defaultMode');

  const toolbarToggle = document.getElementById('toolbarToggle');
  const autoShareToggle = document.getElementById('autoShareToggle');
  const shortcutBtn = document.getElementById('shortcutBtn');

  const excludedSitesArea = document.getElementById('excludedSites');
  const saveExclusionsBtn = document.getElementById('saveExclusionsBtn');

  const exportBtn = document.getElementById('exportBtn');
  const importBtn = document.getElementById('importBtn');
  const importInput = document.getElementById('importInput');
  const clearHistoryBtn = document.getElementById('clearHistoryBtn');

  let allModels = [];
  let selectedModels = [];
  let customProviders = [];

  // ══════════════════════════════════════════════════
  // TAB NAVIGATION
  // ══════════════════════════════════════════════════
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      navItems.forEach(nav => nav.classList.remove('active'));
      sections.forEach(sec => sec.classList.add('hidden'));

      item.classList.add('active');
      const targetSec = document.getElementById(`section-${item.dataset.section}`);
      if (targetSec) targetSec.classList.remove('hidden');
    });
  });

  // ══════════════════════════════════════════════════
  // UTILITY: SHOW TOAST
  // ══════════════════════════════════════════════════
  function showToast(text) {
    const t = document.createElement('div');
    t.textContent = text;
    document.body.appendChild(t);
    t.style.cssText = 'position:fixed;bottom:24px;right:24px;background:var(--primary-color);color:#0b0f19;padding:12px 24px;border-radius:8px;font-weight:600;font-size:0.9rem;box-shadow:0 8px 24px rgba(0,0,0,0.25);z-index:9999;transition:all 0.3s ease;transform:translateY(20px);opacity:0;';
    
    // Trigger paint to animate
    requestAnimationFrame(() => {
      t.style.transform = 'translateY(0)';
      t.style.opacity = '1';
    });

    setTimeout(() => {
      t.style.transform = 'translateY(10px)';
      t.style.opacity = '0';
      setTimeout(() => t.remove(), 300);
    }, 2000);
  }

  // ══════════════════════════════════════════════════
  // THEME & CORE INITIALIZATION
  // ══════════════════════════════════════════════════
  const storageData = await chrome.storage.local.get([
    'apiKey', 
    'selectedModels', 
    'allModels',
    'customProviders',
    'customProviderName',
    'customBaseUrl',
    'apiUrl',
    'customApiKey',
    'customSelectedModels',
    'customAllModels',
    'uiTheme', 
    'defaultMode', 
    'toolbarEnabled', 
    'autoShareEnabled', 
    'excludedSites',
    'cautiousMode'
  ]);

  const activeTheme = storageData.uiTheme || 'dark';
  document.documentElement.setAttribute('data-theme', activeTheme);
  themePills.forEach(pill => {
    pill.classList.toggle('active', pill.dataset.themeVal === activeTheme);
  });

  // Theme Listener
  themePills.forEach(pill => {
    pill.addEventListener('click', () => {
      themePills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      const val = pill.dataset.themeVal;
      document.documentElement.setAttribute('data-theme', val);
      chrome.storage.local.set({ uiTheme: val });
      showToast(`Theme switched to ${val}`);
    });
  });

  // Default Mode Init
  if (storageData.defaultMode) {
    defaultModeSelect.value = storageData.defaultMode;
  }
  defaultModeSelect.addEventListener('change', (e) => {
    chrome.storage.local.set({ defaultMode: e.target.value });
    showToast('Default mode saved');
  });

  // ══════════════════════════════════════════════════
  // PROVIDER 1: OPENROUTER
  // ══════════════════════════════════════════════════

  // Load saved values
  if (storageData.apiKey) apiKeyInput.value = storageData.apiKey;
  if (storageData.selectedModels) {
    selectedModels = storageData.selectedModels;
    renderSelectedModels();
  }
  if (storageData.allModels && storageData.allModels.length > 0) {
    allModels = storageData.allModels;
  }

  function renderModelSearchResults(query) {
    const filtered = allModels.filter(m =>
      m.id.toLowerCase().includes(query.toLowerCase()) ||
      m.name.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 50);

    if (filtered.length === 0) {
      modelSearchResults.innerHTML = '<div style="padding:10px;color:var(--text-muted);font-size:0.85rem;">No models found.</div>';
      modelSearchResults.style.display = 'block';
      return;
    }

    modelSearchResults.innerHTML = '';
    filtered.forEach(m => {
      const item = document.createElement('div');
      item.style.cssText = 'padding:8px 12px;cursor:pointer;border-bottom:1px solid var(--border-color);';
      item.innerHTML = `<div style="font-size:0.85rem;font-weight:500;color:var(--text-color);">${m.name}</div><div style="font-size:0.75rem;color:var(--text-muted);">${m.id}</div>`;
      item.addEventListener('mouseenter', () => item.style.background = 'var(--hover-bg, rgba(255,255,255,0.06))');
      item.addEventListener('mouseleave', () => item.style.background = '');
      item.addEventListener('click', () => {
        addModel(m.id);
        modelSearch.value = '';
        modelSearchResults.style.display = 'none';
      });
      modelSearchResults.appendChild(item);
    });
    modelSearchResults.style.display = 'block';
  }

  modelSearch.addEventListener('input', (e) => {
    const key = apiKeyInput.value.trim();
    if (!key) {
      modelSearchResults.innerHTML = '<div style="padding:10px;color:#ef4444;font-size:0.85rem;font-weight:500;">⚠️ Please enter your OpenRouter API Key first.</div>';
      modelSearchResults.style.display = 'block';
      return;
    }
    if (allModels.length > 0) {
      const q = e.target.value.trim();
      if (q) {
        renderModelSearchResults(q);
      } else {
        modelSearchResults.style.display = 'none';
      }
    } else {
      modelSearchResults.innerHTML = '<div style="padding:10px;color:var(--text-muted);font-size:0.85rem;">No cached models. Click "Fetch Models" to load.</div>';
      modelSearchResults.style.display = 'block';
    }
  });

  // Hide OpenRouter results when clicking outside
  document.addEventListener('click', (e) => {
    if (openrouterPicker && !openrouterPicker.contains(e.target)) {
      modelSearchResults.style.display = 'none';
    }
  });

  // OpenRouter: Fetch Models
  fetchModelsBtn.addEventListener('click', async () => {
    const key = apiKeyInput.value.trim();
    if (!key) {
      showToast('❌ Enter your OpenRouter API Key first.');
      return;
    }
    fetchModelsBtn.textContent = '⏳ Fetching...';
    fetchModelsBtn.disabled = true;
    try {
      const res = await fetch('https://openrouter.ai/api/v1/models', {
        headers: {
          'Authorization': `Bearer ${key}`,
          'HTTP-Referer': 'https://vrh.ai',
          'X-Title': 'VRH.AI Chrome Copilot'
        }
      });
      const data = await res.json();
      if (data && data.data) {
        allModels = data.data
          .filter(m => m.id)
          .map(m => ({ id: m.id, name: m.name || m.id }))
          .sort((a, b) => a.name.localeCompare(b.name));
        chrome.storage.local.set({ allModels });
        showToast(`✅ Loaded ${allModels.length} models! Type to search.`);
        modelSearch.focus();
        renderModelSearchResults('');
      }
    } catch (e) {
      showToast('❌ Failed to fetch: ' + e.message);
    } finally {
      fetchModelsBtn.textContent = 'Fetch Models';
      fetchModelsBtn.disabled = false;
    }
  });

  // OpenRouter: Test Connection
  if (testOpenRouterBtn) {
    testOpenRouterBtn.addEventListener('click', async () => {
      const key = apiKeyInput.value.trim();
      if (!key) {
        if (openRouterTestStatus) {
          openRouterTestStatus.style.display = 'block';
          openRouterTestStatus.style.color = '#ef4444';
          openRouterTestStatus.textContent = '⚠️ Enter OpenRouter API Key first.';
        }
        showToast('❌ Enter your OpenRouter API Key first.');
        return;
      }
      testOpenRouterBtn.textContent = '⚡ Testing...';
      testOpenRouterBtn.disabled = true;
      if (openRouterTestStatus) {
        openRouterTestStatus.style.display = 'block';
        openRouterTestStatus.style.color = 'var(--text-muted)';
        openRouterTestStatus.textContent = 'Testing connection to OpenRouter...';
      }
      const start = performance.now();
      try {
        const res = await fetch('https://openrouter.ai/api/v1/models', {
          headers: {
            'Authorization': `Bearer ${key}`,
            'HTTP-Referer': 'https://vrh.ai',
            'X-Title': 'VRH.AI Chrome Copilot'
          }
        });
        const latency = Math.round(performance.now() - start);
        if (res.ok) {
          if (openRouterTestStatus) {
            openRouterTestStatus.style.color = '#22c55e';
            openRouterTestStatus.textContent = `✅ Connected successfully (${latency}ms)`;
          }
          showToast(`✅ OpenRouter connected (${latency}ms)`);
        } else {
          if (openRouterTestStatus) {
            openRouterTestStatus.style.color = '#ef4444';
            openRouterTestStatus.textContent = `❌ Server responded with HTTP ${res.status}`;
          }
          showToast(`❌ OpenRouter HTTP ${res.status}`);
        }
      } catch (err) {
        if (openRouterTestStatus) {
          openRouterTestStatus.style.color = '#ef4444';
          openRouterTestStatus.textContent = `❌ Connection failed: ${err.message}`;
        }
        showToast(`❌ Connection failed: ${err.message}`);
      } finally {
        testOpenRouterBtn.textContent = '⚡ Test';
        testOpenRouterBtn.disabled = false;
      }
    });
  }

  // OpenRouter API Key visibility toggle
  toggleVisibilityBtn.addEventListener('click', () => {
    const isPassword = apiKeyInput.type === 'password';
    apiKeyInput.type = isPassword ? 'text' : 'password';
    const eyeIcon = document.getElementById('eyeIcon');
    if (isPassword) {
      eyeIcon.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>';
    } else {
      eyeIcon.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>';
    }
  });

  const saveApiKey = (key) => {
    const trimmed = key.trim();
    chrome.storage.local.set({ apiKey: trimmed });
    if (!trimmed) {
      // Clear models list cache if API key is cleared/deleted
      allModels = [];
      chrome.storage.local.set({ allModels: [] });
      modelSearchResults.style.display = 'none';
    }
  };

  apiKeyInput.addEventListener('input', (e) => {
    saveApiKey(e.target.value);
  });

  apiKeyInput.addEventListener('change', (e) => {
    saveApiKey(e.target.value);
    if (e.target.value.trim()) {
      showToast('OpenRouter API Key saved');
    }
  });

  function addModel(modelId) {
    if (!selectedModels.includes(modelId)) {
      selectedModels.push(modelId);
      chrome.storage.local.set({ selectedModels });
      renderSelectedModels();
      const modelInfo = allModels.find(m => m.id === modelId);
      showToast(`${modelInfo ? modelInfo.name : modelId} added`);
    }
  }

  function removeModel(modelId) {
    selectedModels = selectedModels.filter(id => id !== modelId);
    chrome.storage.local.set({ selectedModels });
    renderSelectedModels();
    showToast(`${modelId} removed`);
  }

  function renderSelectedModels() {
    selectedModelsList.innerHTML = '';
    if (selectedModels.length === 0) {
      selectedModelsList.innerHTML = '<div style="font-size: 0.85rem; color: var(--text-muted); padding: 8px 0;">No models added yet. Fetch models and select from the list.</div>';
      return;
    }
    selectedModels.forEach(modelId => {
      const modelInfo = allModels.find(m => m.id === modelId);
      const displayName = modelInfo ? modelInfo.name : modelId;

      const div = document.createElement('div');
      div.className = 'model-item detailed';
      
      const textContainer = document.createElement('div');
      textContainer.className = 'model-item-text';
      textContainer.innerHTML = `
        <div class="model-title">${displayName}</div>
        <div class="model-id" style="font-size:0.78rem;color:var(--text-muted);margin-top:2px;">${modelId}</div>
      `;

      const delBtn = document.createElement('button');
      delBtn.className = 'delete-btn';
      delBtn.type = 'button';
      delBtn.title = 'Remove model';
      delBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>';
      delBtn.addEventListener('click', () => removeModel(modelId));

      div.appendChild(textContainer);
      div.appendChild(delBtn);
      selectedModelsList.appendChild(div);
    });
  }

  // ══════════════════════════════════════════════════
  // PROVIDER 2: OPENAI-COMPATIBLE MULTI-PROVIDER SYSTEM
  // ══════════════════════════════════════════════════

  // Load customProviders or migrate legacy single provider
  if (Array.isArray(storageData.customProviders) && storageData.customProviders.length > 0) {
    customProviders = storageData.customProviders;
  } else if (storageData.customProviderName || storageData.customBaseUrl || storageData.customApiKey) {
    customProviders = [{
      id: 'prov_' + Date.now(),
      name: storageData.customProviderName || 'OpenAI',
      baseUrl: storageData.customBaseUrl || storageData.apiUrl || 'https://api.openai.com/v1',
      apiKey: storageData.customApiKey || '',
      selectedModels: storageData.customSelectedModels || [],
      allModels: storageData.customAllModels || []
    }];
  } else {
    customProviders = [{
      id: 'prov_' + Date.now(),
      name: 'OpenAI',
      baseUrl: 'https://api.openai.com/v1',
      apiKey: '',
      selectedModels: [],
      allModels: []
    }];
  }

  function saveAllCustomProviders() {
    chrome.storage.local.set({
      customProviders,
      // Mirror primary provider for backward compatibility
      customProviderName: customProviders[0]?.name || '',
      customBaseUrl: customProviders[0]?.baseUrl || '',
      apiUrl: customProviders[0]?.baseUrl || '',
      customApiKey: customProviders[0]?.apiKey || '',
      customSelectedModels: customProviders[0]?.selectedModels || []
    });
  }

  saveAllCustomProviders();

  function renderCustomProviders() {
    if (!customProvidersContainer) return;
    customProvidersContainer.innerHTML = '';

    customProviders.forEach((prov) => {
      const card = document.createElement('div');
      card.className = 'card custom-provider-card';
      card.dataset.providerId = prov.id;

      const isComplete = Boolean(
        (prov.name || '').trim() &&
        (prov.baseUrl || '').trim() &&
        (prov.apiKey || '').trim()
      );

      const canDelete = customProviders.length > 1;

      card.innerHTML = `
        <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect><rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line></svg>
            <span class="prov-title-text" style="font-weight: 600; font-size: 1rem;">${typeof escapeHtml === 'function' ? escapeHtml(prov.name || 'OpenAI-Compatible Provider') : (prov.name || 'OpenAI-Compatible Provider')}</span>
          </div>
          ${canDelete ? `
          <button type="button" class="del-prov-btn" title="Remove this provider" style="background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); color: #ef4444; border-radius: 6px; padding: 5px 10px; font-size: 0.78rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
            Remove
          </button>` : ''}
        </div>
        <div class="card-body">
          <div class="preset-box" style="margin-bottom: 16px;">
            <div style="font-size: 0.76rem; font-weight: 600; color: var(--text-muted); margin-bottom: 6px;">⚡ Quick Presets</div>
            <div style="display: flex; flex-wrap: wrap; gap: 6px;">
              <button type="button" class="preset-chip" data-name="OpenAI" data-url="https://api.openai.com/v1" data-model="gpt-4o">OpenAI</button>
              <button type="button" class="preset-chip" data-name="Groq" data-url="https://api.groq.com/openai/v1" data-model="llama-3.3-70b-versatile">Groq</button>
              <button type="button" class="preset-chip" data-name="Ollama (Local)" data-url="http://localhost:11434/v1" data-model="llama3.2-vision">Ollama</button>
              <button type="button" class="preset-chip" data-name="LM Studio" data-url="http://localhost:1234/v1" data-model="local-model">LM Studio</button>
            </div>
          </div>

          <div class="form-group">
            <label>Provider Name</label>
            <input type="text" class="prov-name-input" value="${typeof escapeHtml === 'function' ? escapeHtml(prov.name || '') : (prov.name || '')}" placeholder="e.g. OpenAI, Groq, Ollama">
          </div>

          <div class="form-group">
            <label>Base URL</label>
            <input type="text" class="prov-url-input" value="${typeof escapeHtml === 'function' ? escapeHtml(prov.baseUrl || '') : (prov.baseUrl || '')}" placeholder="https://api.openai.com/v1">
            <p class="form-desc">Standard OpenAI-compatible API base URL.</p>
          </div>

          <div class="form-group">
            <label>API Key</label>
            <div class="input-with-button">
              <input type="password" class="prov-key-input" value="${typeof escapeHtml === 'function' ? escapeHtml(prov.apiKey || '') : (prov.apiKey || '')}" placeholder="sk-...">
              <button class="action-icon-btn prov-toggle-key-btn" type="button" title="Toggle visibility">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
              </button>
            </div>
          </div>

          <!-- Incomplete hint -->
          <div class="prov-incomplete-hint" style="display: ${isComplete ? 'none' : 'flex'}; padding: 14px 16px; background: rgba(234, 179, 8, 0.08); border: 1px dashed rgba(234, 179, 8, 0.4); border-radius: 8px; margin-top: 14px; align-items: center; gap: 12px;">
            <span style="font-size: 1.2rem;">⚠️</span>
            <div style="font-size: 0.83rem; color: var(--text-color); line-height: 1.4;">
              <strong>Configuration Required:</strong> Enter <strong>Provider Name</strong>, <strong>Base URL</strong>, and <strong>API Key</strong> above to unlock model selection for this provider.
            </div>
          </div>

          <!-- Models Section (Only visible when all 3 fields are non-empty) -->
          <div class="prov-models-section" style="display: ${isComplete ? 'block' : 'none'}; margin-top: 18px; border-top: 1px solid var(--border-color); padding-top: 16px;">
            <label style="font-weight: 600; font-size: 0.92rem;">Model Access Pool</label>
            <p class="form-desc">Selected models from this provider will appear in the side panel.</p>

            <div style="margin-bottom: 12px;">
              <div style="font-size: 0.76rem; font-weight: 600; color: var(--text-muted); margin-bottom: 6px;">⚡ Recommended Models</div>
              <div class="rec-chips-row" style="display: flex; flex-wrap: wrap; gap: 6px;">
                <button type="button" class="rec-model-chip prov-rec-chip" data-id="gpt-4o">+ GPT-4o</button>
                <button type="button" class="rec-model-chip prov-rec-chip" data-id="gpt-4o-mini">+ GPT-4o Mini</button>
                <button type="button" class="rec-model-chip prov-rec-chip" data-id="llama-3.3-70b-versatile">+ Llama 3.3 70B</button>
                <button type="button" class="rec-model-chip prov-rec-chip" data-id="llama3.2-vision">+ Llama 3.2 Vision</button>
              </div>
            </div>

            <div class="prov-selected-models-list models-list"></div>

            <div class="prov-picker-row" style="margin-top: 12px;">
              <div style="display: flex; gap: 8px; margin-bottom: 8px; align-items: center;">
                <input type="text" class="prov-search-input" placeholder="🔍 Search fetched models..." style="flex: 1; padding: 8px 12px; background: var(--input-bg); border: 1px solid var(--border-color); border-radius: 6px; color: var(--text-color);">
                <button class="btn btn-secondary btn-sm prov-test-btn" type="button" title="Test endpoint latency">⚡ Test</button>
                <button class="btn btn-secondary btn-sm prov-fetch-btn" type="button">Fetch Models</button>
              </div>
              <div class="prov-test-status" style="font-size: 0.8rem; font-weight: 600; margin-bottom: 8px; display: none;"></div>
              <div class="prov-search-results" style="max-height: 200px; overflow-y: auto; background: var(--input-bg); border: 1px solid var(--border-color); border-radius: 6px; display: none;"></div>
            </div>

            <div style="margin-top: 12px; padding: 12px; background: var(--input-bg); border-radius: 8px; border: 1px solid var(--border-color);">
              <div style="font-size: 0.78rem; font-weight: 600; color: var(--text-muted); margin-bottom: 6px;">Manual Model Entry</div>
              <div style="display: flex; gap: 8px;">
                <input type="text" class="prov-manual-input" placeholder="Type exact model ID (e.g. gpt-4o)..." style="flex: 1; padding: 7px 12px; background: var(--bg-color); border: 1px solid var(--border-color); border-radius: 6px; color: var(--text-color); font-size: 0.85rem;">
                <button class="btn btn-secondary btn-sm prov-add-manual-btn" type="button">+ Add</button>
              </div>
            </div>
          </div>
        </div>
      `;

      // Select elements within this card
      const nameInput = card.querySelector('.prov-name-input');
      const urlInput = card.querySelector('.prov-url-input');
      const keyInput = card.querySelector('.prov-key-input');
      const toggleKeyBtn = card.querySelector('.prov-toggle-key-btn');
      const titleText = card.querySelector('.prov-title-text');
      const hintEl = card.querySelector('.prov-incomplete-hint');
      const modelsSection = card.querySelector('.prov-models-section');
      const selectedListEl = card.querySelector('.prov-selected-models-list');
      const searchInput = card.querySelector('.prov-search-input');
      const searchResultsEl = card.querySelector('.prov-search-results');
      const testBtn = card.querySelector('.prov-test-btn');
      const testStatus = card.querySelector('.prov-test-status');
      const fetchBtn = card.querySelector('.prov-fetch-btn');
      const manualInput = card.querySelector('.prov-manual-input');
      const addManualBtn = card.querySelector('.prov-add-manual-btn');
      const delProvBtn = card.querySelector('.del-prov-btn');

      function updateCardCompletion() {
        const complete = Boolean(
          nameInput.value.trim() &&
          urlInput.value.trim() &&
          keyInput.value.trim()
        );
        hintEl.style.display = complete ? 'none' : 'flex';
        modelsSection.style.display = complete ? 'block' : 'none';
        if (!complete) searchResultsEl.style.display = 'none';
        return complete;
      }

      function renderModels() {
        selectedListEl.innerHTML = '';
        if (!prov.selectedModels || prov.selectedModels.length === 0) {
          selectedListEl.innerHTML = '<div style="font-size: 0.85rem; color: var(--text-muted); padding: 8px 0;">No models added yet. Fetch models or add manually below.</div>';
          return;
        }
        prov.selectedModels.forEach(modelId => {
          const mInfo = (prov.allModels || []).find(m => m.id === modelId);
          const displayName = mInfo ? mInfo.name : modelId;

          const div = document.createElement('div');
          div.className = 'model-item detailed';

          const textContainer = document.createElement('div');
          textContainer.className = 'model-item-text';
          textContainer.innerHTML = `
            <div class="model-title">${displayName}</div>
            <div class="model-id" style="font-size:0.78rem;color:var(--text-muted);margin-top:2px;">${modelId}</div>
          `;

          const delBtn = document.createElement('button');
          delBtn.className = 'delete-btn';
          delBtn.type = 'button';
          delBtn.title = 'Remove model';
          delBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>';
          delBtn.addEventListener('click', () => {
            prov.selectedModels = prov.selectedModels.filter(id => id !== modelId);
            saveAllCustomProviders();
            renderModels();
            showToast(`${modelId} removed from ${prov.name}`);
          });

          div.appendChild(textContainer);
          div.appendChild(delBtn);
          selectedListEl.appendChild(div);
        });
      }

      renderModels();

      function addModelToProv(modelId) {
        if (!prov.selectedModels) prov.selectedModels = [];
        if (!prov.selectedModels.includes(modelId)) {
          prov.selectedModels.push(modelId);
          saveAllCustomProviders();
          renderModels();
          showToast(`Added ${modelId} to ${prov.name || 'provider'}`);
        }
      }

      nameInput.addEventListener('input', () => {
        prov.name = nameInput.value.trim();
        titleText.textContent = prov.name || 'OpenAI-Compatible Provider';
        updateCardCompletion();
        saveAllCustomProviders();
      });

      urlInput.addEventListener('input', () => {
        prov.baseUrl = urlInput.value.trim();
        updateCardCompletion();
        saveAllCustomProviders();
      });

      keyInput.addEventListener('input', () => {
        prov.apiKey = keyInput.value.trim();
        updateCardCompletion();
        saveAllCustomProviders();
      });

      if (toggleKeyBtn) {
        toggleKeyBtn.addEventListener('click', () => {
          const isPass = keyInput.type === 'password';
          keyInput.type = isPass ? 'text' : 'password';
          toggleKeyBtn.innerHTML = isPass
            ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>'
            : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
        });
      }

      // Presets
      card.querySelectorAll('.preset-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          nameInput.value = chip.dataset.name || '';
          urlInput.value = chip.dataset.url || '';
          prov.name = nameInput.value;
          prov.baseUrl = urlInput.value;
          titleText.textContent = prov.name;
          updateCardCompletion();
          saveAllCustomProviders();
          const defaultModel = chip.dataset.model;
          if (defaultModel && !prov.selectedModels.includes(defaultModel)) {
            addModelToProv(defaultModel);
          }
          showToast(`⚡ Applied ${prov.name} preset`);
        });
      });

      // Recommended models
      card.querySelectorAll('.prov-rec-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          addModelToProv(chip.dataset.id);
        });
      });

      // Manual Add
      const handleManualAdd = () => {
        const val = manualInput.value.trim();
        if (!val) {
          showToast('⚠️ Please type a model ID');
          return;
        }
        addModelToProv(val);
        manualInput.value = '';
      };
      addManualBtn.addEventListener('click', handleManualAdd);
      manualInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleManualAdd();
        }
      });

      // Fetch Models
      fetchBtn.addEventListener('click', async () => {
        if (!updateCardCompletion()) {
          showToast('❌ Enter Provider Name, Base URL, and API Key first.');
          return;
        }
        let baseUrl = prov.baseUrl.replace(/\/+$/, '');
        const key = prov.apiKey;
        fetchBtn.textContent = '⏳ Fetching...';
        fetchBtn.disabled = true;

        try {
          const modelsUrl = baseUrl.endsWith('/models') ? baseUrl : `${baseUrl}/models`;
          const res = await fetch(modelsUrl, {
            headers: { 'Authorization': `Bearer ${key}` }
          });
          if (!res.ok) {
            const errJson = await res.json().catch(() => ({}));
            throw new Error(errJson.error?.message || `HTTP ${res.status}`);
          }
          const data = await res.json();
          const rawList = data.data || data.models || (Array.isArray(data) ? data : []);
          if (Array.isArray(rawList) && rawList.length > 0) {
            prov.allModels = rawList
              .map(m => {
                if (typeof m === 'string') return { id: m, name: m };
                const id = m.id || m.name || m.model;
                return id ? { id, name: m.name || id } : null;
              })
              .filter(Boolean)
              .sort((a, b) => a.name.localeCompare(b.name));

            saveAllCustomProviders();
            showToast(`✅ Loaded ${prov.allModels.length} models for ${prov.name}!`);
            searchInput.focus();
            renderSearchResults('');
          } else {
            showToast('⚠️ No models returned. You can add model IDs manually below.');
          }
        } catch(err) {
          showToast(`❌ Fetch failed: ${err.message}`);
        } finally {
          fetchBtn.textContent = 'Fetch Models';
          fetchBtn.disabled = false;
        }
      });

      // Test Provider Connection
      if (testBtn) {
        testBtn.addEventListener('click', async () => {
          if (!updateCardCompletion()) {
            if (testStatus) {
              testStatus.style.display = 'block';
              testStatus.style.color = '#ef4444';
              testStatus.textContent = '⚠️ Enter Base URL and API Key first.';
            }
            showToast('❌ Enter Base URL and API Key first.');
            return;
          }
          const url = (prov.baseUrl || '').trim().replace(/\/+$/, '');
          const key = (prov.apiKey || '').trim();
          testBtn.textContent = '⚡ Testing...';
          testBtn.disabled = true;
          if (testStatus) {
            testStatus.style.display = 'block';
            testStatus.style.color = 'var(--text-muted)';
            testStatus.textContent = `Testing connection to ${prov.name || 'provider'}...`;
          }
          const start = performance.now();
          try {
            const pingUrl = url.endsWith('/models') ? url : `${url}/models`;
            const headers = {};
            if (key) headers['Authorization'] = `Bearer ${key}`;
            const res = await fetch(pingUrl, { headers });
            const latency = Math.round(performance.now() - start);
            if (res.ok) {
              if (testStatus) {
                testStatus.style.color = '#22c55e';
                testStatus.textContent = `✅ Connected successfully (${latency}ms)`;
              }
              showToast(`✅ ${prov.name || 'Provider'} responded in ${latency}ms`);
            } else {
              if (testStatus) {
                testStatus.style.color = '#ef4444';
                testStatus.textContent = `❌ Server responded with HTTP ${res.status}`;
              }
              showToast(`❌ ${prov.name || 'Provider'} HTTP ${res.status}`);
            }
          } catch (err) {
            if (testStatus) {
              testStatus.style.color = '#ef4444';
              testStatus.textContent = `❌ Connection failed: ${err.message}`;
            }
            showToast(`❌ Connection failed: ${err.message}`);
          } finally {
            testBtn.textContent = '⚡ Test';
            testBtn.disabled = false;
          }
        });
      }

      function renderSearchResults(query) {
        const models = prov.allModels || [];
        const filtered = models.filter(m =>
          m.id.toLowerCase().includes(query.toLowerCase()) ||
          (m.name && m.name.toLowerCase().includes(query.toLowerCase()))
        ).slice(0, 50);

        if (filtered.length === 0) {
          searchResultsEl.innerHTML = '<div style="padding:10px;color:var(--text-muted);font-size:0.85rem;">No matching models found. Type model ID manually below.</div>';
          searchResultsEl.style.display = 'block';
          return;
        }

        searchResultsEl.innerHTML = '';
        filtered.forEach(m => {
          const item = document.createElement('div');
          item.style.cssText = 'padding:8px 12px;cursor:pointer;border-bottom:1px solid var(--border-color);';
          item.innerHTML = `<div style="font-size:0.85rem;font-weight:500;color:var(--text-color);">${m.name || m.id}</div><div style="font-size:0.75rem;color:var(--text-muted);">${m.id}</div>`;
          item.addEventListener('mouseenter', () => item.style.background = 'var(--hover-bg, rgba(255,255,255,0.06))');
          item.addEventListener('mouseleave', () => item.style.background = '');
          item.addEventListener('click', () => {
            addModelToProv(m.id);
            searchInput.value = '';
            searchResultsEl.style.display = 'none';
          });
          searchResultsEl.appendChild(item);
        });
        searchResultsEl.style.display = 'block';
      }

      searchInput.addEventListener('input', (e) => {
        if (!updateCardCompletion()) return;
        const q = e.target.value.trim();
        if (prov.allModels && prov.allModels.length > 0) {
          if (q) renderSearchResults(q);
          else searchResultsEl.style.display = 'none';
        } else {
          searchResultsEl.innerHTML = '<div style="padding:10px;color:var(--text-muted);font-size:0.85rem;">No cached models. Click "Fetch Models" to load, or add manually below.</div>';
          searchResultsEl.style.display = 'block';
        }
      });

      // Delete provider
      if (delProvBtn) {
        delProvBtn.addEventListener('click', () => {
          const confirmDel = confirm(`Are you sure you want to remove provider "${prov.name || 'this provider'}"?`);
          if (confirmDel) {
            customProviders = customProviders.filter(p => p.id !== prov.id);
            saveAllCustomProviders();
            renderCustomProviders();
            showToast('Provider removed');
          }
        });
      }

      customProvidersContainer.appendChild(card);
    });
  }

  // Initial render of custom providers
  renderCustomProviders();

  // Add Another Provider button
  if (addCustomProviderBtn) {
    addCustomProviderBtn.addEventListener('click', () => {
      const newProv = {
        id: 'prov_' + Date.now(),
        name: '',
        baseUrl: '',
        apiKey: '',
        selectedModels: [],
        allModels: []
      };
      customProviders.push(newProv);
      saveAllCustomProviders();
      renderCustomProviders();
      showToast('✨ Added new provider. Configure parameters above.');
      const lastCard = customProvidersContainer.lastElementChild;
      if (lastCard) {
        const input = lastCard.querySelector('.prov-name-input');
        if (input) input.focus();
      }
    });
  }

  // OpenRouter Recommended Model Chips
  document.querySelectorAll('.rec-model-chip[data-provider="openrouter"]').forEach(chip => {
    chip.addEventListener('click', () => {
      const modelId = chip.dataset.id;
      addModel(modelId);
    });
  });

  // ══════════════════════════════════════════════════
  // FEATURE CONTROLS
  // ══════════════════════════════════════════════════
  toolbarToggle.checked = storageData.toolbarEnabled !== false;
  autoShareToggle.checked = storageData.autoShareEnabled !== false;

  toolbarToggle.addEventListener('change', (e) => {
    chrome.storage.local.set({ toolbarEnabled: e.target.checked });
    showToast(e.target.checked ? 'Text selection toolbar enabled' : 'Text selection toolbar disabled');
  });

  autoShareToggle.addEventListener('change', (e) => {
    chrome.storage.local.set({ autoShareEnabled: e.target.checked });
    showToast(e.target.checked ? 'Auto tab-sharing enabled' : 'Auto tab-sharing disabled');
  });

  shortcutBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
  });

  // Cautious Mode
  const cautiousModeToggle = document.getElementById('cautiousModeToggle');
  cautiousModeToggle.checked = storageData.cautiousMode === true;
  cautiousModeToggle.addEventListener('change', (e) => {
    chrome.storage.local.set({ cautiousMode: e.target.checked });
    showToast(e.target.checked ? '🛡️ Cautious Mode enabled — all agent actions require approval' : 'Cautious Mode disabled — only sensitive actions require approval');
  });

  // ══════════════════════════════════════════════════
  // WEBSITE EXCLUSIONS
  // ══════════════════════════════════════════════════
  if (storageData.excludedSites && Array.isArray(storageData.excludedSites)) {
    excludedSitesArea.value = storageData.excludedSites.join('\n');
  }

  saveExclusionsBtn.addEventListener('click', () => {
    const list = excludedSitesArea.value
      .split('\n')
      .map(line => line.trim().toLowerCase())
      .filter(line => line.length > 0);
    
    chrome.storage.local.set({ excludedSites: list });
    showToast('Exclusion blacklist saved');
  });



  // ══════════════════════════════════════════════════
  // DATA MANAGEMENT & PRIVACY
  // ══════════════════════════════════════════════════

  const includeApiKeyToggle = document.getElementById('includeApiKeyToggle');

  // ── ALLOWED KEYS & TYPES for import validation ──
  const IMPORT_SCHEMA = {
    apiKey:               'string',
    apiUrl:               'string',
    provider:             'string',
    customProviders:      'object[]',
    customProviderName:   'string',
    customBaseUrl:        'string',
    customApiKey:         'string',
    selectedModels:       'string[]',
    allModels:            'object[]',
    customSelectedModels: 'string[]',
    customAllModels:      'object[]',
    uiTheme:              'string',
    defaultMode:          'string',
    toolbarEnabled:       'boolean',
    autoShareEnabled:     'boolean',
    excludedSites:        'string[]',
    savedChats:           'object',
    cautiousMode:         'boolean'
  };

  function validateImportValue(key, value) {
    const expected = IMPORT_SCHEMA[key];
    if (!expected) return false; // Key not in whitelist

    if (expected === 'string')    return typeof value === 'string';
    if (expected === 'boolean')   return typeof value === 'boolean';
    if (expected === 'string[]')  return Array.isArray(value) && value.every(v => typeof v === 'string');
    if (expected === 'object[]')  return Array.isArray(value) && value.every(v => typeof v === 'object' && v !== null);
    if (expected === 'object')    return typeof value === 'object' && value !== null && !Array.isArray(value);
    return false;
  }

  function sanitizeImportedChats(savedChats) {
    if (!savedChats || typeof savedChats !== 'object') return {};
    const clean = {};
    for (const [chatId, messages] of Object.entries(savedChats)) {
      if (!Array.isArray(messages)) continue;
      clean[chatId] = messages.map(msg => {
        if (typeof msg !== 'object' || msg === null) return null;
        const sanitized = {};
        if (typeof msg.role === 'string') sanitized.role = msg.role;
        else return null;
        if (typeof msg.content === 'string') {
          // Escape any HTML in imported chat content to prevent stored XSS
          sanitized.content = typeof escapeHtml === 'function' ? escapeHtml(msg.content) : msg.content;
        } else {
          sanitized.content = '';
        }
        if (msg.metadata && typeof msg.metadata === 'object') sanitized.metadata = msg.metadata;
        if (msg.tool_calls && Array.isArray(msg.tool_calls)) sanitized.tool_calls = msg.tool_calls;
        if (typeof msg.tool_call_id === 'string') sanitized.tool_call_id = msg.tool_call_id;
        if (typeof msg.name === 'string') sanitized.name = msg.name;
        return sanitized;
      }).filter(Boolean);
    }
    return clean;
  }

  // Export backup (with optional API key redaction)
  exportBtn.addEventListener('click', async () => {
    try {
      const allData = await chrome.storage.local.get(null);

      // Redact API keys by default
      if (!includeApiKeyToggle.checked) {
        if (allData.apiKey) allData.apiKey = '[REDACTED]';
        if (allData.customApiKey) allData.customApiKey = '[REDACTED]';
        if (Array.isArray(allData.customProviders)) {
          allData.customProviders = allData.customProviders.map(p => ({
            ...p,
            apiKey: p.apiKey ? '[REDACTED]' : ''
          }));
        }
      } else if (includeApiKeyToggle.checked && (allData.apiKey || allData.customApiKey)) {
        showToast('⚠️ Export includes your live API key(s)!');
      }

      const jsonStr = JSON.stringify(allData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `vrh_backup_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Backup JSON downloaded');
    } catch (err) {
      console.error(err);
      showToast('⚠️ Export failed');
    }
  });

  // Import backup (with schema validation & sanitization)
  importBtn.addEventListener('click', () => {
    importInput.click();
  });

  importInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Size guard: reject files larger than 10MB
    if (file.size > 10 * 1024 * 1024) {
      alert('Import rejected: file exceeds 10MB size limit.');
      importInput.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target.result);

        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
          alert('Invalid backup file. Expected a JSON object.');
          return;
        }

        // Schema validation: strip unknown keys, type-check known keys
        const validated = {};
        const skippedKeys = [];
        for (const [key, value] of Object.entries(parsed)) {
          if (validateImportValue(key, value)) {
            validated[key] = value;
          } else if (IMPORT_SCHEMA[key]) {
            skippedKeys.push(`${key} (wrong type)`);
          } else {
            skippedKeys.push(`${key} (unknown)`);
          }
        }

        if (Object.keys(validated).length === 0) {
          alert('Import rejected: no valid VRH.AI settings found in this file.');
          return;
        }

        // Sanitize chat content to prevent stored XSS
        if (validated.savedChats) {
          validated.savedChats = sanitizeImportedChats(validated.savedChats);
        }

        // Don't import redacted API keys
        if (validated.apiKey === '[REDACTED]') {
          delete validated.apiKey;
        }
        if (validated.customApiKey === '[REDACTED]') {
          delete validated.customApiKey;
        }

        // Confirmation dialog with summary
        let summary = '⚠️ IMPORT SUMMARY\n\nThe following settings will be overwritten:\n';
        summary += Object.keys(validated).map(k => `  • ${k}`).join('\n');
        if (skippedKeys.length > 0) {
          summary += `\n\nSkipped (invalid or unknown):\n`;
          summary += skippedKeys.map(k => `  ✗ ${k}`).join('\n');
        }
        summary += '\n\nThis will CLEAR your current storage first. Continue?';

        if (!confirm(summary)) return;

        await chrome.storage.local.clear();
        await chrome.storage.local.set(validated);
        alert('Import completed successfully! The page will now reload.');
        window.location.reload();
      } catch (err) {
        alert('Failed to parse backup JSON. Please confirm the file format.');
      }
    };
    reader.readAsText(file);
    importInput.value = ''; // Reset input
  });

  // Reset extension data
  clearHistoryBtn.addEventListener('click', async () => {
    const confirm1 = confirm('⚠️ WARNING: This will permanently delete all API keys, selected models, preferences, and saved conversation history. This action is irreversible.\n\nAre you sure you want to proceed?');
    if (confirm1) {
      const confirm2 = confirm('Please confirm one more time to perform a full factory reset of VRH.AI.');
      if (confirm2) {
        await chrome.storage.local.clear();
        alert('Extension data has been fully wiped. Reloading settings page...');
        window.location.reload();
      }
    }
  });

  // ── ONBOARDING WELCOME OVERLAY ──
  const onboardingModal = document.getElementById('onboardingModal');
  const closeOnboardingBtn = document.getElementById('closeOnboardingBtn');

  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('onboarding') === 'true') {
    onboardingModal.classList.remove('hidden');
  }

  closeOnboardingBtn.addEventListener('click', () => {
    onboardingModal.classList.add('hidden');
    // Clear onboarding query parameter from address bar
    const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
    window.history.replaceState({ path: cleanUrl }, '', cleanUrl);
  });
});
