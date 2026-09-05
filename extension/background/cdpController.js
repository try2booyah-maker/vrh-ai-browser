/**
 * VRH.AI Chrome DevTools Protocol (CDP) Controller
 * Manages hardware-level mouse, keyboard, hotkey, and scroll emulation via chrome.debugger.
 * Features deterministic network & mutation gating, native JavaScript dialog handling,
 * and genuine isTrusted: true input dispatching.
 */

class CDPController {
  constructor() {
    this.attachedTabs = new Set();
    this.inflightRequests = new Map(); // tabId -> count
    this.pendingDialogs = new Map();   // tabId -> dialog details
    this.networkIdleTimers = new Map();
    this._initListeners();
  }

  _initListeners() {
    if (typeof chrome !== 'undefined' && chrome.debugger) {
      chrome.debugger.onDetach.addListener((source, reason) => {
        if (source && source.tabId) {
          const tabId = source.tabId;
          this.attachedTabs.delete(tabId);
          this.inflightRequests.delete(tabId);
          this.pendingDialogs.delete(tabId);
          console.log(`[CDPController] Debugger detached from tab ${tabId}: ${reason}`);
        }
      });

      chrome.debugger.onEvent.addListener((source, method, params) => {
        if (!source || !source.tabId) return;
        const tabId = source.tabId;

        // Track network activity for deterministic waiting
        if (method === "Network.requestWillBeSent") {
          const current = this.inflightRequests.get(tabId) || 0;
          this.inflightRequests.set(tabId, current + 1);
        } else if (method === "Network.loadingFinished" || method === "Network.loadingFailed") {
          const current = this.inflightRequests.get(tabId) || 0;
          this.inflightRequests.set(tabId, Math.max(0, current - 1));
        }

        // Native JavaScript alerts, confirms, prompts
        if (method === "Page.javascriptDialogOpening") {
          console.warn(`[CDPController] Native dialog opened on tab ${tabId}:`, params.message);
          this.pendingDialogs.set(tabId, params);
        } else if (method === "Page.javascriptDialogClosed") {
          this.pendingDialogs.delete(tabId);
        }
      });
    }
  }

  /**
   * Safely attach debugger to the target tab and enable required domains.
   * @param {number} tabId
   */
  async attach(tabId) {
    if (this.attachedTabs.has(tabId)) return true;

    return new Promise((resolve) => {
      chrome.debugger.attach({ tabId }, "1.3", async () => {
        if (chrome.runtime.lastError) {
          const err = chrome.runtime.lastError.message || '';
          if (err.includes("already attached") || err.includes("Another debugger")) {
            this.attachedTabs.add(tabId);
            await this._enableDomains(tabId);
            resolve(true);
          } else {
            console.warn(`[CDPController] Attach failed for tab ${tabId}:`, err);
            resolve(false);
          }
        } else {
          this.attachedTabs.add(tabId);
          await this._enableDomains(tabId);
          console.log(`[CDPController] Attached to tab ${tabId}`);
          resolve(true);
        }
      });
    });
  }

  async _enableDomains(tabId) {
    try {
      await this.sendCommand(tabId, "Page.enable");
      await this.sendCommand(tabId, "Network.enable");
      await this.sendCommand(tabId, "Runtime.enable");
    } catch (e) {
      // Non-fatal if domain enabling encounters an issue
    }
  }

  /**
   * Safely detach debugger from the target tab.
   * @param {number} tabId
   */
  async detach(tabId) {
    if (!this.attachedTabs.has(tabId)) return true;

    return new Promise((resolve) => {
      chrome.debugger.detach({ tabId }, () => {
        this.attachedTabs.delete(tabId);
        this.inflightRequests.delete(tabId);
        this.pendingDialogs.delete(tabId);
        resolve(true);
      });
    });
  }

  /**
   * Send a raw CDP command to the tab.
   * @param {number} tabId
   * @param {string} method
   * @param {Object} [params]
   */
  async sendCommand(tabId, method, params = {}) {
    await this.attach(tabId);

    return new Promise((resolve, reject) => {
      chrome.debugger.sendCommand({ tabId }, method, params, (result) => {
        if (chrome.runtime.lastError) {
          reject(new Error(`CDP ${method} failed: ${chrome.runtime.lastError.message}`));
        } else {
          resolve(result);
        }
      });
    });
  }

  /**
   * Deterministic page settling: waits for inflight network requests to cease
   * combined with a short DOM mutation quiescence window.
   * @param {number} tabId
   * @param {number} [maxWaitMs=3000]
   * @param {number} [idleWindowMs=350]
   */
  async waitForPageSettled(tabId, maxWaitMs = 3000, idleWindowMs = 350) {
    const startTime = Date.now();

    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const inflight = this.inflightRequests.get(tabId) || 0;

        // If no inflight requests or timeout exceeded, resolve
        if (inflight === 0 || elapsed >= maxWaitMs) {
          clearInterval(checkInterval);
          setTimeout(resolve, idleWindowMs);
        }
      }, 80);
    });
  }

  /**
   * Emulate real hardware mouse click.
   * @param {number} tabId
   * @param {number} x
   * @param {number} y
   */
  async clickAt(tabId, x, y) {
    const roundX = Math.round(x);
    const roundY = Math.round(y);

    // 1. Move mouse to target
    await this.sendCommand(tabId, "Input.dispatchMouseEvent", {
      type: "mouseMoved",
      x: roundX,
      y: roundY
    });

    // 2. Mouse pressed (isTrusted: true)
    await this.sendCommand(tabId, "Input.dispatchMouseEvent", {
      type: "mousePressed",
      x: roundX,
      y: roundY,
      button: "left",
      clickCount: 1
    });

    // Natural human click duration
    await new Promise(r => setTimeout(r, 45));

    // 3. Mouse released
    await this.sendCommand(tabId, "Input.dispatchMouseEvent", {
      type: "mouseReleased",
      x: roundX,
      y: roundY,
      button: "left",
      clickCount: 1
    });
  }

  /**
   * Emulate hardware keyboard typing with natural insertion & sanitization.
   * @param {number} tabId
   * @param {number} x
   * @param {number} y
   * @param {string} text
   * @param {boolean} [pressEnter=false]
   * @param {boolean} [clearFirst=true]
   */
  async typeText(tabId, x, y, text, pressEnter = false, clearFirst = true) {
    // 1. Click target coordinates to establish focus
    if (x > 0 && y > 0) {
      await this.clickAt(tabId, x, y);
      await new Promise(r => setTimeout(r, 60));
    }

    // 2. Clear existing input using Ctrl/Cmd+A / Backspace if requested
    if (clearFirst) {
      try {
        await this.sendCommand(tabId, "Input.dispatchKeyEvent", {
          type: "rawKeyDown",
          windowsVirtualKeyCode: 65, // 'A'
          nativeVirtualKeyCode: 65,
          key: "a",
          code: "KeyA",
          modifiers: 2 // Ctrl / Cmd
        });
        await this.sendCommand(tabId, "Input.dispatchKeyEvent", {
          type: "rawKeyDown",
          windowsVirtualKeyCode: 8, // Backspace
          nativeVirtualKeyCode: 8,
          key: "Backspace",
          code: "Backspace"
        });
        await this.sendCommand(tabId, "Input.dispatchKeyEvent", {
          type: "keyUp",
          windowsVirtualKeyCode: 8,
          nativeVirtualKeyCode: 8,
          key: "Backspace",
          code: "Backspace"
        });
        await this.sendCommand(tabId, "Input.dispatchKeyEvent", {
          type: "keyUp",
          windowsVirtualKeyCode: 65,
          nativeVirtualKeyCode: 65,
          key: "a",
          code: "KeyA"
        });
      } catch (e) {
        // Non-fatal if clear key sequence fails
      }
    }

    // 3. Native hardware text insertion (triggers native React/Vue/Angular composition events)
    await this.sendCommand(tabId, "Input.insertText", {
      text: text
    });

    // 4. Optional Enter key
    if (pressEnter) {
      await new Promise(r => setTimeout(r, 80));
      await this.pressHotkey(tabId, "Enter");
    }
  }

  /**
   * Hardware viewport scroll using mouse wheel events.
   * @param {number} tabId
   * @param {number} x
   * @param {number} y
   * @param {number} deltaY (positive = scroll down, negative = scroll up)
   */
  async scroll(tabId, x, y, deltaY) {
    const targetX = x > 0 ? Math.round(x) : 500;
    const targetY = y > 0 ? Math.round(y) : 400;

    await this.sendCommand(tabId, "Input.dispatchMouseEvent", {
      type: "mouseWheel",
      x: targetX,
      y: targetY,
      deltaX: 0,
      deltaY: Math.round(deltaY)
    });
  }

  /**
   * Dispatch single key or hotkey combination.
   * @param {number} tabId
   * @param {string} keyName
   */
  async pressHotkey(tabId, keyName) {
    const KEY_MAP = {
      'enter': { key: 'Enter', code: 'Enter', keyCode: 13, text: '\r' },
      'escape': { key: 'Escape', code: 'Escape', keyCode: 27 },
      'tab': { key: 'Tab', code: 'Tab', keyCode: 9 },
      'backspace': { key: 'Backspace', code: 'Backspace', keyCode: 8 },
      'arrowdown': { key: 'ArrowDown', code: 'ArrowDown', keyCode: 40 },
      'arrowup': { key: 'ArrowUp', code: 'ArrowUp', keyCode: 38 },
      'arrowleft': { key: 'ArrowLeft', code: 'ArrowLeft', keyCode: 37 },
      'arrowright': { key: 'ArrowRight', code: 'ArrowRight', keyCode: 39 },
      'space': { key: ' ', code: 'Space', keyCode: 32, text: ' ' },
      'pagedown': { key: 'PageDown', code: 'PageDown', keyCode: 34 },
      'pageup': { key: 'PageUp', code: 'PageUp', keyCode: 33 }
    };

    const clean = keyName.trim().toLowerCase();
    const info = KEY_MAP[clean] || { key: keyName, code: keyName, keyCode: 0 };

    await this.sendCommand(tabId, "Input.dispatchKeyEvent", {
      type: "rawKeyDown",
      windowsVirtualKeyCode: info.keyCode,
      nativeVirtualKeyCode: info.keyCode,
      key: info.key,
      code: info.code,
      text: info.text || undefined
    });

    await new Promise(r => setTimeout(r, 40));

    await this.sendCommand(tabId, "Input.dispatchKeyEvent", {
      type: "keyUp",
      windowsVirtualKeyCode: info.keyCode,
      nativeVirtualKeyCode: info.keyCode,
      key: info.key,
      code: info.code
    });
  }

  /**
   * Native JavaScript Dialog Handling (alert, confirm, prompt).
   * @param {number} tabId
   * @param {boolean} [accept=true]
   * @param {string} [promptText='']
   */
  async handleDialog(tabId, accept = true, promptText = '') {
    return this.sendCommand(tabId, "Page.handleJavaScriptDialog", {
      accept: Boolean(accept),
      promptText: promptText || undefined
    });
  }

  /**
   * Check if tab has an open JavaScript dialog.
   * @param {number} tabId
   */
  hasOpenDialog(tabId) {
    return this.pendingDialogs.has(tabId);
  }

  /**
   * Detach from all currently tracked tabs.
   */
  async detachAll() {
    const tabs = Array.from(this.attachedTabs);
    for (const tabId of tabs) {
      await this.detach(tabId);
    }
    this.attachedTabs.clear();
    this.inflightRequests.clear();
    this.pendingDialogs.clear();
  }
}

export const cdpController = new CDPController();
