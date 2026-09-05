/**
 * VRH.AI API Client Module
 * Centralized OpenRouter API communication with shared headers, error handling,
 * and AbortSignal support. Used by both sidepanel.js and settings.js.
 *
 * USAGE:
 *   apiClient.stream(messages, onChunk, signal)  — streaming chat completion
 *   apiClient.complete(messages, tools, signal)   — non-streaming chat completion
 *   apiClient.fetchModels(apiKey, signal)          — fetch available models
 */

const API_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
const MODELS_ENDPOINT = 'https://openrouter.ai/api/v1/models';

const API_HEADERS = {
  'Content-Type': 'application/json',
  'HTTP-Referer': 'https://vrh.ai',
  'X-Title': 'VRH.AI Chrome Copilot'
};

function getHeaders(apiKey) {
  return {
    ...API_HEADERS,
    'Authorization': `Bearer ${apiKey}`
  };
}

async function handleApiError(res) {
  const e = await res.json().catch(() => ({}));
  const errMsg = e.error?.message || e.error?.metadata?.raw || `API Error (${res.status})`;
  throw new Error(errMsg);
}

// Sanitize messages for the API (strip non-standard fields)
function sanitizeMessages(messages) {
  return messages.map(m => {
    const sanitized = {
      role: m.role,
      content: m.content || ''
    };
    if (m.name) sanitized.name = m.name;
    if (m.tool_calls) sanitized.tool_calls = m.tool_calls;
    if (m.tool_call_id) sanitized.tool_call_id = m.tool_call_id;
    return sanitized;
  });
}

const apiClient = {
  /**
   * Streaming chat completion.
   * @param {string} apiKey
   * @param {string} model
   * @param {Array} messages
   * @param {Function} onChunk - callback receiving accumulated fullText
   * @param {AbortSignal} [signal]
   * @param {Object} [options] - optional { endpoint, headers }
   * @returns {Promise<string>} full response text
   */
  async stream(apiKey, model, messages, onChunk, signal, options = {}) {
    const sanitized = sanitizeMessages(messages);
    const endpoint = options.endpoint || API_ENDPOINT;
    const headers = options.headers || getHeaders(apiKey);

    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({ model, messages: sanitized, stream: true, max_tokens: 2048 }),
      signal
    });

    if (!res.ok) await handleApiError(res);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    let buffer = '';
    let hasThinking = false;
    let closedThinking = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') break;
          try {
            const json = JSON.parse(data);
            const delta = json.choices?.[0]?.delta;
            if (delta) {
              let updated = false;
              const reason = delta.reasoning_content || delta.reasoning;
              if (reason) {
                if (!hasThinking) {
                  fullText += "<think>";
                  hasThinking = true;
                }
                fullText += reason;
                updated = true;
              }
              const content = delta.content;
              if (content) {
                if (hasThinking && !closedThinking) {
                  fullText += "</think>";
                  closedThinking = true;
                }
                fullText += content;
                updated = true;
              }
              if (updated && onChunk) {
                onChunk(fullText);
              }
            }
          } catch(e) { /* skip malformed SSE */ }
        }
      }
    }
    if (hasThinking && !closedThinking) {
      fullText += "</think>";
      if (onChunk) onChunk(fullText);
    }
    return fullText;
  },

  /**
   * Non-streaming chat completion (used by Agent Mode).
   * Auto-retries without tools if the first attempt fails with tools.
   * @param {string} apiKey
   * @param {string} model
   * @param {Array} messages
   * @param {Array|null} tools
   * @param {AbortSignal} [signal]
   * @param {Object} [options] - optional { endpoint, headers }
   * @returns {Promise<Object>} the assistant message object
   */
  async complete(apiKey, model, messages, tools, signal, options = {}) {
    const sanitized = sanitizeMessages(messages);
    const endpoint = options.endpoint || API_ENDPOINT;
    const headers = options.headers || getHeaders(apiKey);
    const payload = { model, messages: sanitized, max_tokens: 2048 };
    if (tools) payload.tools = tools;

    let res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal
    });

    // Auto-retry without tools for simpler models
    if (!res.ok && tools) {
      console.warn("Model failed tool call, retrying without tools...");
      delete payload.tools;
      res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal
      });
    }

    if (!res.ok) await handleApiError(res);

    const data = await res.json();
    const message = data.choices[0].message;
    if (message.reasoning_content || message.reasoning) {
      const reason = message.reasoning_content || message.reasoning;
      message.content = `<think>${reason}</think>${message.content || ''}`;
    }
    return message;
  },

  /**
   * Fetch available models from OpenRouter or custom endpoint.
   * @param {string} apiKey
   * @param {AbortSignal} [signal]
   * @param {Object} [options] - optional { endpoint, headers }
   * @returns {Promise<Array>} sorted array of {id, name} objects
   */
  async fetchModels(apiKey, signal, options = {}) {
    const endpoint = options.endpoint || MODELS_ENDPOINT;
    const headers = options.headers || getHeaders(apiKey);

    const res = await fetch(endpoint, {
      headers,
      signal
    });
    const data = await res.json();
    const list = data?.data || data?.models || (Array.isArray(data) ? data : null);
    if (list && Array.isArray(list)) {
      return list
        .map(m => {
          if (typeof m === 'string') return { id: m, name: m };
          const id = m.id || m.name || m.model;
          return id ? { id, name: m.name || id } : null;
        })
        .filter(Boolean)
        .sort((a, b) => a.name.localeCompare(b.name));
    }
    throw new Error('Unexpected response format from models API');
  }
};

// Make available globally
if (typeof window !== 'undefined') {
  window.apiClient = apiClient;
}
