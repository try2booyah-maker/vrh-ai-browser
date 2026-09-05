/**
 * VRH.AI Chrome DevTools Protocol (CDP) Controller
 * Manages hardware-level mouse, keyboard, and scroll emulation via chrome.debugger.
 */

class CDPController {
  constructor() {
    this.attachedTabs = new Set();
    this._initListeners();
  }

  _initListeners() {
    if (typeof chrome !== 'undefined' && chrome.debugger) {
      chrome.debugger.onDetach.addListener((source, reason) => {
        if (source && source.tabId) {
          this.attachedTabs.delete(source.tabId);
          console.log(`[CDPController] Debugger detached from tab ${source.tabId}: ${reason}`);
        }
      });
    }
  }

  /**
   * Safely attach debugger to the target tab.
   * @param {number} tabId
   */
  async attach(tabId) {
    if (this.attachedTabs.has(tabId)) return true;

    return new Promise((resolve) => {
      chrome.debugger.attach({ tabId }, "1.3", () => {
        if (chrome.runtime.lastError) {
          const err = chrome.runtime.lastError.message;
          // If already attached, consider it successful
          if (err.includes("already attached") || err.includes("Another debugger")) {
            this.attachedTabs.add(tabId);
            resolve(true);
          } else {
            console.warn(`[CDPController] Attach warning for tab ${tabId}:`, err);
            resolve(false);
          }
        } else {
          this.attachedTabs.add(tabId);
          console.log(`[CDPController] Attached to tab ${tabId}`);
          resolve(true);
        }
      });
    });
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
        if (chrome.runtime.lastError) {
          // Ignored if tab closed or already detached
        }
        console.log(`[CDPController] Detached from tab ${tabId}`);
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
   * Emulate real hardware mouse click.
   * @param {number} tabId
   * @param {number} x
   * @param {number} y
   */
  async clickAt(tabId, x, y) {
    // 1. Move mouse to target
    await this.sendCommand(tabId, "Input.dispatchMouseEvent", {
      type: "mouseMoved",
      x: Math.round(x),
      y: Math.round(y)
    });

    // 2. Mouse pressed (isTrusted: true)
    await this.sendCommand(tabId, "Input.dispatchMouseEvent", {
      type: "mousePressed",
      x: Math.round(x),
      y: Math.round(y),
      button: "left",
      clickCount: 1
    });

    // Natural human click duration
    await new Promise(r => setTimeout(r, 45));

    // 3. Mouse released
    await this.sendCommand(tabId, "Input.dispatchMouseEvent", {
      type: "mouseReleased",
      x: Math.round(x),
      y: Math.round(y),
      button: "left",
      clickCount: 1
    });
  }

  /**
   * Emulate hardware keyboard typing with natural insertion.
   * @param {number} tabId
   * @param {number} x
   * @param {number} y
   * @param {string} text
   * @param {boolean} [pressEnter=false]
   */
  async typeText(tabId, x, y, text, pressEnter = false) {
    // 1. Click target coordinates to establish focus
    if (x > 0 && y > 0) {
      await this.clickAt(tabId, x, y);
      await new Promise(r => setTimeout(r, 60));
    }

    // 2. Clear existing input using Ctrl+A / Backspace
    try {
      await this.sendCommand(tabId, "Input.dispatchKeyEvent", {
        type: "rawKeyDown",
        windowsVirtualKeyCode: 65, // 'A'
        nativeVirtualKeyCode: 65,
        key: "a",
        code: "KeyA",
        modifiers: 2 // Ctrl/Cmd
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
    } catch (e) {
      // Non-fatal if clearing key event fails
    }

    // 3. Native hardware text insertion (works on React, Vue, Angular, Draft.js, contenteditable)
    await this.sendCommand(tabId, "Input.insertText", {
      text: text
    });

    // 4. Optional Enter key
    if (pressEnter) {
      await new Promise(r => setTimeout(r, 80));
      await this.sendCommand(tabId, "Input.dispatchKeyEvent", {
        type: "rawKeyDown",
        windowsVirtualKeyCode: 13,
        nativeVirtualKeyCode: 13,
        key: "Enter",
        code: "Enter",
        text: "\r"
      });
      await this.sendCommand(tabId, "Input.dispatchKeyEvent", {
        type: "keyUp",
        windowsVirtualKeyCode: 13,
        nativeVirtualKeyCode: 13,
        key: "Enter",
        code: "Enter"
      });
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
    const targetX = x > 0 ? Math.round(x) : Math.round(window?.innerWidth / 2 || 400);
    const targetY = y > 0 ? Math.round(y) : Math.round(window?.innerHeight / 2 || 300);

    await this.sendCommand(tabId, "Input.dispatchMouseEvent", {
      type: "mouseWheel",
      x: targetX,
      y: targetY,
      deltaX: 0,
      deltaY: Math.round(deltaY)
    });
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
  }
}

export const cdpController = new CDPController();
