/**
 * VRH.AI content.js — Perception Engine 2.0 (Deep DOM, Shadow Roots, Hit-Testing & Annoyance Sweeper)
 * Provides vision-grounded element coordinates, deep shadow root crawling, and occlusion detection.
 */

console.log("[VRH.AI] Perception Engine 2.0 loaded.");

// ══════════════════════════════════════════════════
// REGISTRY & STATE
// ══════════════════════════════════════════════════
const somRegistry = new Map();
let somOverlayContainer = null;

const SENSITIVE_KEYWORDS = [
  'checkout', 'buy now', 'place order', 'complete purchase', 'pay now', 'confirm order',
  'submit payment', 'order now', 'transfer money', 'wire transfer', 'delete account',
  'delete permanently', 'remove account', 'purge data', 'confirm purchase', 'pay with',
  'confirm payment', 'authorize payment', 'purchase now'
];

const SENSITIVE_KEYWORDS_INTL = [
  // Spanish
  'comprar ahora', 'pagar ahora', 'pagar', 'confirmar pedido', 'confirmar compra', 'eliminar cuenta', 'borrar cuenta',
  // Portuguese
  'comprar agora', 'pagar agora', 'confirmar pedido', 'confirmar compra', 'excluir conta', 'eliminar conta', 'apagar conta',
  // Hindi (transliterated)
  'kharidein', 'abhi kharidein', 'kharido', 'bhugtan karein', 'pay karein', 'order confirm karein', 'account delete karein', 'account hatayein'
];

const ALL_SENSITIVE_KEYWORDS = [...SENSITIVE_KEYWORDS, ...SENSITIVE_KEYWORDS_INTL];

const ANNOYANCE_SELECTORS = [
  '#onetrust-accept-btn-handler',
  '#accept-recommended-btn-handler',
  'button[id*="cookie-accept" i]',
  'button[id*="accept-cookie" i]',
  'button[class*="cookie-accept" i]',
  'button[class*="accept-cookie" i]',
  'button[aria-label*="accept all" i]',
  'button[aria-label*="accept cookies" i]',
  'button[aria-label*="agree" i]',
  '#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll',
  '.cc-btn.cc-allow',
  '.cc-allow',
  '#cookie-notice-accept',
  'button[data-testid*="cookie-policy-manage-dialog-accept-button" i]',
  'button[id*="didomi-notice-agree-button" i]'
];

// ══════════════════════════════════════════════════
// AUTOMATED ANNOYANCE & COOKIE SWEEPER
// ══════════════════════════════════════════════════
function sweepAnnoyances() {
  let dismissedCount = 0;
  for (const selector of ANNOYANCE_SELECTORS) {
    try {
      const btn = document.querySelector(selector);
      if (btn && btn.offsetParent !== null && typeof btn.click === 'function') {
        btn.click();
        dismissedCount++;
        console.log(`[VRH.AI] Swept annoyance banner via selector: ${selector}`);
      }
    } catch (e) {
      // Non-fatal if selector fails
    }
  }
  return dismissedCount;
}

// ══════════════════════════════════════════════════
// SENSITIVITY & CAPTCHA DETECTION
// ══════════════════════════════════════════════════
function isElementSensitive(el, text) {
  if (!el) return false;

  const rawText = (text || el.textContent || el.innerText || '').trim();
  const ariaLabel = el.getAttribute ? (el.getAttribute('aria-label') || '') : '';
  const title = el.getAttribute ? (el.getAttribute('title') || '') : '';
  const name = el.name || (el.getAttribute ? el.getAttribute('name') : '') || '';
  const id = el.id || '';
  const className = (typeof el.className === 'string' ? el.className : '') || '';
  const value = el.value || '';

  const combined = `${rawText} ${ariaLabel} ${title} ${name} ${id} ${className} ${value}`.toLowerCase();

  // 1. Keyword check (English + International)
  if (ALL_SENSITIVE_KEYWORDS.some(kw => combined.includes(kw))) {
    return true;
  }

  // 2. Currency symbol immediately adjacent to a number ($ € £ ₹)
  const CURRENCY_REGEX = /(?:[\$€£₹]\s*\d|\d\s*[\$€£₹])/;
  if (CURRENCY_REGEX.test(combined) || CURRENCY_REGEX.test(rawText) || CURRENCY_REGEX.test(value)) {
    return true;
  }

  // 3. Structural signals: enclosing form inspection
  const form = el.closest ? el.closest('form') : null;
  const tagName = (el.tagName || '').toUpperCase();
  const type = (el.type || (el.getAttribute && el.getAttribute('type')) || '').toLowerCase();
  const isSubmit = (tagName === 'BUTTON' && (!type || type === 'submit')) ||
                   (tagName === 'INPUT' && (type === 'submit' || type === 'image'));

  if (form) {
    // Flag submit buttons or clickables in forms containing credit card autocomplete fields
    const ccField = form.querySelector ? form.querySelector('[autocomplete^="cc-"], [autocomplete^="CC-"]') : null;
    if (ccField && (isSubmit || tagName === 'BUTTON' || tagName === 'INPUT')) {
      return true;
    }

    // Flag buttons/elements if enclosing form explicitly displays currency amounts
    const formText = form.textContent || '';
    if (CURRENCY_REGEX.test(formText)) {
      return true;
    }
  }

  // 4. Nearby text in immediate parent container with currency amounts
  if (el.parentElement) {
    const parentText = el.parentElement.textContent || '';
    if (CURRENCY_REGEX.test(parentText)) {
      return true;
    }
  }

  return false;
}

if (typeof window !== 'undefined') {
  window.isElementSensitive = isElementSensitive;
  window.SENSITIVE_KEYWORDS = SENSITIVE_KEYWORDS;
  window.SENSITIVE_KEYWORDS_INTL = SENSITIVE_KEYWORDS_INTL;
  window.ALL_SENSITIVE_KEYWORDS = ALL_SENSITIVE_KEYWORDS;
}
if (typeof globalThis !== 'undefined') {
  globalThis.isElementSensitive = isElementSensitive;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    isElementSensitive,
    SENSITIVE_KEYWORDS,
    SENSITIVE_KEYWORDS_INTL,
    ALL_SENSITIVE_KEYWORDS
  };
}

function detectCaptchaOr2FA() {
  const captchaSelectors = [
    'iframe[src*="recaptcha"]',
    'iframe[src*="turnstile"]',
    'iframe[src*="hcaptcha"]',
    'iframe[src*="arkoselabs"]',
    'iframe[src*="funcaptcha"]',
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
      if (found) {
        const rect = found.getBoundingClientRect();
        if (rect.width > 10 && rect.height > 10) return true;
      }
    } catch (e) { /* ignore selector syntax edge cases */ }
  }
  return false;
}

// ══════════════════════════════════════════════════
// DEEP DOM & OPEN SHADOW ROOT CRAWLER
// ══════════════════════════════════════════════════
function isElementActionable(el) {
  if (!el || el.nodeType !== Node.ELEMENT_NODE) return false;

  const tag = el.tagName.toLowerCase();
  if (['a', 'button', 'select', 'textarea'].includes(tag)) return true;
  if (tag === 'input' && el.type !== 'hidden') return true;
  if (tag === 'summary' || tag === 'details') return true;
  if (el.isContentEditable) return true;

  const role = el.getAttribute('role');
  if (role && [
    'button', 'link', 'checkbox', 'tab', 'menuitem', 'switch',
    'combobox', 'searchbox', 'radio', 'option', 'treeitem', 'slider'
  ].includes(role.toLowerCase())) {
    return true;
  }

  if (el.hasAttribute('onclick') || (el.hasAttribute('tabindex') && el.getAttribute('tabindex') >= 0)) {
    return true;
  }

  // Cursor pointer heuristics
  try {
    const style = window.getComputedStyle(el);
    if (style.cursor === 'pointer') return true;
  } catch (e) {}

  return false;
}

/**
 * Recursively traverses light DOM and all open Shadow Roots.
 * Also discovers accessible iframe windows where possible.
 */
function crawlInteractiveNodes(root = document.body, nodes = []) {
  if (!root) return nodes;

  const children = root.children || root.childNodes;
  for (let i = 0; i < children.length; i++) {
    const node = children[i];
    if (node.nodeType !== Node.ELEMENT_NODE) continue;

    const tag = node.tagName.toLowerCase();
    if (['script', 'style', 'noscript', 'svg', 'path'].includes(tag)) continue;

    // Check if current node is actionable
    if (isElementActionable(node)) {
      nodes.push(node);
    }

    // Traverse open shadow root if present (e.g. Web Components)
    if (node.shadowRoot) {
      crawlInteractiveNodes(node.shadowRoot, nodes);
    }

    // Traverse child nodes
    crawlInteractiveNodes(node, nodes);
  }

  return nodes;
}

// ══════════════════════════════════════════════════
// VIEWPORT HIT-TESTING & OCCLUSION DETECTION
// ══════════════════════════════════════════════════
function isElementVisibleInViewport(el) {
  const rect = el.getBoundingClientRect();
  if (rect.width < 4 || rect.height < 4) return false;
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

/**
 * Test if the element is occluded by sticky headers, modal backdrops, or floating popups.
 */
function isElementOccluded(el, rect) {
  const points = [
    { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
    { x: rect.left + Math.min(6, rect.width / 4), y: rect.top + Math.min(6, rect.height / 4) },
    { x: rect.right - Math.min(6, rect.width / 4), y: rect.bottom - Math.min(6, rect.height / 4) }
  ];

  for (const pt of points) {
    if (pt.x <= 0 || pt.x >= window.innerWidth || pt.y <= 0 || pt.y >= window.innerHeight) continue;

    let hit = document.elementFromPoint(pt.x, pt.y);

    // If point lands inside a shadow host, pierce it
    while (hit && hit.shadowRoot && typeof hit.shadowRoot.elementFromPoint === 'function') {
      const shadowHit = hit.shadowRoot.elementFromPoint(pt.x, pt.y);
      if (!shadowHit || shadowHit === hit) break;
      hit = shadowHit;
    }

    if (!hit) continue;

    // Direct match or parent-child hierarchy match
    if (hit === el || el.contains(hit) || hit.contains(el)) {
      return false; // Not occluded
    }
  }

  // If none of the sample points reached the element, it is occluded
  return true;
}

// ══════════════════════════════════════════════════
// TOKEN-EFFICIENT ELEMENT SERIALIZATION
// ══════════════════════════════════════════════════
function getCleanElementText(el) {
  let text = el.getAttribute('aria-label') ||
             el.getAttribute('placeholder') ||
             el.getAttribute('title') ||
             el.innerText ||
             el.value ||
             el.getAttribute('alt') || '';
  text = text.replace(/\s+/g, ' ').trim();
  return text.substring(0, 70);
}

function getElementState(el) {
  const state = {};
  if (el.disabled) state.disabled = true;
  if (el.checked !== undefined && (el.type === 'checkbox' || el.type === 'radio')) {
    state.checked = el.checked;
  }
  if (el.getAttribute('aria-expanded')) {
    state.expanded = el.getAttribute('aria-expanded') === 'true';
  }
  if (el.getAttribute('aria-selected')) {
    state.selected = el.getAttribute('aria-selected') === 'true';
  }
  return Object.keys(state).length > 0 ? state : undefined;
}

// ══════════════════════════════════════════════════
// PERCEPTION ENGINE 2.0 CRAWLER & REGISTRATION
// ══════════════════════════════════════════════════
function clearSetOfMarks() {
  const existing = document.getElementById('vrh-som-overlay');
  if (existing) existing.remove();
  somOverlayContainer = null;
}

function injectSetOfMarks() {
  clearSetOfMarks();
  somRegistry.clear();

  // 1. Auto-sweep nuisance banners first
  sweepAnnoyances();

  // 2. Recursive DOM & Open Shadow Root crawl
  const rawCandidates = crawlInteractiveNodes(document.body, []);

  // 3. Deduplicate
  const uniqueCandidates = Array.from(new Set(rawCandidates));

  // 4. Filter by viewport visibility & occlusion hit-testing
  const visibleCandidates = [];
  for (const el of uniqueCandidates) {
    if (isElementVisibleInViewport(el)) {
      const rect = el.getBoundingClientRect();
      if (!isElementOccluded(el, rect)) {
        visibleCandidates.push({ el, rect });
      }
    }
  }

  // 5. Filter out redundant nested actionable elements (e.g. <a> containing a <button>)
  const filtered = visibleCandidates.filter(({ el }) => {
    return !visibleCandidates.some(({ el: other }) => {
      if (other === el) return false;
      const otherTag = other.tagName.toLowerCase();
      return (otherTag === 'a' || otherTag === 'button') && other.contains(el);
    });
  }).slice(0, 85); // Cap at 85 for token efficiency & fast multimodal comprehension

  const manifest = [];
  let markId = 1;

  for (const { el, rect } of filtered) {
    const centerX = Math.round(rect.left + rect.width / 2);
    const centerY = Math.round(rect.top + rect.height / 2);
    const text = getCleanElementText(el);
    const sensitive = isElementSensitive(el, text);
    const state = getElementState(el);

    const markData = {
      mark_id: markId,
      element: el,
      tag: el.tagName.toLowerCase(),
      type: el.type || undefined,
      role: el.getAttribute('role') || el.tagName.toLowerCase(),
      name: text || undefined,
      placeholder: el.getAttribute('placeholder') || undefined,
      state: state,
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

    // Compact representation for LLM prompt
    manifest.push({
      mark_id: markId,
      role: markData.role,
      name: markData.name,
      tag: markData.tag,
      type: markData.type,
      placeholder: markData.placeholder,
      state: markData.state,
      center: markData.center,
      rect: markData.rect
    });

    markId++;
  }

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

  // Re-verify coordinates against current DOM position
  if (data.element && (document.body.contains(data.element) || (data.element.getRootNode() && data.element.getRootNode() !== document))) {
    const rect = data.element.getBoundingClientRect();
    return {
      mark_id: idNum,
      x: Math.round(rect.left + rect.width / 2),
      y: Math.round(rect.top + rect.height / 2),
      text: getCleanElementText(data.element),
      tag: data.tag,
      isSensitive: isElementSensitive(data.element, data.name)
    };
  }

  // Fallback to cached coordinates
  return {
    mark_id: idNum,
    x: data.center[0],
    y: data.center[1],
    text: data.name || '',
    tag: data.tag,
    isSensitive: data.isSensitive
  };
}

// ══════════════════════════════════════════════════
// BACKWARD-COMPATIBLE TEXT & DOM EXTRACTION
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
// EMERGENCY ESCAPE HOTKEY LISTENER
// ══════════════════════════════════════════════════
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    // Notify extension background to stop running agent immediately
    chrome.runtime.sendMessage({ action: "AGENT_EMERGENCY_STOP" }).catch(() => {});
  }
}, true);

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
  else if (message.action === "SWEEP_ANNOYANCES") {
    try {
      const count = sweepAnnoyances();
      sendResponse({ result: { swept: count } });
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
  else if (message.action === "EXTRACT_STRUCTURED_DATA") {
    try {
      const schema = message.schema || {};
      const rows = [];
      const tables = document.querySelectorAll('table');
      if (tables.length > 0) {
        tables.forEach(tbl => {
          const headers = Array.from(tbl.querySelectorAll('th')).map(th => th.innerText.trim());
          const trs = tbl.querySelectorAll('tbody tr, tr');
          trs.forEach(tr => {
            const cells = Array.from(tr.querySelectorAll('td')).map(td => td.innerText.trim());
            if (cells.length > 0) {
              const rowObj = {};
              cells.forEach((cell, idx) => {
                const key = headers[idx] || `col_${idx + 1}`;
                rowObj[key] = cell;
              });
              rows.push(rowObj);
            }
          });
        });
      }
      sendResponse({ result: { data: rows, count: rows.length } });
    } catch (err) {
      sendResponse({ error: err.toString() });
    }
  }
  else if (message.action === "GET_INTERACTABLE_DOM") {
    try {
      const som = injectSetOfMarks();
      const domMap = som.manifest.map(m => ({
        id: m.mark_id.toString(),
        tag: m.tag,
        text: m.name || m.placeholder || '',
        type: m.type
      }));
      sendResponse({ result: domMap });
    } catch (e) {
      sendResponse({ error: e.toString() });
    }
  }
  else if (message.action === "CLICK_ELEMENT") {
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
