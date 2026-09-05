/**
 * VRH.AI Autonomous Vision-Grounded Agent Runner 2.0
 * Multi-turn ReAct Loop (Perceive -> Reason -> Act -> Verify)
 * Complete 10-Tool Browser Control Arsenal, Deep DOM Perception,
 * Visual State-Diffing Verification, Sliding-Window Context Pruning,
 * Resilient Exponential Backoff, and Safety Interceptors.
 */

import { cdpController } from './cdpController.js';

export const AGENT_TOOLS = [
  {
    type: "function",
    function: {
      name: "click_element",
      description: "Click an actionable element on the page using its numeric mark_id badge from the Set-of-Marks visual overlay.",
      parameters: {
        type: "object",
        properties: {
          mark_id: { type: "integer", description: "The numeric badge ID of the element to click." },
          reason: { type: "string", description: "Clear explanation of why clicking this element progresses the task." }
        },
        required: ["mark_id", "reason"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "type_text",
      description: "Type text into an input or textarea element by its numeric mark_id, with optional field clearing and Enter key submission.",
      parameters: {
        type: "object",
        properties: {
          mark_id: { type: "integer", description: "The numeric badge ID of the input element." },
          text: { type: "string", description: "The text string to type." },
          clear_first: { type: "boolean", description: "Whether to clear existing text with Ctrl/Cmd+A + Backspace before typing (default: true)." },
          press_enter: { type: "boolean", description: "Whether to simulate pressing Enter after typing (e.g. for search bars)." },
          reason: { type: "string", description: "Explanation of why this text is being typed." }
        },
        required: ["mark_id", "text", "reason"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "scroll_page",
      description: "Scroll the viewport up or down to reveal new or off-screen elements.",
      parameters: {
        type: "object",
        properties: {
          direction: { type: "string", enum: ["up", "down"], description: "Direction to scroll." },
          amount_px: { type: "integer", description: "Pixel amount to scroll (default 500-700)." },
          reason: { type: "string", description: "Why scrolling is necessary." }
        },
        required: ["direction", "reason"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "navigate_to",
      description: "Navigate directly to a specific destination URL.",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "The destination HTTP/HTTPS URL." },
          reason: { type: "string", description: "Why navigating to this URL is required." }
        },
        required: ["url", "reason"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "switch_or_open_tab",
      description: "Manage browser tabs: open a new tab, switch active focus to an existing tab, or close a tab.",
      parameters: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["open", "switch", "close"], description: "The tab operation to perform." },
          url: { type: "string", description: "Destination URL when action is 'open'." },
          tab_id: { type: "integer", description: "Target tab ID when action is 'switch' or 'close'." },
          reason: { type: "string", description: "Why this tab operation is needed." }
        },
        required: ["action", "reason"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "press_hotkey",
      description: "Send specific keyboard keys or combinations (e.g. 'Enter', 'Escape', 'Tab', 'ArrowDown', 'ArrowUp', 'Space').",
      parameters: {
        type: "object",
        properties: {
          keys: { type: "string", description: "Key name to press, e.g. 'Enter', 'Escape', 'Tab', 'ArrowDown'." },
          reason: { type: "string", description: "Why this key stroke is needed." }
        },
        required: ["keys", "reason"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "extract_data",
      description: "Scrape and extract structured tabular or entity data directly from the webpage into JSON format.",
      parameters: {
        type: "object",
        properties: {
          schema: { type: "string", description: "Description of the data schema (e.g. 'products: [{ name, price, rating }]')." },
          data: { type: "object", description: "Structured JSON payload of the extracted information." },
          reason: { type: "string", description: "Summary of what data was extracted." }
        },
        required: ["data", "reason"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "handle_dialog",
      description: "Accept or dismiss native JavaScript alerts, confirms, or prompt dialogs.",
      parameters: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["accept", "dismiss"], description: "Whether to accept (OK) or dismiss (Cancel) the dialog." },
          prompt_text: { type: "string", description: "Optional text response if the dialog is a prompt." },
          reason: { type: "string", description: "Why this dialog response was chosen." }
        },
        required: ["action", "reason"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "request_user_intervention",
      description: "Pause autonomous execution and alert the human user when manual action is needed (e.g. CAPTCHA, 2FA prompt, sensitive checkout confirmation).",
      parameters: {
        type: "object",
        properties: {
          reason: { type: "string", description: "Detailed message explaining what the human user needs to perform on the webpage." },
          issue_type: { type: "string", enum: ["captcha", "2fa", "payment", "other"], description: "Category of intervention required." }
        },
        required: ["reason"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "finish_task",
      description: "Call this when the user's objective has been successfully completed, or if it is impossible to proceed.",
      parameters: {
        type: "object",
        properties: {
          success: { type: "boolean", description: "True if the task succeeded, false if impossible." },
          final_summary: { type: "string", description: "Concise summary of actions taken and final answers or extracted information." },
          extracted_payload: { type: "object", description: "Optional final structured JSON payload if data extraction was requested." }
        },
        required: ["success", "final_summary"]
      }
    }
  }
];

const SYSTEM_PROMPT = `You are VRH.AI, an elite autonomous vision-grounded web browsing agent.
You interact with web pages through visual perception (Set-of-Marks annotated screenshots) and hardware-level browser controls.

=== HOW YOU OPERATE ===
1. VISUAL GROUNDING: Each actionable element on screen is outlined and tagged with a high-contrast yellow badge containing a numeric mark_id: [1], [2], [3]...
2. ELEMENT MANIFEST: You receive a compact JSON manifest mapping each mark_id to its accessible name, role, placeholder, input state, and coordinates.
3. RE-ACT VERIFICATION CYCLE:
   - PERCEIVE: Carefully examine the annotated screenshot and match elements in the manifest.
   - REASON: Explain your reasoning clearly before choosing an action.
   - ACT: Invoke exactly ONE tool per step from your tools schema.
   - VERIFY: In the next turn, check if the action progressed the page. If an action had zero effect, choose an alternative approach or scroll.
4. CRITICAL RULES:
   - ONLY reference valid mark_id numbers that appear in the current screenshot & manifest.
   - For search inputs or forms, call type_text. Set clear_first: true to replace existing text, and press_enter: true for search bars.
   - If you spot a CAPTCHA (Cloudflare Turnstile, reCAPTCHA, hCaptcha) or 2FA login challenge, invoke request_user_intervention immediately.
   - Do NOT click checkout/payment buttons directly; trigger request_user_intervention for sensitive financial actions.
   - When the user's goal has been completely achieved, call finish_task with success: true and your final summary.`;

export class AgentRunner {
  constructor() {
    this.status = 'idle'; // 'idle' | 'running' | 'paused' | 'done' | 'aborted' | 'error'
    this.taskGoal = '';
    this.currentStep = 0;
    this.maxSteps = 25;
    this.messages = [];
    this.recentActions = []; // oscillation breaker
    this.activeTabId = null;
    this.abortController = null;
    this.latestScreenshot = null;
    this.latestManifest = [];
    this.lastPageState = null; // for visual state-diffing verification
    this.runLogs = []; // for task export and replay
    this.extractedData = []; // scraped data payloads
    this.startTime = null;
    this.totalTokensEstimated = 0;
  }

  /**
   * Broadcast status update to sidepanel UI.
   */
  _broadcastUpdate(phase, extra = {}) {
    const elapsedSeconds = this.startTime ? Math.round((Date.now() - this.startTime) / 1000) : 0;

    const payload = {
      status: this.status,
      step: this.currentStep,
      maxSteps: this.maxSteps,
      phase, // 'perceiving' | 'thinking' | 'acting' | 'verifying' | 'paused' | 'done'
      taskGoal: this.taskGoal,
      timestamp: Date.now(),
      elapsedSeconds,
      tokensEstimated: this.totalTokensEstimated,
      screenshot: this.latestScreenshot,
      ...extra
    };

    chrome.runtime.sendMessage({
      type: "AGENT_STATUS_UPDATE",
      payload
    }).catch(() => {
      // Ignored if sidepanel is closed
    });
  }

  /**
   * Start autonomous agent task.
   * @param {string} goal
   * @param {number} [targetTabId]
   */
  async start(goal, targetTabId = null) {
    if (this.status === 'running') {
      console.warn("[AgentRunner] Agent already running.");
      return;
    }

    this.taskGoal = (goal || '').trim();
    if (!this.taskGoal) throw new Error("Please enter a goal for the agent.");

    // Determine target tab
    if (targetTabId) {
      this.activeTabId = targetTabId;
    } else {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) throw new Error("No active browser tab found.");
      this.activeTabId = tab.id;
    }

    this.status = 'running';
    this.currentStep = 0;
    this.messages = [{ role: "system", content: SYSTEM_PROMPT }];
    this.recentActions = [];
    this.runLogs = [];
    this.extractedData = [];
    this.lastPageState = null;
    this.startTime = Date.now();
    this.totalTokensEstimated = 0;
    this.abortController = new AbortController();

    // Attach debugger immediately
    await cdpController.attach(this.activeTabId);

    this._broadcastUpdate('ready', { message: "Task initialized." });
    this._runLoop();
  }

  /**
   * Pause execution (e.g. for user intervention).
   */
  pause(reason = "Automation paused.") {
    if (this.status === 'running') {
      this.status = 'paused';
      this._broadcastUpdate('paused', { interventionReason: reason });
    }
  }

  /**
   * Resume paused execution.
   */
  resume() {
    if (this.status === 'paused') {
      this.status = 'running';
      this._broadcastUpdate('thinking', { message: "Automation resumed." });
      this._runLoop();
    }
  }

  /**
   * Emergency stop and abort task.
   */
  async stop() {
    this.status = 'aborted';
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    await this._cleanup();
    this._broadcastUpdate('done', { message: "Task stopped by user." });
  }

  /**
   * Get current state of the agent runner.
   */
  getState() {
    return {
      status: this.status,
      isRunning: this.status === 'running',
      currentStep: this.currentStep,
      maxSteps: this.maxSteps,
      taskGoal: this.taskGoal,
      activeTabId: this.activeTabId,
      latestScreenshot: this.latestScreenshot,
      latestManifest: this.latestManifest,
      runLogs: this.runLogs,
      extractedData: this.extractedData,
      elapsedSeconds: this.startTime ? Math.round((Date.now() - this.startTime) / 1000) : 0,
      tokensEstimated: this.totalTokensEstimated
    };
  }

  /**
   * Annotate clean screenshot with Set-of-Marks visual grounding boxes using OffscreenCanvas.
   * This ensures the user's browser webpage stays completely untouched and clean.
   */
  async _annotateScreenshotWithMarks(dataUrl, manifest, viewport) {
    if (!manifest || manifest.length === 0) return dataUrl;

    try {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const bitmap = await createImageBitmap(blob);

      // Adaptive downscaling for token efficiency and high visual clarity
      const maxDim = 1280;
      let targetW = bitmap.width;
      let targetH = bitmap.height;
      if (targetW > maxDim || targetH > maxDim) {
        if (targetW > targetH) {
          targetH = Math.round((targetH * maxDim) / targetW);
          targetW = maxDim;
        } else {
          targetW = Math.round((targetW * maxDim) / targetH);
          targetH = maxDim;
        }
      }

      const canvas = new OffscreenCanvas(targetW, targetH);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(bitmap, 0, 0, targetW, targetH);

      const scaleX = targetW / (viewport?.width || bitmap.width);
      const scaleY = targetH / (viewport?.height || bitmap.height);

      ctx.lineWidth = Math.max(2, Math.round(2 * (targetW / 1280)));
      ctx.textBaseline = 'middle';

      for (const item of manifest) {
        if (!item.rect) continue;
        const x = item.rect.left * scaleX;
        const y = item.rect.top * scaleY;
        const w = item.rect.width * scaleX;
        const h = item.rect.height * scaleY;

        // Bounding box: high-contrast amber yellow with subtle fill
        ctx.strokeStyle = '#eab308';
        ctx.fillStyle = 'rgba(234, 179, 8, 0.12)';
        ctx.strokeRect(x, y, w, h);
        ctx.fillRect(x, y, w, h);

        // Pill badge: [mark_id]
        const label = `${item.mark_id}`;
        const fontSize = Math.max(12, Math.round(11 * (targetW / 1000)));
        ctx.font = `bold ${fontSize}px sans-serif`;
        const textMetrics = ctx.measureText(label);
        const badgeW = textMetrics.width + 10;
        const badgeH = fontSize + 6;
        const badgeX = Math.max(0, x);
        const badgeY = Math.max(0, y - badgeH);

        // Badge background
        ctx.fillStyle = '#facc15';
        ctx.fillRect(badgeX, badgeY, badgeW, badgeH);

        // Badge border
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.strokeRect(badgeX, badgeY, badgeW, badgeH);

        // Badge text
        ctx.fillStyle = '#000000';
        ctx.fillText(label, badgeX + 5, badgeY + (badgeH / 2));
      }

      const annotatedBlob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.75 });
      const buffer = await annotatedBlob.arrayBuffer();
      let binary = '';
      const bytes = new Uint8Array(buffer);
      const len = bytes.byteLength;
      for (let i = 0; i < len; i += 8192) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + 8192, len)));
      }
      return `data:image/jpeg;base64,${btoa(binary)}`;
    } catch (e) {
      console.warn("[AgentRunner] Offscreen annotation fallback to clean screenshot:", e);
      return dataUrl;
    }
  }

  /**
   * Resolve active inference configuration from storage.
   */
  async _getInferenceConfig() {
    const storage = await chrome.storage.local.get([
      'activeModelValue',
      'provider',
      'apiKey',
      'selectedModels',
      'customProviders',
      'customProviderName',
      'customBaseUrl',
      'apiUrl',
      'customApiKey',
      'customSelectedModels'
    ]);

    let activeVal = storage.activeModelValue || '';

    // If explicit openrouter model chosen
    if (activeVal.startsWith('openrouter:')) {
      const model = activeVal.replace('openrouter:', '');
      const key = (storage.apiKey || '').trim();
      if (!key) throw new Error("No OpenRouter API Key configured. Open Settings.");
      return {
        endpoint: 'https://openrouter.ai/api/v1/chat/completions',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`,
          'HTTP-Referer': 'https://vrh.ai',
          'X-Title': 'VRH.AI Autonomous Agent'
        },
        model
      };
    }

    // If explicit custom provider model chosen
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
          apiKey: storage.customApiKey || '',
          selectedModels: storage.customSelectedModels || []
        }];
      }

      const prov = customProviders.find(p => p.id === provId) || customProviders[0];
      if (!prov) throw new Error("Configured provider not found. Open Settings.");

      const baseUrl = (prov.baseUrl || '').trim().replace(/\/+$/, '');
      const key = (prov.apiKey || '').trim();
      if (!baseUrl) throw new Error(`No Base URL configured for ${prov.name}. Open Settings.`);

      const endpoint = baseUrl.endsWith('/chat/completions') ? baseUrl : `${baseUrl}/chat/completions`;
      const headers = { 'Content-Type': 'application/json' };
      if (key) headers['Authorization'] = `Bearer ${key}`;

      return {
        endpoint,
        headers,
        model: model || (prov.selectedModels && prov.selectedModels[0]) || 'gpt-4o'
      };
    }

    // Fallback: Check OpenRouter
    if (storage.apiKey && storage.selectedModels && storage.selectedModels.length > 0) {
      return {
        endpoint: 'https://openrouter.ai/api/v1/chat/completions',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${storage.apiKey.trim()}`,
          'HTTP-Referer': 'https://vrh.ai',
          'X-Title': 'VRH.AI Autonomous Agent'
        },
        model: storage.selectedModels[0]
      };
    }

    // Fallback: Check customProviders
    const customProviders = storage.customProviders || [];
    if (customProviders.length > 0) {
      const p = customProviders[0];
      const baseUrl = (p.baseUrl || '').trim().replace(/\/+$/, '');
      const key = (p.apiKey || '').trim();
      if (baseUrl) {
        const headers = { 'Content-Type': 'application/json' };
        if (key) headers['Authorization'] = `Bearer ${key}`;
        return {
          endpoint: baseUrl.endsWith('/chat/completions') ? baseUrl : `${baseUrl}/chat/completions`,
          headers,
          model: (p.selectedModels && p.selectedModels[0]) || 'gpt-4o'
        };
      }
    }

    throw new Error("No configured AI providers found. Please open Settings and configure OpenRouter or an OpenAI-Compatible provider.");
  }

  /**
   * Resilient Request Dispatcher with Exponential Backoff on 429/500/503.
   */
  async _dispatchLLMRequest(endpoint, headers, payload, maxRetries = 3) {
    let attempt = 0;
    let delay = 1000;

    while (attempt <= maxRetries) {
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
          signal: this.abortController?.signal
        });

        if (res.ok) {
          return await res.json();
        }

        // Retryable HTTP status codes
        if ([429, 500, 502, 503, 504].includes(res.status) && attempt < maxRetries) {
          attempt++;
          console.warn(`[AgentRunner] HTTP ${res.status} from ${endpoint}. Retrying in ${delay}ms (attempt ${attempt}/${maxRetries})...`);
          await new Promise(r => setTimeout(r, delay));
          delay *= 2; // exponential backoff
          continue;
        }

        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error?.message || `API Error (${res.status})`);
      } catch (err) {
        if (err.name === 'AbortError') throw err;
        if (attempt < maxRetries) {
          attempt++;
          await new Promise(r => setTimeout(r, delay));
          delay *= 2;
          continue;
        }
        throw err;
      }
    }
  }

  /**
   * Sliding-window multimodal context pruning.
   * Drops heavy base64 screenshots from conversational turns older than step N-1
   * while keeping user goals, assistant reasoning, and tool outputs intact.
   */
  _pruneMultimodalContext() {
    const keptMessages = [];

    // Find the latest user message with an image
    let lastImageIndex = -1;
    for (let i = this.messages.length - 1; i >= 0; i--) {
      const msg = this.messages[i];
      if (msg.role === 'user' && Array.isArray(msg.content)) {
        const hasImg = msg.content.some(part => part.type === 'image_url');
        if (hasImg) {
          lastImageIndex = i;
          break;
        }
      }
    }

    for (let i = 0; i < this.messages.length; i++) {
      const msg = this.messages[i];
      if (i < lastImageIndex && msg.role === 'user' && Array.isArray(msg.content)) {
        // Strip heavy image_url from earlier turn, keep text summary
        const textParts = msg.content.filter(p => p.type === 'text');
        keptMessages.push({
          role: 'user',
          content: textParts.length ? textParts[0].text : "[Prior Step Observation]"
        });
      } else {
        keptMessages.push(msg);
      }
    }

    this.messages = keptMessages;
  }

  /**
   * The Perception-Action-Verification Autonomous Loop.
   */
  async _runLoop() {
    while (this.status === 'running') {
      this.currentStep++;

      if (this.currentStep > this.maxSteps) {
        this.status = 'error';
        await this._cleanup();
        this._broadcastUpdate('done', {
          error: `Reached maximum limit of ${this.maxSteps} steps. Task ended.`
        });
        return;
      }

      try {
        // ── 1. PERCEPTION: SCAN ELEMENTS & ANNOTATE SCREENSHOT ──
        this._broadcastUpdate('perceiving');

        const tab = await chrome.tabs.get(this.activeTabId).catch(() => null);
        if (!tab) throw new Error("Target tab was closed.");

        // Sweep annoyances and scan DOM/Shadow roots
        const somRes = await chrome.tabs.sendMessage(this.activeTabId, { action: "INJECT_SET_OF_MARKS" });
        if (!somRes || !somRes.result) {
          throw new Error("Failed to scan interactive elements on page.");
        }

        const { manifest, hasCaptcha, viewport } = somRes.result;
        this.latestManifest = manifest;

        // Auto-detect CAPTCHA / Bot challenges
        if (hasCaptcha) {
          this.pause("Security challenge (CAPTCHA / 2FA) detected on page. Please solve it and click Resume.");
          return;
        }

        // Capture clean viewport screenshot
        const cleanScreenshotUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'jpeg', quality: 75 });

        // Annotate screenshot exclusively on background OffscreenCanvas
        const annotatedScreenshotUrl = await this._annotateScreenshotWithMarks(cleanScreenshotUrl, manifest, viewport);
        this.latestScreenshot = annotatedScreenshotUrl;

        // Current page state signature for verification
        const currentStateSignature = {
          url: tab.url,
          title: tab.title,
          manifestCount: manifest.length,
          topMarkIds: manifest.slice(0, 10).map(m => `${m.mark_id}:${m.name || m.placeholder || ''}`).join('|')
        };

        // ── 2. VISUAL ACTION VERIFICATION (STATE DIFFING) ──
        let verificationNotice = "";
        if (this.lastPageState && this.recentActions.length > 0) {
          const lastAction = this.recentActions[this.recentActions.length - 1];
          const urlChanged = currentStateSignature.url !== this.lastPageState.url;
          const domChanged = currentStateSignature.manifestCount !== this.lastPageState.manifestCount ||
                             currentStateSignature.topMarkIds !== this.lastPageState.topMarkIds;

          if (!urlChanged && !domChanged && !lastAction.includes('scroll') && !lastAction.includes('extract_data')) {
            verificationNotice = `\n\n[VERIFICATION WARNING]: Previous action produced no detectable visual or DOM change on the page. The target element may be disabled, occluded by an overlay, or non-reactive. Consider scrolling, sweeping overlays, or selecting an alternate element.`;
          }
        }
        this.lastPageState = currentStateSignature;

        // ── 3. REASONING: CALL MULTIMODAL LLM ──
        this._broadcastUpdate('thinking');

        const { endpoint, headers, model } = await this._getInferenceConfig();

        // Build observation prompt with token-efficient manifest
        const stepPrompt = `Task Objective: "${this.taskGoal}"
Current Step: ${this.currentStep} of ${this.maxSteps}
Current URL: ${tab.url}
Page Title: "${tab.title}"

Visible Interactive Elements:
${JSON.stringify(manifest, null, 2)}${verificationNotice}

Analyze the screenshot visual grounding labels [1], [2], [3]... and the element manifest above. Formulate your reasoning and select the best next tool to execute.`;

        const userMessage = {
          role: "user",
          content: [
            { type: "text", text: stepPrompt },
            { type: "image_url", image_url: { url: annotatedScreenshotUrl } }
          ]
        };

        // Context pruning: strip older base64 screenshots to save tokens and reduce latency
        this._pruneMultimodalContext();

        const payload = {
          model,
          messages: [...this.messages, userMessage],
          tools: AGENT_TOOLS,
          max_tokens: 2048
        };

        // Estimate token cost
        this.totalTokensEstimated += 1500 + Math.round(JSON.stringify(manifest).length / 4);

        const data = await this._dispatchLLMRequest(endpoint, headers, payload);
        const choice = data.choices?.[0]?.message;
        if (!choice) throw new Error("No response returned from AI provider.");

        this.messages.push(userMessage);
        this.messages.push(choice);

        // Parse tool invocation
        let toolCall = null;
        if (choice.tool_calls && choice.tool_calls.length > 0) {
          const call = choice.tool_calls[0];
          try {
            toolCall = {
              id: call.id,
              name: call.function.name,
              args: typeof call.function.arguments === 'string' ? JSON.parse(call.function.arguments) : call.function.arguments
            };
          } catch (e) {
            console.error("[AgentRunner] Failed to parse tool call arguments:", e);
          }
        }

        // Fallback: Check if model responded in raw text JSON
        if (!toolCall && choice.content) {
          toolCall = this._extractJsonToolCall(choice.content);
        }

        if (!toolCall) {
          this.messages.push({
            role: "user",
            content: "You did not invoke a tool. Please execute a tool call from your available tools to progress the task."
          });
          continue;
        }

        const reasoning = toolCall.args?.reason || toolCall.args?.reasoning || choice.content || '';

        // ── 4. STALL & OSCILLATION BREAKER ──
        const actionSig = `${toolCall.name}:${JSON.stringify(toolCall.args)}`;
        this.recentActions.push(actionSig);
        if (this.recentActions.length > 5) this.recentActions.shift();

        // Consecutive identical action check
        if (this.recentActions.length >= 3 && this.recentActions.slice(-3).every(a => a === actionSig)) {
          this.messages.push({
            role: "system",
            content: `[SYSTEM WARNING]: You have executed '${toolCall.name}' with identical parameters 3 times consecutively without progression. You MUST select an alternative tool, scroll the viewport, or request human intervention.`
          });
        }

        // ── 5. ACTING: SAFETY GATING & CDP HARDWARE EXECUTION ──
        this._broadcastUpdate('acting', {
          currentTool: toolCall.name,
          currentArgs: toolCall.args,
          reasoning
        });

        // Record log entry
        const logEntry = {
          step: this.currentStep,
          tool: toolCall.name,
          args: toolCall.args,
          reasoning,
          timestamp: Date.now()
        };
        this.runLogs.push(logEntry);

        const actionResult = await this._executeTool(toolCall);

        this.messages.push({
          role: "tool",
          tool_call_id: toolCall.id || `call_${Date.now()}`,
          name: toolCall.name,
          content: JSON.stringify(actionResult)
        });

        // ── 6. VERIFYING PHASE ──
        this._broadcastUpdate('verifying', {
          currentTool: toolCall.name,
          lastResult: actionResult
        });

        // Check task resolution
        if (toolCall.name === 'finish_task') {
          this.status = 'done';
          await this._cleanup();
          this._broadcastUpdate('done', {
            success: toolCall.args.success,
            summary: toolCall.args.final_summary,
            extractedPayload: toolCall.args.extracted_payload,
            reasoning
          });
          return;
        }

        // Deterministic wait for page network & DOM mutation settling
        await cdpController.waitForPageSettled(this.activeTabId, 3000, 350);

      } catch (err) {
        if (this.status === 'aborted') return;

        console.error("[AgentRunner] Step error:", err);
        this.status = 'error';
        await this._cleanup();
        this._broadcastUpdate('done', { error: err.message });
        return;
      }
    }
  }

  /**
   * Execute selected tool via CDP or Chrome APIs.
   */
  async _executeTool(toolCall) {
    const { name, args } = toolCall;

    switch (name) {
      case "click_element": {
        const markId = args.mark_id;
        const markRes = await chrome.tabs.sendMessage(this.activeTabId, { action: "GET_MARK_INFO", markId });
        const mark = markRes?.result;
        if (!mark) throw new Error(`Element with mark_id [${markId}] not found in viewport.`);

        // SENSITIVE ACTION INTERCEPTOR
        if (mark.isSensitive) {
          this.pause(`Sensitive financial or account action detected on element: "${mark.text}". Please review and execute manually, then click Resume.`);
          return { status: "paused_for_sensitive_action", markId, text: mark.text };
        }

        // Real hardware mouse click via CDP
        await cdpController.clickAt(this.activeTabId, mark.x, mark.y);
        return { status: "clicked", markId, coordinates: [mark.x, mark.y], text: mark.text };
      }

      case "type_text": {
        const markId = args.mark_id;
        const markRes = await chrome.tabs.sendMessage(this.activeTabId, { action: "GET_MARK_INFO", markId });
        const mark = markRes?.result;
        const x = mark ? mark.x : 0;
        const y = mark ? mark.y : 0;

        const clearFirst = args.clear_first !== false;
        const pressEnter = Boolean(args.press_enter);

        await cdpController.typeText(this.activeTabId, x, y, args.text, pressEnter, clearFirst);
        return { status: "typed", text: args.text, markId, pressEnter, clearFirst };
      }

      case "scroll_page": {
        const delta = (args.amount_px || 600) * (args.direction === 'up' ? -1 : 1);
        await cdpController.scroll(this.activeTabId, 0, 0, delta);
        return { status: "scrolled", direction: args.direction, amount_px: delta };
      }

      case "navigate_to": {
        await chrome.tabs.update(this.activeTabId, { url: args.url });
        await new Promise(r => setTimeout(r, 1200));
        return { status: "navigated", url: args.url };
      }

      case "switch_or_open_tab": {
        if (args.action === 'open') {
          const newTab = await chrome.tabs.create({ url: args.url || 'https://google.com' });
          this.activeTabId = newTab.id;
          await cdpController.attach(this.activeTabId);
          return { status: "tab_opened", tabId: newTab.id, url: args.url };
        } else if (args.action === 'switch' && args.tab_id) {
          await chrome.tabs.update(args.tab_id, { active: true });
          this.activeTabId = args.tab_id;
          await cdpController.attach(this.activeTabId);
          return { status: "tab_switched", activeTabId: this.activeTabId };
        } else if (args.action === 'close' && args.tab_id) {
          await chrome.tabs.remove(args.tab_id);
          return { status: "tab_closed", closedTabId: args.tab_id };
        }
        throw new Error(`Unsupported tab action: ${args.action}`);
      }

      case "press_hotkey": {
        await cdpController.pressHotkey(this.activeTabId, args.keys);
        return { status: "hotkey_pressed", keys: args.keys };
      }

      case "extract_data": {
        this.extractedData.push(args.data);
        return { status: "data_extracted", recordCount: Array.isArray(args.data) ? args.data.length : 1 };
      }

      case "handle_dialog": {
        const accept = args.action === 'accept';
        await cdpController.handleDialog(this.activeTabId, accept, args.prompt_text);
        return { status: "dialog_handled", action: args.action };
      }

      case "request_user_intervention": {
        this.pause(args.reason);
        return { status: "paused_for_intervention", reason: args.reason, issueType: args.issue_type };
      }

      case "finish_task": {
        if (args.extracted_payload) {
          this.extractedData.push(args.extracted_payload);
        }
        return { status: "completed", success: args.success, summary: args.final_summary };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  /**
   * Fallback parser for models that output raw JSON blocks.
   */
  _extractJsonToolCall(text) {
    try {
      const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[1] || match[0]);
        const toolName = parsed.action || parsed.name || parsed.tool;
        const args = parsed.args || parsed.parameters || parsed.arguments || parsed;
        if (toolName) {
          return { id: `call_${Date.now()}`, name: toolName, args };
        }
      }
    } catch (e) { /* ignore parse failure */ }
    return null;
  }

  /**
   * Gracefully clean up all active debugging sessions and injected marks.
   */
  async _cleanup() {
    if (this.activeTabId) {
      await chrome.tabs.sendMessage(this.activeTabId, { action: "CLEAR_SET_OF_MARKS" }).catch(() => {});
      await cdpController.detach(this.activeTabId).catch(() => {});
    }
  }
}

export const agentRunner = new AgentRunner();
