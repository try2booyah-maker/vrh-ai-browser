/**
 * VRH.AI Autonomous Vision-Grounded Agent Runner
 * Multi-turn ReAct Loop (Perceive -> Reason -> Act -> Verify)
 * Combines Set-of-Marks visual perception with CDP hardware emulation.
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
          reasoning: { type: "string", description: "Clear explanation of why clicking this element progresses the task." }
        },
        required: ["mark_id", "reasoning"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "type_text",
      description: "Type text into an input or textarea element by its numeric mark_id, with optional Enter key submission.",
      parameters: {
        type: "object",
        properties: {
          mark_id: { type: "integer", description: "The numeric badge ID of the input element." },
          text: { type: "string", description: "The text string to type." },
          press_enter: { type: "boolean", description: "Whether to simulate pressing Enter after typing (e.g. for search bars)." },
          reasoning: { type: "string", description: "Explanation of why this text is being typed." }
        },
        required: ["mark_id", "text", "reasoning"]
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
          amount: { type: "integer", description: "Pixel amount to scroll (default 500-700)." },
          reasoning: { type: "string", description: "Why scrolling is necessary." }
        },
        required: ["direction", "reasoning"]
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
          reasoning: { type: "string", description: "Why navigating to this URL is required." }
        },
        required: ["url", "reasoning"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "wait",
      description: "Pause execution for dynamic content, animations, or network requests to settle.",
      parameters: {
        type: "object",
        properties: {
          seconds: { type: "number", description: "Number of seconds to pause (1 to 10)." },
          reasoning: { type: "string", description: "Why a delay is needed." }
        },
        required: ["seconds", "reasoning"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "request_user_intervention",
      description: "Pause autonomous execution and alert the human user when manual action is needed (e.g., CAPTCHA challenge, 2FA prompt, sensitive checkout).",
      parameters: {
        type: "object",
        properties: {
          reason: { type: "string", description: "Detailed message explaining what the human user needs to perform on the webpage." }
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
          summary: { type: "string", description: "Concise summary of actions taken and final answers or extracted information." }
        },
        required: ["success", "summary"]
      }
    }
  }
];

const SYSTEM_PROMPT = `You are VRH.AI, a bleeding-edge autonomous vision-grounded web browsing agent.
You interact with web pages through visual perception (Set-of-Marks annotated screenshots) and hardware-level tools.

=== HOW YOU OPERATE ===
1. VISUAL GROUNDING: Each actionable element on screen is outlined and tagged with a high-contrast yellow badge containing a numeric mark_id: [1], [2], [3]...
2. ELEMENT MANIFEST: You receive a compact JSON manifest mapping each mark_id to its HTML tag, accessible role, text/placeholder, and viewport coordinates.
3. RE-ACT CYCLE:
   - PERCEIVE: Carefully examine the annotated screenshot and match elements in the manifest.
   - REASON: Explain your rationale clearly before choosing an action.
   - ACT: Invoke exactly ONE tool per step from your tools schema.
   - VERIFY: In the next step, verify whether your previous action succeeded.
4. CRITICAL RULES:
   - ONLY reference valid mark_id numbers that appear in the current screenshot & manifest.
   - When filling forms or search inputs, call type_text with the appropriate mark_id. Set press_enter: true if it's a search box.
   - Never repeatedly perform an action that had no visible effect. Try an alternative element or scroll.
   - If you spot a CAPTCHA (Cloudflare Turnstile, reCAPTCHA, hCaptcha) or 2FA login verification code, call request_user_intervention immediately.
   - When the user's goal has been completely achieved, call finish_task with success: true and your final summary.`;

export class AgentRunner {
  constructor() {
    this.status = 'idle'; // 'idle' | 'running' | 'paused' | 'done' | 'aborted' | 'error'
    this.taskGoal = '';
    this.currentStep = 0;
    this.maxSteps = 20;
    this.messages = [];
    this.recentActions = []; // for stalling detection
    this.activeTabId = null;
    this.abortController = null;
    this.latestScreenshot = null;
    this.latestManifest = [];
  }

  /**
   * Broadcast status update to sidepanel UI.
   */
  _broadcastUpdate(phase, extra = {}) {
    const payload = {
      status: this.status,
      step: this.currentStep,
      maxSteps: this.maxSteps,
      phase, // 'perceiving' | 'thinking' | 'acting' | 'paused' | 'done'
      taskGoal: this.taskGoal,
      timestamp: Date.now(),
      screenshot: this.latestScreenshot,
      ...extra
    };

    chrome.runtime.sendMessage({
      type: "AGENT_STATUS_UPDATE",
      payload
    }).catch(() => {
      // Ignored if sidepanel is closed or not listening
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
    this.abortController = new AbortController();

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

    // Gracefully clean up Set-of-Marks and detach CDP
    if (this.activeTabId) {
      await chrome.tabs.sendMessage(this.activeTabId, { action: "CLEAR_SET_OF_MARKS" }).catch(() => {});
      await cdpController.detach(this.activeTabId).catch(() => {});
    }

    this._broadcastUpdate('done', { message: "Task stopped by user." });
  }

  /**
   * Get current state of the agent runner.
   */
  getState() {
    return {
      status: this.status,
      currentStep: this.currentStep,
      maxSteps: this.maxSteps,
      taskGoal: this.taskGoal,
      activeTabId: this.activeTabId,
      latestScreenshot: this.latestScreenshot,
      latestManifest: this.latestManifest
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

      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(bitmap, 0, 0);

      const scaleX = bitmap.width / (viewport?.width || bitmap.width);
      const scaleY = bitmap.height / (viewport?.height || bitmap.height);

      ctx.lineWidth = Math.max(2, Math.round(2 * scaleX));
      ctx.textBaseline = 'middle';

      for (const item of manifest) {
        if (!item.rect) continue;
        const x = item.rect.left * scaleX;
        const y = item.rect.top * scaleY;
        const w = item.rect.width * scaleX;
        const h = item.rect.height * scaleY;

        // Bounding box: yellow with slight tint
        ctx.strokeStyle = '#eab308';
        ctx.fillStyle = 'rgba(234, 179, 8, 0.12)';
        ctx.strokeRect(x, y, w, h);
        ctx.fillRect(x, y, w, h);

        // Pill badge: [mark_id]
        const label = `${item.mark_id}`;
        const fontSize = Math.max(12, Math.round(11 * scaleX));
        ctx.font = `bold ${fontSize}px sans-serif`;
        const textMetrics = ctx.measureText(label);
        const badgeW = textMetrics.width + (8 * scaleX);
        const badgeH = fontSize + (4 * scaleY);
        const badgeX = Math.max(0, x);
        const badgeY = Math.max(0, y - badgeH);

        // Badge background
        ctx.fillStyle = '#facc15';
        ctx.fillRect(badgeX, badgeY, badgeW, badgeH);

        // Badge border
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = Math.max(1, Math.round(1 * scaleX));
        ctx.strokeRect(badgeX, badgeY, badgeW, badgeH);

        // Badge text
        ctx.fillStyle = '#000000';
        ctx.fillText(label, badgeX + (4 * scaleX), badgeY + (badgeH / 2));
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
   * Supports OpenRouter and multiple custom OpenAI-compatible providers seamlessly.
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
      if (!key) throw new Error(`No API Key configured for ${prov.name}. Open Settings.`);

      const endpoint = baseUrl.endsWith('/chat/completions') ? baseUrl : `${baseUrl}/chat/completions`;
      return {
        endpoint,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
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
      if (baseUrl && key) {
        return {
          endpoint: baseUrl.endsWith('/chat/completions') ? baseUrl : `${baseUrl}/chat/completions`,
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
          model: (p.selectedModels && p.selectedModels[0]) || 'gpt-4o'
        };
      }
    }

    // Legacy custom fallback
    const baseUrl = (storage.customBaseUrl || storage.apiUrl || '').trim().replace(/\/+$/, '');
    const key = (storage.customApiKey || '').trim();
    if (baseUrl && key) {
      return {
        endpoint: baseUrl.endsWith('/chat/completions') ? baseUrl : `${baseUrl}/chat/completions`,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
        model: (storage.customSelectedModels && storage.customSelectedModels[0]) || 'gpt-4o'
      };
    }

    throw new Error("No configured AI providers found. Please open Settings and configure OpenRouter or an OpenAI-Compatible provider.");
  }

  /**
   * The Perception-Action Execution Loop.
   */
  async _runLoop() {
    while (this.status === 'running') {
      this.currentStep++;

      if (this.currentStep > this.maxSteps) {
        this.status = 'error';
        await this._cleanup();
        this._broadcastUpdate('done', {
          error: `Reached hard limit of ${this.maxSteps} steps. Task ended.`
        });
        return;
      }

      try {
        // ── 1. PERCEPTION: SCAN ELEMENTS & ANNOTATE SCREENSHOT VIA CANVAS ──
        this._broadcastUpdate('perceiving');

        // Check if tab is alive
        const tab = await chrome.tabs.get(this.activeTabId).catch(() => null);
        if (!tab) {
          throw new Error("Target tab was closed.");
        }

        // Scan actionable elements on webpage (returns coordinates without injecting DOM elements)
        const somRes = await chrome.tabs.sendMessage(this.activeTabId, { action: "INJECT_SET_OF_MARKS" });
        if (!somRes || !somRes.result) {
          throw new Error("Failed to scan visual elements on webpage.");
        }

        const { manifest, hasCaptcha, viewport } = somRes.result;
        this.latestManifest = manifest;

        // Auto-detect CAPTCHA / 2FA Challenge
        if (hasCaptcha) {
          this.pause("Security challenge (CAPTCHA / 2FA) detected on page. Please solve it and click Resume.");
          return;
        }

        // Capture completely clean viewport screenshot (user sees no marks on page)
        const cleanScreenshotUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'jpeg', quality: 75 });

        // Annotate the screenshot with visual grounding marks exclusively for LLM multimodal perception
        const annotatedScreenshotUrl = await this._annotateScreenshotWithMarks(cleanScreenshotUrl, manifest, viewport);
        this.latestScreenshot = annotatedScreenshotUrl;

        // ── 2. REASONING: CALL MULTIMODAL LLM ──
        this._broadcastUpdate('thinking');

        const { endpoint, headers, model } = await this._getInferenceConfig();

        // Construct multimodal user observation message
        const stepPrompt = `Task Objective: "${this.taskGoal}"
Current Step: ${this.currentStep} of ${this.maxSteps}

Interactive Elements Manifest (visible on screen):
${JSON.stringify(manifest, null, 2)}

Analyze the screenshot visual grounding labels [1], [2], [3]... and the manifest above. Formulate your reasoning and select the best next tool to execute.`;

        const userMessage = {
          role: "user",
          content: [
            { type: "text", text: stepPrompt },
            { type: "image_url", image_url: { url: screenshotDataUrl } }
          ]
        };

        const payload = {
          model,
          messages: [...this.messages, userMessage],
          tools: AGENT_TOOLS,
          max_tokens: 2048
        };

        const res = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
          signal: this.abortController?.signal
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error?.message || `API Error (${res.status})`);
        }

        const data = await res.json();
        const choice = data.choices?.[0]?.message;
        if (!choice) throw new Error("No response returned from model.");

        // Record assistant response in conversation history
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
              args: JSON.parse(call.function.arguments)
            };
          } catch (e) {
            console.error("Failed to parse tool call arguments:", e);
          }
        }

        // Fallback: Check if model responded in raw text JSON
        if (!toolCall && choice.content) {
          toolCall = this._extractJsonToolCall(choice.content);
        }

        if (!toolCall) {
          console.warn("[AgentRunner] Model provided reasoning without a tool call:", choice.content);
          // Prompt model to pick a tool
          this.messages.push({
            role: "user",
            content: "You did not invoke a tool. Please execute a tool call from your available tools to progress the task."
          });
          continue;
        }

        // Extract reasoning
        const reasoning = toolCall.args?.reasoning || toolCall.args?.reason || choice.content || '';

        // ── 3. STALLING DETECTION ──
        const actionSig = `${toolCall.name}:${JSON.stringify(toolCall.args)}`;
        this.recentActions.push(actionSig);
        if (this.recentActions.length > 3) this.recentActions.shift();

        if (this.recentActions.length === 3 && this.recentActions.every(a => a === actionSig)) {
          this.messages.push({
            role: "system",
            content: `[SYSTEM WARNING]: You have executed '${toolCall.name}' with identical arguments 3 times consecutively without state progression. Do not repeat this action. Analyze the page and manifest again to try an alternative approach or request user intervention.`
          });
        }

        // ── 4. ACTING: SAFETY INTERCEPTOR & CDP HARDWARE EXECUTION ──
        this._broadcastUpdate('acting', {
          currentTool: toolCall.name,
          currentArgs: toolCall.args,
          reasoning
        });

        const actionResult = await this._executeTool(toolCall);

        // Record tool output in history for verification in next turn
        this.messages.push({
          role: "tool",
          tool_call_id: toolCall.id || `call_${Date.now()}`,
          name: toolCall.name,
          content: JSON.stringify(actionResult)
        });

        // Check if task is finished
        if (toolCall.name === 'finish_task') {
          this.status = 'done';
          await this._cleanup();
          this._broadcastUpdate('done', {
            success: toolCall.args.success,
            summary: toolCall.args.summary,
            reasoning
          });
          return;
        }

        // Pause for page DOM mutations and network requests to stabilize
        await new Promise(r => setTimeout(r, 700));

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
        if (!mark) throw new Error(`Element with mark_id [${markId}] not found.`);

        // SENSITIVE ACTION INTERCEPTOR
        if (mark.isSensitive) {
          this.pause(`Sensitive action detected on element: "${mark.text}". Please review and execute manually on the page, then click Resume.`);
          return { status: "paused_for_sensitive_action", markId, text: mark.text };
        }

        // Hardware-level mouse click via CDP
        await cdpController.clickAt(this.activeTabId, mark.x, mark.y);
        return { status: "clicked", markId, coordinates: [mark.x, mark.y], text: mark.text };
      }

      case "type_text": {
        const markId = args.mark_id;
        const markRes = await chrome.tabs.sendMessage(this.activeTabId, { action: "GET_MARK_INFO", markId });
        const mark = markRes?.result;
        const x = mark ? mark.x : 0;
        const y = mark ? mark.y : 0;

        // Hardware-level typing via CDP Input.insertText
        await cdpController.typeText(this.activeTabId, x, y, args.text, Boolean(args.press_enter));
        return { status: "typed", text: args.text, markId, pressEnter: Boolean(args.press_enter) };
      }

      case "scroll_page": {
        const delta = (args.amount || 600) * (args.direction === 'up' ? -1 : 1);
        await cdpController.scroll(this.activeTabId, 0, 0, delta);
        return { status: "scrolled", direction: args.direction, amount: delta };
      }

      case "navigate_to": {
        await chrome.tabs.update(this.activeTabId, { url: args.url });
        await new Promise(r => setTimeout(r, 1500)); // Allow navigation to initiate
        return { status: "navigated", url: args.url };
      }

      case "wait": {
        const duration = Math.min(10, Math.max(1, args.seconds || 2));
        await new Promise(r => setTimeout(r, duration * 1000));
        return { status: "waited", seconds: duration };
      }

      case "request_user_intervention": {
        this.pause(args.reason);
        return { status: "paused_for_intervention", reason: args.reason };
      }

      case "finish_task": {
        return { status: "completed", success: args.success, summary: args.summary };
      }

      default:
        throw new Error(`Unknown tool action: ${name}`);
    }
  }

  /**
   * Fallback parser for models that respond with raw JSON blocks.
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
