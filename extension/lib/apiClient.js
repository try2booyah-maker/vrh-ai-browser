/**
 * VRH.AI API Client Module
 * Centralized LLM API communication with exponential backoff retry, jitter,
 * Retry-After header support, and cancellable AbortSignal handling.
 *
 * USAGE:
 *   apiClient.stream(apiKey, model, messages, onChunk, signal, options)  — streaming chat completion
 *   apiClient.complete(apiKey, model, messages, tools, signal, options)  — non-streaming chat completion
 *   apiClient.fetchModels(apiKey, signal, options)                       — fetch available models
 *   apiClient.fetchWithRetry(url, options, retryConfig)                  — resilient fetch with backoff
 */

const API_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
const MODELS_ENDPOINT = 'https://openrouter.ai/api/v1/models';

const API_HEADERS = {
  'Content-Type': 'application/json',
  'HTTP-Referer': 'https://vrh.ai',
  'X-Title': 'VRH.AI Chrome Copilot'
};

function getHeaders(apiKey) {
  const h = { ...API_HEADERS };
  if (apiKey) {
    h['Authorization'] = `Bearer ${apiKey.trim()}`;
  }
  return h;
}

/**
 * Cleanly sleeps for `ms` milliseconds while respecting an AbortSignal.
 * Cleans up the timer immediately if aborted, avoiding dangling timers.
 * @param {number} ms
 * @param {AbortSignal} [signal]
 * @returns {Promise<void>}
 */
function sleepWithSignal(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      const err = new Error('Request aborted');
      err.name = 'AbortError';
      return reject(err);
    }
    let timer = null;
    const onAbort = () => {
      if (timer) clearTimeout(timer);
      const err = new Error('Request aborted');
      err.name = 'AbortError';
      reject(err);
    };
    timer = setTimeout(() => {
      if (signal) signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    if (signal) {
      signal.addEventListener('abort', onAbort, { once: true });
    }
  });
}

/**
 * Parses Retry-After header value into milliseconds delay.
 * Returns null if not present or invalid.
 * @param {string|null} headerValue
 * @returns {number|null} delay in ms
 */
function parseRetryAfter(headerValue) {
  if (!headerValue) return null;
  const trimmed = headerValue.trim();
  // Check if it's integer seconds (e.g. "5", "120")
  if (/^\d+$/.test(trimmed)) {
    return parseInt(trimmed, 10) * 1000;
  }
  // Try HTTP-date format (e.g. "Wed, 21 Oct 2026 07:28:00 GMT")
  const dateMs = Date.parse(trimmed);
  if (!isNaN(dateMs)) {
    const diff = dateMs - Date.now();
    return Math.max(0, diff);
  }
  return null;
}

/**
 * Calculates exponential backoff delay with ±20% jitter.
 * @param {number} attempt - 0-indexed attempt count
 * @param {number} baseDelayMs - default 500
 * @param {number} factor - default 2
 * @param {number} jitterFraction - default 0.2 (±20%)
 * @returns {number} delay in ms
 */
function calculateBackoffDelay(attempt, baseDelayMs = 500, factor = 2, jitterFraction = 0.2) {
  const base = baseDelayMs * Math.pow(factor, attempt);
  const jitterRange = base * jitterFraction * 2;
  const jitter = Math.random() * jitterRange - (base * jitterFraction);
  return Math.max(0, Math.round(base + jitter));
}

/**
 * Fetch wrapper with exponential backoff, jitter, Retry-After header parsing,
 * and AbortSignal cancellation support.
 * Retries on HTTP 429, 5xx, and network-level fetch rejections.
 * Fails immediately without retry on other 4xx (e.g. 401, 400, 403).
 *
 * @param {string} url
 * @param {RequestInit} [options]
 * @param {Object} [retryConfig]
 * @param {number} [retryConfig.maxRetries=3]
 * @param {number} [retryConfig.baseDelayMs=500]
 * @param {number} [retryConfig.factor=2]
 * @param {number} [retryConfig.jitterFraction=0.2]
 * @returns {Promise<Response>}
 */
async function fetchWithRetry(url, options = {}, retryConfig = {}) {
  const maxRetries = typeof retryConfig.maxRetries === 'number' ? retryConfig.maxRetries : 3;
  const baseDelayMs = typeof retryConfig.baseDelayMs === 'number' ? retryConfig.baseDelayMs : 500;
  const factor = typeof retryConfig.factor === 'number' ? retryConfig.factor : 2;
  const jitterFraction = typeof retryConfig.jitterFraction === 'number' ? retryConfig.jitterFraction : 0.2;
  const signal = options.signal;

  let attempt = 0;
  let lastStatus = null;

  while (attempt <= maxRetries) {
    if (signal?.aborted) {
      const err = new Error('Request aborted');
      err.name = 'AbortError';
      throw err;
    }

    let res = null;
    let networkError = null;

    try {
      res = await fetch(url, options);
    } catch (err) {
      if (err.name === 'AbortError' || signal?.aborted) {
        throw err;
      }
      networkError = err;
    }

    // Case 1: Network-level fetch rejection (TypeError: Failed to fetch, DNS, offline)
    if (networkError) {
      if (attempt < maxRetries) {
        const delay = calculateBackoffDelay(attempt, baseDelayMs, factor, jitterFraction);
        attempt++;
        console.warn(`[VRH.AI apiClient] Network error: ${networkError.message}. Retrying in ${delay}ms (attempt ${attempt}/${maxRetries})...`);
        await sleepWithSignal(delay, signal);
        continue;
      } else {
        throw new Error(`Request still failing after ${maxRetries} retries: Network error (${networkError.message})`);
      }
    }

    // Case 2: Successful response (2xx)
    if (res.ok) {
      return res;
    }

    // Case 3: Retryable HTTP status (429 Too Many Requests or 5xx Server Error)
    lastStatus = res.status;
    if (res.status === 429 || (res.status >= 500 && res.status < 600)) {
      if (attempt < maxRetries) {
        const retryAfterHeader = res.headers ? res.headers.get('retry-after') : null;
        const retryAfterMs = parseRetryAfter(retryAfterHeader);
        const delay = retryAfterMs !== null ? retryAfterMs : calculateBackoffDelay(attempt, baseDelayMs, factor, jitterFraction);

        attempt++;
        console.warn(`[VRH.AI apiClient] HTTP ${res.status} from ${url}. Retrying in ${delay}ms (attempt ${attempt}/${maxRetries})...`);
        await sleepWithSignal(delay, signal);
        continue;
      } else {
        const errJson = await res.json().catch(() => ({}));
        const detail = errJson.error?.message || errJson.error?.metadata?.raw || res.statusText || 'Rate limit or server error';
        throw new Error(`Request still failing after ${maxRetries} retries: HTTP ${res.status} (${detail})`);
      }
    }

    // Case 4: Non-retryable HTTP status (4xx client errors like 401, 400, 403, 404)
    const errData = await res.json().catch(() => ({}));
    const rawMsg = errData.error?.message || errData.error?.metadata?.raw || '';

    if (res.status === 401) {
      throw new Error(`Authentication failed (HTTP 401): Invalid or missing API key. Please check your provider settings. ${rawMsg}`.trim());
    }
    if (res.status === 403) {
      throw new Error(`Access forbidden (HTTP 403): Your API key does not have permission for this model or feature. ${rawMsg}`.trim());
    }
    if (res.status === 400) {
      throw new Error(`Bad request (HTTP 400): ${rawMsg || 'The model may not support the requested parameters.'}`);
    }
    if (res.status === 404) {
      throw new Error(`Not found (HTTP 404): ${rawMsg || 'The specified endpoint or model does not exist.'}`);
    }

    throw new Error(`API error (HTTP ${res.status}): ${rawMsg || res.statusText || 'Unknown error'}`);
  }

  throw new Error(`Request still failing after ${maxRetries} retries: HTTP ${lastStatus || 'Unknown'}`);
}

// Sanitize messages for the API (strip non-standard fields, preserve multimodal blocks)
function sanitizeMessages(messages) {
  if (!Array.isArray(messages)) return [];
  return messages.map(m => {
    let content = m.content;
    if (Array.isArray(m.content)) {
      content = m.content.map(part => {
        if (part && part.type === 'image_url') {
          return {
            type: 'image_url',
            image_url: {
              url: part.image_url?.url || part.image_url || ''
            }
          };
        }
        if (part && part.type === 'text') {
          return {
            type: 'text',
            text: part.text || ''
          };
        }
        return part;
      });
    } else {
      content = m.content || '';
    }

    const sanitized = {
      role: m.role,
      content
    };
    if (m.name) sanitized.name = m.name;
    if (m.tool_calls) sanitized.tool_calls = m.tool_calls;
    if (m.tool_call_id) sanitized.tool_call_id = m.tool_call_id;
    return sanitized;
  });
}

/**
 * Checks if a model supports multimodal/vision image input.
 * Inspects OpenRouter architecture metadata and model naming heuristics.
 * @param {string} modelId
 * @param {Object} [modelMetadata]
 * @returns {boolean}
 */
function isVisionModel(modelId, modelMetadata = null) {
  if (!modelId) return false;
  const id = modelId.toLowerCase();

  if (modelMetadata) {
    const arch = modelMetadata.architecture || {};
    const modality = (arch.modality || '').toLowerCase();
    const inputs = Array.isArray(arch.input_modalities)
      ? arch.input_modalities.map(m => String(m).toLowerCase())
      : [];
    if (modality.includes('image') || inputs.includes('image')) {
      return true;
    }
  }

  // Common vision models heuristic
  return /vision|gpt-4o|gemini|claude-3|qwen-?vl|pixtral|llava|-vl\b/i.test(id);
}

/**
 * Builds a multimodal chat completion message object.
 * @param {string} role - 'user' | 'assistant' | 'system'
 * @param {string} text - text prompt or question
 * @param {string[]} [imageUrls] - array of data URIs or image URLs
 * @returns {Object}
 */
function buildMultimodalMessage(role, text, imageUrls = []) {
  if (!imageUrls || imageUrls.length === 0) {
    return { role, content: text || '' };
  }

  const content = [];
  if (text) {
    content.push({ type: 'text', text });
  }
  for (const url of imageUrls) {
    if (url) {
      content.push({
        type: 'image_url',
        image_url: { url }
      });
    }
  }
  return { role, content };
}

const apiClient = {
  fetchWithRetry,
  sleepWithSignal,
  calculateBackoffDelay,
  parseRetryAfter,
  isVisionModel,
  buildMultimodalMessage,
  sanitizeMessages,

  /**
   * Streaming chat completion with backoff retry on 429/5xx.
   * @param {string} apiKey
   * @param {string} model
   * @param {Array} messages
   * @param {Function} onChunk - callback receiving accumulated fullText
   * @param {AbortSignal} [signal]
   * @param {Object} [options] - optional { endpoint, headers, retryConfig }
   * @returns {Promise<string>} full response text
   */
  async stream(apiKey, model, messages, onChunk, signal, options = {}) {
    const sanitized = sanitizeMessages(messages);
    const endpoint = options.endpoint || API_ENDPOINT;
    const headers = options.headers || getHeaders(apiKey);

    const res = await fetchWithRetry(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({ model, messages: sanitized, stream: true, max_tokens: 2048 }),
      signal
    }, options.retryConfig);

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
   * Non-streaming chat completion with backoff retry on 429/5xx.
   * Auto-retries without tools if the first attempt fails with tools.
   * @param {string} apiKey
   * @param {string} model
   * @param {Array} messages
   * @param {Array|null} tools
   * @param {AbortSignal} [signal]
   * @param {Object} [options] - optional { endpoint, headers, retryConfig }
   * @returns {Promise<Object>} the assistant message object
   */
  async complete(apiKey, model, messages, tools, signal, options = {}) {
    const sanitized = sanitizeMessages(messages);
    const endpoint = options.endpoint || API_ENDPOINT;
    const headers = options.headers || getHeaders(apiKey);
    const payload = { model, messages: sanitized, max_tokens: 2048 };
    if (tools) payload.tools = tools;

    let res;
    try {
      res = await fetchWithRetry(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal
      }, options.retryConfig);
    } catch (err) {
      // Auto-retry without tools for simpler models if tool-calling failed
      if (tools && !err.name?.includes('Abort') && !err.message?.includes('401')) {
        console.warn("Model failed tool call, retrying without tools...", err.message);
        delete payload.tools;
        res = await fetchWithRetry(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
          signal
        }, options.retryConfig);
      } else {
        throw err;
      }
    }

    const data = await res.json();
    const message = data.choices[0].message;
    if (message.reasoning_content || message.reasoning) {
      const reason = message.reasoning_content || message.reasoning;
      message.content = `<think>${reason}</think>${message.content || ''}`;
    }
    return message;
  },

  /**
   * Fetch available models from OpenRouter or custom endpoint with backoff retry.
   * @param {string} apiKey
   * @param {AbortSignal} [signal]
   * @param {Object} [options] - optional { endpoint, headers, retryConfig }
   * @returns {Promise<Array>} sorted array of {id, name, ...} objects
   */
  async fetchModels(apiKey, signal, options = {}) {
    const endpoint = options.endpoint || MODELS_ENDPOINT;
    const headers = options.headers || getHeaders(apiKey);

    const res = await fetchWithRetry(endpoint, {
      headers,
      signal
    }, options.retryConfig);

    const data = await res.json();
    const list = data?.data || data?.models || (Array.isArray(data) ? data : null);
    if (list && Array.isArray(list)) {
      return list
        .map(m => {
          if (typeof m === 'string') return { id: m, name: m };
          const id = m.id || m.name || m.model;
          if (!id) return null;
          return {
            id,
            name: m.name || id,
            description: m.description || '',
            context_length: m.context_length || null,
            architecture: m.architecture || null,
            pricing: m.pricing || null
          };
        })
        .filter(Boolean)
        .sort((a, b) => a.name.localeCompare(b.name));
    }
    throw new Error('Unexpected response format from models API');
  }
};

if (typeof window !== 'undefined') {
  window.apiClient = apiClient;
  window.fetchWithRetry = fetchWithRetry;
  window.sleepWithSignal = sleepWithSignal;
  window.isVisionModel = isVisionModel;
  window.buildMultimodalMessage = buildMultimodalMessage;
}
if (typeof globalThis !== 'undefined') {
  globalThis.apiClient = apiClient;
  globalThis.fetchWithRetry = fetchWithRetry;
  globalThis.sleepWithSignal = sleepWithSignal;
  globalThis.isVisionModel = isVisionModel;
  globalThis.buildMultimodalMessage = buildMultimodalMessage;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    apiClient,
    fetchWithRetry,
    sleepWithSignal,
    calculateBackoffDelay,
    parseRetryAfter,
    isVisionModel,
    buildMultimodalMessage
  };
}
