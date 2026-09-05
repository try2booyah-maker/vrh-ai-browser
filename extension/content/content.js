// VRH.AI content.js — Set-of-Marks (SoM) Visual Perception & Interactive DOM Engine
console.log("VRH.AI Set-of-Marks visual perception engine loaded.");

// ══════════════════════════════════════════════════
// SET-OF-MARKS (SoM) REGISTRY & STATE
// ══════════════════════════════════════════════════
const somRegistry = new Map();
let somOverlayContainer = null;

const SENSITIVE_KEYWORDS = [
  'checkout', 'buy now', 'place order', 'complete purchase', 'pay now', 'confirm order',
  'submit payment', 'order now', 'transfer money', 'wire transfer', 'delete account',
  'delete permanently', 'remove account', 'purge data', 'confirm purchase', 'pay with'
];

function isElementSensitive(el, text) {
  const combined = (
    (text || '') + ' ' +
    (el.getAttribute('aria-label') || '') + ' ' +
    (el.getAttribute('title') || '') + ' ' +
    (el.name || '') + ' ' +
    (el.id || '')
  ).toLowerCase();
  return SENSITIVE_KEYWORDS.some(kw => combined.includes(kw));
}

function detectCaptchaOr2FA() {
  const captchaSelectors = [
    'iframe[src*="recaptcha"]',
    'iframe[src*="turnstile"]',
    'iframe[src*="hcaptcha"]',
    '.g-recaptcha',
    '.cf-turnstile',
    '#cf-turnstile',
    'div[class*="captcha" i]',
    'div[id*="captcha" i]',
    'input[name*="2fa" i]',
    'input[id*="2fa" i]',
    'input[autocomplete="one-time-code"]'
  ];
  for (const sel of captchaSelectors) {
    try {
      const found = document.querySelector(sel);
      if (found && found.getBoundingClientRect().width > 0) return true;
    } catch (e) { /* ignore selector syntax edge cases */ }
  }
  return false;
}

function isElementActionable(el) {
  const tag = el.tagName.toLowerCase();
  if (['a', 'button', 'select', 'textarea'].includes(tag)) return true;
  if (tag === 'input' && el.type !== 'hidden') return true;
  if (tag === 'summary') return true;
  if (el.isContentEditable) return true;

  const role = el.getAttribute('role');
  if (role && ['button', 'link', 'checkbox', 'tab', 'menuitem', 'switch', 'combobox', 'searchbox', 'radio', 'option'].includes(role.toLowerCase())) {
    return true;
  }

  if (el.hasAttribute('onclick') || el.getAttribute('tabindex') >= 0) return true;
  return false;
}

function isElementVisibleInViewport(el) {
  const rect = el.getBoundingClientRect();
  if (rect.width < 6 || rect.height < 6) return false;
  if (rect.bottom <= 0 || rect.top >= window.innerHeight || rect.right <= 0 || rect.left >= window.innerWidth) {
    return false;
  }

  const style = window.getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse') {
    return false;
  }
  if (parseFloat(style.opacity || '1') < 0.05) return false;
  if (style.pointerEvents === 'none') return false;

  return true;
}

function getCleanElementText(el) {
  let text = el.getAttribute('aria-label') || el.getAttribute('placeholder') || el.getAttribute('title') || el.innerText || el.value || el.getAttribute('alt') || '';
  text = text.replace(/\s+/g, ' ').trim();
  return text.substring(0, 80);
}

// ══════════════════════════════════════════════════
// SET-OF-MARKS (SoM) INJECTION & CLEANUP
// ══════════════════════════════════════════════════

function clearSetOfMarks() {
  const existing = document.getElementById('vrh-som-overlay');
  if (existing) existing.remove();
  somOverlayContainer = null;
}

function injectSetOfMarks() {
  clearSetOfMarks();
  somRegistry.clear();

  // Find candidates
  const allElements = document.querySelectorAll('a, button, input, select, textarea, summary, [role], [onclick], [tabindex], [contenteditable]');
  const candidates = [];

  allElements.forEach(el => {
    if (isElementActionable(el) && isElementVisibleInViewport(el)) {
      candidates.push(el);
    }
  });

  // Filter out redundant nested actionable elements (e.g. <a> containing <button>)
  const filtered = candidates.filter(el => {
    const parent = el.parentElement;
    if (!parent) return true;
    return !candidates.some(c => c !== el && c.contains(el) && (c.tagName === 'A' || c.tagName === 'BUTTON'));
  }).slice(0, 80); // Cap at 80 for token efficiency & visual clarity

  const manifest = [];
  let markId = 1;

  filtered.forEach(el => {
    const rect = el.getBoundingClientRect();
    const centerX = Math.round(rect.left + rect.width / 2);
    const centerY = Math.round(rect.top + rect.height / 2);
    const text = getCleanElementText(el);
    const sensitive = isElementSensitive(el, text);

    const markData = {
      mark_id: markId,
      element: el,
      tag: el.tagName.toLowerCase(),
      type: el.type || null,
      role: el.getAttribute('role') || el.tagName.toLowerCase(),
      text: text,
      center: [centerX, centerY],
      rect: {
        left: Math.round(rect.left),
        top: Math.round(rect.top),
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      },
      isSensitive: sensitive
    };

    somRegistry.set(markId, markData);

    manifest.push({
      mark_id: markId,
      tag: markData.tag,
      type: markData.type,
      role: markData.role,
      text: markData.text,
      center: markData.center,
      rect: markData.rect
    });

    markId++;
  });

  const hasCaptcha = detectCaptchaOr2FA();

  return {
    manifest,
    count: manifest.length,
    hasCaptcha,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
      dpr: window.devicePixelRatio || 1
    }
  };
}

function getMarkCoordinates(markId) {
  const idNum = parseInt(markId, 10);
  const data = somRegistry.get(idNum);
  if (!data) return null;

  // Re-verify coordinates against current DOM state
  if (document.body.contains(data.element)) {
    const rect = data.element.getBoundingClientRect();
    return {
      mark_id: idNum,
      x: Math.round(rect.left + rect.width / 2),
      y: Math.round(rect.top + rect.height / 2),
      text: getCleanElementText(data.element),
      tag: data.tag,
      isSensitive: isElementSensitive(data.element, data.text)
    };
  }

  // Fallback to cached center
  return {
    mark_id: idNum,
    x: data.center[0],
    y: data.center[1],
    text: data.text,
    tag: data.tag,
    isSensitive: data.isSensitive
  };
}

// ══════════════════════════════════════════════════
// BACKWARD-COMPATIBLE TEXT EXTRACTION
// ══════════════════════════════════════════════════
function getDeepText(node, maxLen = 30000) {
  let text = "";
  function traverse(n) {
    if (text.length >= maxLen) return;
    if (n.nodeType === Node.TEXT_NODE) {
      const val = n.nodeValue.trim();
      if (val) text += val + " ";
      return;
    }
    if (n.nodeType === Node.ELEMENT_NODE) {
      const tag = n.tagName.toLowerCase();
      if (tag === 'script' || tag === 'style' || tag === 'noscript' || tag === 'iframe') return;
    }
    if (n.shadowRoot) traverse(n.shadowRoot);
    const children = n.childNodes;
    if (children) {
      for (let i = 0; i < children.length; i++) traverse(children[i]);
    }
  }
  traverse(node);
  return text.trim();
}

// ══════════════════════════════════════════════════
// RUNTIME MESSAGE DISPATCHER
// ══════════════════════════════════════════════════
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "INJECT_SET_OF_MARKS") {
    try {
      const result = injectSetOfMarks();
      sendResponse({ result });
    } catch (err) {
      sendResponse({ error: err.toString() });
    }
  }
  else if (message.action === "CLEAR_SET_OF_MARKS") {
    try {
      clearSetOfMarks();
      sendResponse({ result: "Cleared Set of Marks" });
    } catch (err) {
      sendResponse({ error: err.toString() });
    }
  }
  else if (message.action === "GET_MARK_INFO") {
    try {
      const markInfo = getMarkCoordinates(message.markId);
      sendResponse({ result: markInfo });
    } catch (err) {
      sendResponse({ error: err.toString() });
    }
  }
  else if (message.action === "GET_PAGE_TEXT") {
    const text = getDeepText(document.body, 30000);
    sendResponse({ result: text || "No readable text found on page." });
  }
  else if (message.action === "GET_INTERACTABLE_DOM") {
    // Backward compatibility for existing agent mode
    try {
      const som = injectSetOfMarks();
      const domMap = som.manifest.map(m => ({
        id: m.mark_id.toString(),
        tag: m.tag,
        text: m.text,
        type: m.type
      }));
      sendResponse({ result: domMap });
    } catch (e) {
      sendResponse({ error: e.toString() });
    }
  }
  else if (message.action === "CLICK_ELEMENT") {
    // DOM-level click fallback
    try {
      const mark = somRegistry.get(parseInt(message.targetId, 10));
      const el = mark ? mark.element : document.querySelector(`[data-vrh-id="${message.targetId}"]`);
      if (el) {
        el.click();
        sendResponse({ result: "Clicked element." });
      } else {
        sendResponse({ error: "Element not found" });
      }
    } catch (e) {
      sendResponse({ error: e.toString() });
    }
  }
  else if (message.action === "TYPE_TEXT") {
    try {
      const mark = somRegistry.get(parseInt(message.targetId, 10));
      const el = mark ? mark.element : document.querySelector(`[data-vrh-id="${message.targetId}"]`);
      if (!el) {
        sendResponse({ error: "Element not found" });
        return;
      }
      el.focus();
      const tagName = el.tagName.toLowerCase();
      let setter = null;
      if (tagName === 'input') {
        setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
      } else if (tagName === 'textarea') {
        setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
      }
      if (setter) setter.call(el, message.text);
      else el.value = message.text;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      sendResponse({ result: "Typed text into element." });
    } catch (e) {
      sendResponse({ error: e.toString() });
    }
  }
  else if (message.action === "SCROLL") {
    try {
      const scrollAmount = window.innerHeight * 0.75;
      if (message.direction === 'down') {
        window.scrollBy({ top: scrollAmount, behavior: 'smooth' });
        sendResponse({ result: "Scrolled down." });
      } else if (message.direction === 'up') {
        window.scrollBy({ top: -scrollAmount, behavior: 'smooth' });
        sendResponse({ result: "Scrolled up." });
      } else {
        sendResponse({ error: "Invalid direction" });
      }
    } catch (e) {
      sendResponse({ error: e.toString() });
    }
  }
  else if (message.action === "NAVIGATE") {
    try {
      window.location.href = message.url;
      sendResponse({ result: `Navigating to ${message.url}` });
    } catch (e) {
      sendResponse({ error: e.toString() });
    }
  }

  return true;
});

// ══════════════════════════════════════════════════
// TEXT SELECTION TOOLBAR
// ══════════════════════════════════════════════════
let selectionToolbar = null;

document.addEventListener('mouseup', () => {
  chrome.storage.local.get(['toolbarEnabled', 'excludedSites'], (res) => {
    const isEnabled = res.toolbarEnabled !== false;
    const excludedList = res.excludedSites || [];
    const currentHost = window.location.hostname.toLowerCase();
    
    const isExcluded = excludedList.some(site => {
      const cleanSite = site.trim().toLowerCase();
      return cleanSite && (currentHost === cleanSite || currentHost.endsWith('.' + cleanSite));
    });

    if (!isEnabled || isExcluded) {
      if (selectionToolbar) selectionToolbar.style.display = 'none';
      return;
    }

    setTimeout(() => {
      const selection = window.getSelection();
      const text = selection ? selection.toString().trim() : '';

      if (text && text.length > 5) {
        if (!selectionToolbar) {
          selectionToolbar = document.createElement('div');
          selectionToolbar.className = 'vrh-selection-toolbar';

          if (!document.getElementById('vrh-sel-styles')) {
            const style = document.createElement('style');
            style.id = 'vrh-sel-styles';
            style.textContent = `
              .vrh-selection-toolbar {
                position: absolute; display: flex; gap: 2px; padding: 4px;
                background: #1e1e2e; border: 1px solid rgba(255,255,255,0.15);
                border-radius: 10px; box-shadow: 0 8px 24px rgba(0,0,0,0.4);
                z-index: 999999; animation: vrhFadeSlideUp 0.2s ease;
                font-family: 'Inter', sans-serif;
              }
              .vrh-sel-btn {
                padding: 5px 10px; background: transparent; border: none;
                color: #e2e8f0; font-size: 12px; font-weight: 500;
                border-radius: 6px; cursor: pointer; white-space: nowrap; font-family: inherit;
              }
              .vrh-sel-btn:hover { background: rgba(132, 204, 22, 0.2); color: #d9f99d; }
              @keyframes vrhFadeSlideUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
            `;
            document.head.appendChild(style);
          }

          function sendSelectionAction(action) {
            const currentText = (window.getSelection().toString() || '').trim();
            if (!currentText) return;
            chrome.runtime.sendMessage({ type: 'VRH_SELECTION_ACTION', action, text: currentText });
            window.getSelection().removeAllRanges();
            selectionToolbar.style.display = 'none';
          }

          const explainBtn = document.createElement('button');
          explainBtn.className = 'vrh-sel-btn';
          explainBtn.textContent = '✨ Explain';
          explainBtn.onclick = () => sendSelectionAction('explain');

          const summarizeBtn = document.createElement('button');
          summarizeBtn.className = 'vrh-sel-btn';
          summarizeBtn.textContent = '📄 Summarize';
          summarizeBtn.onclick = () => sendSelectionAction('summarize');

          const translateBtn = document.createElement('button');
          translateBtn.className = 'vrh-sel-btn';
          translateBtn.textContent = '🌐 Translate';
          translateBtn.onclick = () => sendSelectionAction('translate');

          const rewriteBtn = document.createElement('button');
          rewriteBtn.className = 'vrh-sel-btn';
          rewriteBtn.textContent = '✍️ Rewrite';
          rewriteBtn.onclick = () => sendSelectionAction('rewrite');

          selectionToolbar.appendChild(explainBtn);
          selectionToolbar.appendChild(summarizeBtn);
          selectionToolbar.appendChild(translateBtn);
          selectionToolbar.appendChild(rewriteBtn);
          document.body.appendChild(selectionToolbar);
        }

        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        selectionToolbar.style.display = 'flex';
        selectionToolbar.style.top = `${window.scrollY + rect.bottom + 8}px`;

        let left = window.scrollX + rect.left + (rect.width / 2) - (selectionToolbar.offsetWidth / 2);
        if (left < 10) left = 10;
        if (left + selectionToolbar.offsetWidth > window.innerWidth - 10) {
          left = window.innerWidth - selectionToolbar.offsetWidth - 10;
        }
        selectionToolbar.style.left = `${left}px`;
      } else if (selectionToolbar) {
        selectionToolbar.style.display = 'none';
      }
    }, 10);
  });
});

document.addEventListener('mousedown', (e) => {
  if (selectionToolbar && !selectionToolbar.contains(e.target)) {
    selectionToolbar.style.display = 'none';
  }
});
