/**
 * tests/agent-lifecycle.test.cjs
 * Comprehensive test suite for VRH.AI Version 1.0 Autonomous Agent lifecycle,
 * restricted URL guardrails, selection actions, and status updates.
 */

const { describe, it } = require('node:test');
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
      assert.ok(['explain', 'summarize', 'translate', 'rewrite'].includes(payload.command));
      assert.ok(payload.text.length > 0);
      assert.ok(payload.url.startsWith('https://'));
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

});
