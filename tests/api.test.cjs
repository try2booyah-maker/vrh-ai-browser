/**
 * API Client & Backoff Retry Test Suite (Phase 1.3)
 * Tests exponential backoff, ±20% jitter, Retry-After header parsing,
 * 429/5xx retry exhaustion, 401 immediate failure, and AbortSignal cancellation.
 */
const { test, describe, before, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');

describe('LLM API Retry & Backoff Tests (Phase 1.3)', async () => {
  let apiClient;
  let fetchWithRetry;
  let sleepWithSignal;
  let calculateBackoffDelay;
  let parseRetryAfter;
  let originalFetch;

  before(async () => {
    // Provide global window / globalThis for module loading
    global.window = global.window || {};
    await import('../extension/lib/apiClient.js');
    apiClient = global.globalThis.apiClient || global.window.apiClient;
    fetchWithRetry = apiClient.fetchWithRetry;
    sleepWithSignal = apiClient.sleepWithSignal;
    calculateBackoffDelay = apiClient.calculateBackoffDelay;
    parseRetryAfter = apiClient.parseRetryAfter;
  });

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  test('calculateBackoffDelay produces exponential delays within ±20% jitter bounds', () => {
    // Attempt 0: base 500ms, ±20% -> [400, 600]
    for (let i = 0; i < 20; i++) {
      const d0 = calculateBackoffDelay(0, 500, 2, 0.2);
      assert(d0 >= 400 && d0 <= 600, `Attempt 0 delay ${d0} out of bounds [400, 600]`);
    }

    // Attempt 1: base 1000ms, ±20% -> [800, 1200]
    for (let i = 0; i < 20; i++) {
      const d1 = calculateBackoffDelay(1, 500, 2, 0.2);
      assert(d1 >= 800 && d1 <= 1200, `Attempt 1 delay ${d1} out of bounds [800, 1200]`);
    }

    // Attempt 2: base 2000ms, ±20% -> [1600, 2400]
    for (let i = 0; i < 20; i++) {
      const d2 = calculateBackoffDelay(2, 500, 2, 0.2);
      assert(d2 >= 1600 && d2 <= 2400, `Attempt 2 delay ${d2} out of bounds [1600, 2400]`);
    }
  });

  test('parseRetryAfter parses integer seconds and HTTP-date strings correctly', () => {
    assert.strictEqual(parseRetryAfter('5'), 5000);
    assert.strictEqual(parseRetryAfter('120'), 120000);
    assert.strictEqual(parseRetryAfter(null), null);
    assert.strictEqual(parseRetryAfter(''), null);

    // Future HTTP date
    const future = new Date(Date.now() + 10000).toUTCString();
    const parsed = parseRetryAfter(future);
    assert(parsed !== null && parsed > 5000 && parsed <= 11000, `Expected ~10000ms, got ${parsed}`);
  });

  test('Immediate failure on HTTP 401 (Invalid API Key) with 0 retries', async () => {
    let callCount = 0;
    global.fetch = async () => {
      callCount++;
      return {
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ error: { message: 'Invalid API key provided' } })
      };
    };

    await assert.rejects(
      async () => {
        await fetchWithRetry('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer bad-key' }
        }, { maxRetries: 3, baseDelayMs: 10 });
      },
      (err) => {
        assert(err.message.includes('Authentication failed (HTTP 401)'), `Expected 401 message, got: ${err.message}`);
        assert(err.message.includes('Invalid API key provided'));
        return true;
      }
    );

    // Must fail on first attempt with 0 retries!
    assert.strictEqual(callCount, 1, 'HTTP 401 must not trigger retries');
  });

  test('Immediate failure on HTTP 400 (Bad Request) with 0 retries', async () => {
    let callCount = 0;
    global.fetch = async () => {
      callCount++;
      return {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({ error: { message: 'Unsupported parameter' } })
      };
    };

    await assert.rejects(
      async () => {
        await fetchWithRetry('https://openrouter.ai/api/v1/chat/completions', {}, { maxRetries: 3, baseDelayMs: 10 });
      },
      (err) => {
        assert(err.message.includes('Bad request (HTTP 400)'));
        return true;
      }
    );

    assert.strictEqual(callCount, 1, 'HTTP 400 must not trigger retries');
  });

  test('HTTP 429 exhausts retries and surfaces "still failing after retries" error', async () => {
    let callCount = 0;
    global.fetch = async () => {
      callCount++;
      return {
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        headers: new Map([['retry-after', '1']]),
        json: async () => ({ error: { message: 'Rate limit exceeded' } })
      };
    };

    await assert.rejects(
      async () => {
        // Use small baseDelayMs for fast test execution
        await fetchWithRetry('https://openrouter.ai/api/v1/chat/completions', {}, {
          maxRetries: 3,
          baseDelayMs: 10,
          factor: 2,
          jitterFraction: 0.1
        });
      },
      (err) => {
        assert(err.message.includes('still failing after 3 retries'), `Expected exhaustion message, got: ${err.message}`);
        assert(err.message.includes('HTTP 429'));
        assert(err.message.includes('Rate limit exceeded'));
        return true;
      }
    );

    // Initial attempt + 3 retries = 4 attempts total
    assert.strictEqual(callCount, 4, 'Expected initial attempt + 3 retries (total 4 calls)');
  });

  test('Successful retry after temporary 429/500 error', async () => {
    let callCount = 0;
    global.fetch = async () => {
      callCount++;
      if (callCount < 3) {
        return {
          ok: false,
          status: 429,
          statusText: 'Rate Limit',
          headers: new Map(),
          json: async () => ({ error: { message: 'Too many requests' } })
        };
      }
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({ choices: [{ message: { content: 'Success!' } }] })
      };
    };

    const res = await fetchWithRetry('https://openrouter.ai/api/v1/chat/completions', {}, {
      maxRetries: 3,
      baseDelayMs: 10
    });

    assert.strictEqual(res.ok, true);
    assert.strictEqual(callCount, 3, 'Should succeed on the 3rd attempt');
    const data = await res.json();
    assert.strictEqual(data.choices[0].message.content, 'Success!');
  });

  test('AbortSignal cancels mid-retry without dangling timers', async () => {
    const controller = new AbortController();
    let callCount = 0;

    global.fetch = async () => {
      callCount++;
      return {
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        headers: new Map(),
        json: async () => ({})
      };
    };

    // Abort after 30ms while waiting in retry backoff
    setTimeout(() => {
      controller.abort();
    }, 30);

    const startTime = Date.now();
    await assert.rejects(
      async () => {
        await fetchWithRetry('https://openrouter.ai/api/v1/chat/completions', {
          signal: controller.signal
        }, {
          maxRetries: 3,
          baseDelayMs: 1000 // Long delay that should be interrupted by abort
        });
      },
      (err) => {
        assert(err.name === 'AbortError' || err.message.includes('aborted'), `Expected AbortError, got: ${err.message}`);
        return true;
      }
    );

    const elapsed = Date.now() - startTime;
    assert(elapsed < 500, `Abort should interrupt immediately, took ${elapsed}ms`);
    assert(callCount < 4, `Should not execute further attempts after abort; ran ${callCount} times`);
  });
});
