const { describe, it, before } = require('node:test');
const assert = require('node:assert');

describe('Phase 3.1: Vision / Multimodal Input & Gating', () => {
  let isVisionModel;
  let buildMultimodalMessage;
  let apiClient;

  before(async () => {
    global.window = global.window || {};
    const mod = await import('../extension/lib/apiClient.js');
    apiClient = mod.apiClient || global.globalThis.apiClient || global.window.apiClient;
    isVisionModel = mod.isVisionModel || apiClient.isVisionModel;
    buildMultimodalMessage = mod.buildMultimodalMessage || apiClient.buildMultimodalMessage;
  });
  it('should detect vision models by naming convention and heuristics', () => {
    assert.strictEqual(isVisionModel('openai/gpt-4o'), true);
    assert.strictEqual(isVisionModel('gpt-4o-mini'), true);
    assert.strictEqual(isVisionModel('google/gemini-2.0-flash-001'), true);
    assert.strictEqual(isVisionModel('anthropic/claude-3-5-sonnet'), true);
    assert.strictEqual(isVisionModel('qwen/qwen-2-vl-72b-instruct'), true);
    assert.strictEqual(isVisionModel('mistralai/pixtral-12b'), true);
    assert.strictEqual(isVisionModel('llava-hf/llava-1.5-7b-hf'), true);
  });

  it('should detect vision models via architecture metadata', () => {
    const metaWithImageInput = {
      architecture: {
        modality: 'multimodal',
        input_modalities: ['text', 'image']
      }
    };
    assert.strictEqual(isVisionModel('custom-model-x', metaWithImageInput), true);

    const metaWithTextOnly = {
      architecture: {
        modality: 'text->text',
        input_modalities: ['text']
      }
    };
    assert.strictEqual(isVisionModel('custom-model-x', metaWithTextOnly), false);
  });

  it('should identify non-vision models as false', () => {
    assert.strictEqual(isVisionModel('openai/gpt-3.5-turbo'), false);
    assert.strictEqual(isVisionModel('deepseek/deepseek-chat'), false);
    assert.strictEqual(isVisionModel('meta-llama/llama-3-8b-instruct'), false);
    assert.strictEqual(isVisionModel('mistralai/mistral-7b-instruct'), false);
    assert.strictEqual(isVisionModel(''), false);
    assert.strictEqual(isVisionModel(null), false);
  });

  it('should build multimodal message structure with text and image_url parts', () => {
    const dataUri = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const msg = buildMultimodalMessage('user', 'What is this screenshot?', [dataUri]);

    assert.strictEqual(msg.role, 'user');
    assert.ok(Array.isArray(msg.content));
    assert.strictEqual(msg.content.length, 2);
    assert.deepStrictEqual(msg.content[0], { type: 'text', text: 'What is this screenshot?' });
    assert.deepStrictEqual(msg.content[1], {
      type: 'image_url',
      image_url: { url: dataUri }
    });
  });

  it('should return simple text content when no images are provided', () => {
    const msg = buildMultimodalMessage('user', 'Hello world', []);
    assert.strictEqual(msg.role, 'user');
    assert.strictEqual(msg.content, 'Hello world');
  });

  it('should preserve multimodal message blocks through apiClient.sanitizeMessages', () => {
    const dataUri = 'data:image/png;base64,abc123xyz';
    const rawMessages = [
      { role: 'system', content: 'You are an assistant' },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Analyze this image' },
          { type: 'image_url', image_url: { url: dataUri } }
        ]
      }
    ];

    const sanitized = apiClient.sanitizeMessages(rawMessages);
    assert.strictEqual(sanitized.length, 2);
    assert.strictEqual(sanitized[0].role, 'system');
    assert.strictEqual(sanitized[0].content, 'You are an assistant');

    assert.strictEqual(sanitized[1].role, 'user');
    assert.ok(Array.isArray(sanitized[1].content));
    assert.strictEqual(sanitized[1].content[0].type, 'text');
    assert.strictEqual(sanitized[1].content[0].text, 'Analyze this image');
    assert.strictEqual(sanitized[1].content[1].type, 'image_url');
    assert.strictEqual(sanitized[1].content[1].image_url.url, dataUri);
  });
});

describe('Phase 3.2: Multi-Tab Context Aggregation', () => {
  function computeTabBudgets(tabCount, totalBudget = 75000) {
    if (tabCount <= 0) return 0;
    if (tabCount <= 2) return 30000;
    return Math.max(10000, Math.floor(totalBudget / tabCount));
  }

  function formatTabSection(title, url, text, cap) {
    const trimmed = (text || '').trim().substring(0, cap);
    return `=== TAB: ${title || 'Untitled Tab'} (${url || ''}) ===\n${trimmed}`;
  }

  it('should calculate proportional character budget per tab', () => {
    assert.strictEqual(computeTabBudgets(1), 30000);
    assert.strictEqual(computeTabBudgets(2), 30000);
    assert.strictEqual(computeTabBudgets(3), 25000); // 75000 / 3
    assert.strictEqual(computeTabBudgets(4), 18750); // 75000 / 4
    assert.strictEqual(computeTabBudgets(5), 15000); // 75000 / 5
    assert.strictEqual(computeTabBudgets(8), 10000); // min cap 10000
  });

  it('should assemble labeled sections with distinct headers and contents', () => {
    const tabs = [
      { id: 1, title: 'Google Search', url: 'https://google.com', text: 'Search results for AI agents' },
      { id: 2, title: 'GitHub Repo', url: 'https://github.com/vrh', text: 'Autonomous Chrome Extension' },
      { id: 3, title: 'Wikipedia', url: 'https://wikipedia.org/wiki/Browser', text: 'A web browser is application software' }
    ];

    const cap = computeTabBudgets(tabs.length);
    const sections = tabs.map(t => formatTabSection(t.title, t.url, t.text, cap));
    const combined = sections.join('\n\n');

    assert.ok(combined.includes('=== TAB: Google Search (https://google.com) ==='));
    assert.ok(combined.includes('Search results for AI agents'));
    assert.ok(combined.includes('=== TAB: GitHub Repo (https://github.com/vrh) ==='));
    assert.ok(combined.includes('Autonomous Chrome Extension'));
    assert.ok(combined.includes('=== TAB: Wikipedia (https://wikipedia.org/wiki/Browser) ==='));
    assert.ok(combined.includes('A web browser is application software'));

    // Verify each section has clear boundaries
    const parsedSections = combined.split('\n\n=== TAB: ');
    assert.strictEqual(parsedSections.length, 3);
  });
});
