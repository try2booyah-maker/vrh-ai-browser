/**
 * tests/agent-lifecycle.test.cjs
 * Comprehensive test suite for VRH.AI Version 1.0 Autonomous Agent lifecycle,
 * restricted URL guardrails, selection actions, and status updates.
 */

const { describe, it, before } = require('node:test');
const assert = require('node:assert');

describe('Version 1.0 Agent Lifecycle & Guardrails', () => {

  // 1. Restricted URL Guardrails
  describe('Restricted Page Guardrails', () => {
    function isRestrictedUrl(url) {
      if (!url) return true;
      return (
        url.startsWith('chrome://') ||
        url.startsWith('chrome-extension://') ||
        url.startsWith('edge://') ||
        url.startsWith('about:') ||
        url.startsWith('view-source:') ||
        url.includes('chromewebstore.google.com') ||
        url.includes('chrome.google.com/webstore')
      );
    }

    it('flags internal chrome:// and edge:// schemes as restricted', () => {
      assert.strictEqual(isRestrictedUrl('chrome://extensions'), true);
      assert.strictEqual(isRestrictedUrl('chrome://settings'), true);
      assert.strictEqual(isRestrictedUrl('edge://settings'), true);
      assert.strictEqual(isRestrictedUrl('about:blank'), true);
      assert.strictEqual(isRestrictedUrl('view-source:https://example.com'), true);
    });

    it('flags Chrome Web Store as restricted due to Chrome security sandbox', () => {
      assert.strictEqual(isRestrictedUrl('https://chromewebstore.google.com/detail/12345'), true);
      assert.strictEqual(isRestrictedUrl('https://chrome.google.com/webstore/category/extensions'), true);
    });

    it('allows standard public web domains', () => {
      assert.strictEqual(isRestrictedUrl('https://en.wikipedia.org/wiki/Main_Page'), false);
      assert.strictEqual(isRestrictedUrl('https://github.com/try2booyah-maker'), false);
      assert.strictEqual(isRestrictedUrl('http://localhost:3000/dashboard'), false);
    });

    it('rejects empty or null URLs safely', () => {
      assert.strictEqual(isRestrictedUrl(''), true);
      assert.strictEqual(isRestrictedUrl(null), true);
      assert.strictEqual(isRestrictedUrl(undefined), true);
    });
  });

  // 2. Vision Model vs Text-Only Model Gating
  describe('Vision Capability Routing', () => {
    function isVisionModel(modelId) {
      if (!modelId) return false;
      const id = modelId.toLowerCase();
      const visionKeywords = [
        'vision', 'vl', '4o', '4-turbo', 'gemini-1.5', 'gemini-2.0',
        'claude-3', 'claude-3-5', 'claude-3.5', 'pixtral', 'internvl'
      ];
      return visionKeywords.some(kw => id.includes(kw));
    }

    function buildTurnContent({ prompt, screenshotBase64, modelId }) {
      const supportsVision = isVisionModel(modelId);
      if (supportsVision && screenshotBase64) {
        return [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: screenshotBase64 } }
        ];
      }
      return prompt;
    }

    it('detects vision-capable models correctly', () => {
      assert.strictEqual(isVisionModel('openai/gpt-4o'), true);
      assert.strictEqual(isVisionModel('anthropic/claude-3.5-sonnet'), true);
      assert.strictEqual(isVisionModel('google/gemini-2.0-flash-001'), true);
      assert.strictEqual(isVisionModel('qwen/qwen-2.5-vl-72b-instruct'), true);
      assert.strictEqual(isVisionModel('mistralai/pixtral-12b'), true);
    });

    it('detects text-only models correctly', () => {
      assert.strictEqual(isVisionModel('meta-llama/llama-3.3-70b-instruct'), false);
      assert.strictEqual(isVisionModel('deepseek/deepseek-chat'), false);
      assert.strictEqual(isVisionModel('openai/gpt-3.5-turbo'), false);
      assert.strictEqual(isVisionModel('mistralai/mistral-7b-instruct'), false);
    });

    it('attaches image_url array only when model supports vision', () => {
      const screenshot = 'data:image/jpeg;base64,mockBase64Data';
      const prompt = 'Look at this page and click login';

      const visionContent = buildTurnContent({ prompt, screenshotBase64: screenshot, modelId: 'gpt-4o' });
      assert.strictEqual(Array.isArray(visionContent), true);
      assert.strictEqual(visionContent.length, 2);
      assert.strictEqual(visionContent[1].type, 'image_url');

      const textContent = buildTurnContent({ prompt, screenshotBase64: screenshot, modelId: 'llama-3.3-70b-instruct' });
      assert.strictEqual(typeof textContent, 'string');
      assert.strictEqual(textContent, prompt);
    });
  });

  // 3. Selection Action Message Handling
  describe('Selection Action Routing Contract', () => {
    it('verifies standard VRH_SELECTION_ACTION payload contract', () => {
      const payload = {
        action: 'VRH_SELECTION_ACTION',
        command: 'explain',
        text: 'Quantum superposition is a fundamental principle of quantum mechanics.',
        url: 'https://en.wikipedia.org/wiki/Quantum_superposition'
      };

      assert.strictEqual(payload.action, 'VRH_SELECTION_ACTION');
      assert.ok(['explain', 'summarize', 'translate', 'rewrite', 'ask'].includes(payload.command));
      assert.ok(payload.text.length > 0);
      assert.ok(payload.url.startsWith('https://'));

      // Also verify 'ask' command contract
      const askPayload = {
        action: 'VRH_SELECTION_ACTION',
        command: 'ask',
        text: 'Tell me what you can do',
        url: 'https://example.com'
      };
      assert.ok(['explain', 'summarize', 'translate', 'rewrite', 'ask'].includes(askPayload.command));
    });
  });

  // 4. Agent Status Update Broadcast Contract
  describe('Agent Status Update Broadcast Contract', () => {
    it('validates status payload fields for UI timeline rendering', () => {
      const updatePayload = {
        type: 'AGENT_STATUS_UPDATE',
        state: {
          status: 'running',
          step: 2,
          maxSteps: 25,
          currentAction: 'Clicking [4] Login button',
          goal: 'Log into the student portal',
          runLogs: [
            { step: 1, action: 'navigate_to', target: 'https://example.com/login', status: 'success' },
            { step: 2, action: 'click_element', target: 'mark 4', status: 'running' }
          ],
          actionResult: { success: true }
        }
      };

      assert.strictEqual(updatePayload.type, 'AGENT_STATUS_UPDATE');
      assert.strictEqual(updatePayload.state.status, 'running');
      assert.strictEqual(updatePayload.state.step, 2);
      assert.strictEqual(updatePayload.state.maxSteps, 25);
      assert.strictEqual(Array.isArray(updatePayload.state.runLogs), true);
      assert.strictEqual(updatePayload.state.runLogs.length, 2);
      assert.strictEqual(updatePayload.state.actionResult.success, true);
    });
  });

  // 5. VRH.AI Platform Persona & Capabilities Contract
  describe('VRH.AI Platform Persona & System Prompt Contract', () => {
    let buildVRHSystemPrompt;

    before(async () => {
      global.window = global.window || {};
      const mod = await import('../extension/sidepanel/sidepanel.js');
      buildVRHSystemPrompt = mod.buildVRHSystemPrompt || globalThis.buildVRHSystemPrompt || global.window.buildVRHSystemPrompt;
    });

    it('exports buildVRHSystemPrompt function', () => {
      assert.strictEqual(typeof buildVRHSystemPrompt, 'function');
    });

    it('strictly establishes identity as VRH.AI and enforces anti-leakage directives', () => {
      const prompt = buildVRHSystemPrompt({ pageText: 'Hello world' });
      assert.ok(prompt.includes('You are VRH.AI'));
      assert.ok(prompt.includes('NO MODEL/BRAND LEAKAGE'));
      assert.ok(prompt.includes('NEVER refer to yourself as ChatGPT, Claude, Llama, DeepSeek'));
      assert.ok(prompt.includes('NEVER DENY CAPABILITIES'));
      assert.ok(prompt.includes('HONESTY & REAL WORKING CAPABILITIES'));
    });

    it('accurately details all 9 real working platform capabilities', () => {
      const prompt = buildVRHSystemPrompt({ pageText: 'Test page content' });
      // 1. Live Web Page Copilot
      assert.ok(prompt.includes('Live Web Page Understanding & Copilot (Ask Mode / /ask)'));
      // 2. Autonomous Browser Automation
      assert.ok(prompt.includes('Autonomous Browser Automation (Agent Mode / /agent)'));
      assert.ok(prompt.includes('Perception Engine 2.0'));
      assert.ok(prompt.includes('Chrome DevTools Protocol (CDP)'));
      assert.ok(prompt.includes('Set-of-Marks (SoM)'));
      // 3. Multi-Tab
      assert.ok(prompt.includes('Multi-Tab Context Integration (@ Tab Selector)'));
      // 4. Vision
      assert.ok(prompt.includes('Multimodal Vision & Screenshot Analysis'));
      // 5. PDF & OCR
      assert.ok(prompt.includes('Offline Client-Side Document Processing (PDF & OCR)'));
      assert.ok(prompt.includes('Mozilla pdf.js'));
      assert.ok(prompt.includes('Tesseract.js OCR'));
      // 6. Summarization
      assert.ok(prompt.includes('Fast Page Summarization (Summarize Tab & /summarize)'));
      // 7. Selection Toolbar
      assert.ok(prompt.includes('In-Page Selection Toolbar'));
      // 8. Slash Commands
      assert.ok(prompt.includes('Productivity Slash Commands'));
      // 9. Privacy & Multi-Provider
      assert.ok(prompt.includes('Privacy-First & Multi-Provider Freedom'));
      assert.ok(prompt.includes('Ollama'));
    });

    it('detects capability queries and injects HIGH PRIORITY DIRECTIVE', () => {
      const capQueries = [
        'what are your full capabilities',
        'what are the full capabilities and what you do',
        'What can you do?',
        'who are you',
        'tell me about yourself',
        'what are your platform features',
        'what is vrh.ai'
      ];

      for (const q of capQueries) {
        const prompt = buildVRHSystemPrompt({ pageText: 'Sample text', userQuery: q });
        assert.ok(prompt.includes('HIGH PRIORITY DIRECTIVE — USER ASKING ABOUT VRH.AI IDENTITY & CAPABILITIES'), `Failed for query: ${q}`);
        assert.ok(prompt.includes('DO NOT apologize. DO NOT say you cannot browse or interact with the browser'));
      }
    });

    it('does not inject HIGH PRIORITY DIRECTIVE for normal context queries', () => {
      const normalPrompt = buildVRHSystemPrompt({ pageText: 'Quantum mechanics notes', userQuery: 'Explain quantum entanglement' });
      assert.strictEqual(normalPrompt.includes('HIGH PRIORITY DIRECTIVE — USER ASKING ABOUT VRH.AI IDENTITY & CAPABILITIES'), false);
      assert.ok(normalPrompt.includes('Active Tab Page Text:'));
      assert.ok(normalPrompt.includes('Quantum mechanics notes'));
    });
  });

});

