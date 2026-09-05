/**
 * Security & Sanitization Test Suite
 * Tests DOMPurify integration, XSS payload stripping, and markdown rendering safety.
 */
const { test, describe, before } = require('node:test');
const assert = require('node:assert');
const { JSDOM } = require('jsdom');
const createDOMPurify = require('dompurify');

describe('DOMPurify Sanitization Tests (Phase 1.1)', async () => {
  let escapeHtml;
  let sanitizeHtml;

  before(async () => {
    // Setup JSDOM environment for DOMPurify
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    global.window = dom.window;
    global.document = dom.window.document;
    global.Node = dom.window.Node;

    // Load DOMPurify into window
    const purifier = createDOMPurify(dom.window);
    global.window.DOMPurify = purifier;
    global.DOMPurify = purifier;

    // Load sanitize.js as ES module into window
    await import('../extension/lib/sanitize.js');
    escapeHtml = global.window.escapeHtml;
    sanitizeHtml = global.window.sanitizeHtml;
  });

  test('escapeHtml escapes standard HTML entities', () => {
    assert.strictEqual(escapeHtml('<script>alert("1") & \'x\'</script>'), '&lt;script&gt;alert(&quot;1&quot;) &amp; &#39;x&#39;&lt;/script&gt;');
    assert.strictEqual(escapeHtml(null), '');
    assert.strictEqual(escapeHtml(123), '');
  });

  test('sanitizeHtml strips <img src=x onerror=alert(1)>', () => {
    const dirty = '<img src=x onerror=alert(1)>';
    const clean = sanitizeHtml(dirty);
    assert(!clean.includes('onerror'), `Expected onerror to be stripped: ${clean}`);
    assert(!clean.includes('alert'), `Expected alert to be stripped: ${clean}`);
  });

  test('sanitizeHtml strips tag-boundary bypass <img/onerror=alert(1)>', () => {
    const dirty = '<img/onerror=alert(1)>';
    const clean = sanitizeHtml(dirty);
    assert(!clean.includes('onerror'), `Expected onerror to be stripped: ${clean}`);
    assert(!clean.includes('alert'), `Expected alert to be stripped: ${clean}`);
  });

  test('sanitizeHtml strips script tags and javascript: URIs', () => {
    const dirtyScript = '<script>alert(document.cookie)</script><p>Hello</p>';
    const cleanScript = sanitizeHtml(dirtyScript);
    assert(!cleanScript.includes('<script'), `Expected script tag to be stripped: ${cleanScript}`);
    assert(cleanScript.includes('<p>Hello</p>'));

    const dirtyLink = '<a href="javascript:alert(1)">Click Me</a>';
    const cleanLink = sanitizeHtml(dirtyLink);
    assert(!cleanLink.includes('javascript:'), `Expected javascript: URI to be stripped: ${cleanLink}`);
  });

  test('sanitizeHtml preserves allowed markdown formatting tags and attributes', () => {
    const markdownHtml = '<h1>Title</h1><p>Text with <strong>bold</strong>, <em>italic</em>, <code>code</code>, <a href="https://example.com" target="_blank" class="link">link</a>, and <blockquote style="color:red">quote</blockquote></p><ul><li>Item 1</li></ul><pre><code>block</code></pre>';
    const clean = sanitizeHtml(markdownHtml);
    assert(clean.includes('<h1>Title</h1>'));
    assert(clean.includes('<strong>bold</strong>'));
    assert(clean.includes('<em>italic</em>'));
    assert(clean.includes('<a href="https://example.com" target="_blank" class="link">link</a>'));
    assert(clean.includes('style="color:red"'));
    assert(clean.includes('<li>Item 1</li>'));
  });
});

describe('Sensitive Action Gate Detection Tests (Phase 1.2)', async () => {
  const fs = require('node:fs');
  const path = require('node:path');
  let isElementSensitive;

  before(async () => {
    // Provide mock chrome runtime if not present
    if (!global.chrome) {
      global.chrome = {
        runtime: {
          onMessage: { addListener: () => {} },
          sendMessage: () => {}
        },
        storage: {
          local: { get: () => Promise.resolve({}), set: () => Promise.resolve({}) }
        }
      };
    }
    await import('../extension/content/content.js');
    isElementSensitive = global.window.isElementSensitive || global.isElementSensitive;
  });

  test('Fixture A: English "Buy Now" button is flagged', () => {
    const fixturePath = path.join(__dirname, 'fixtures', 'sensitive-action', 'english-buy-now.html');
    const html = fs.readFileSync(fixturePath, 'utf8');
    const dom = new JSDOM(html);
    const btn = dom.window.document.getElementById('buy-btn');
    assert(btn, 'Button must exist in fixture');
    const result = isElementSensitive(btn, btn.textContent);
    assert.strictEqual(result, true, 'English Buy Now button must be flagged as sensitive');
  });

  test('Fixture B: Icon-only submit button in form with cc-number field is flagged', () => {
    const fixturePath = path.join(__dirname, 'fixtures', 'sensitive-action', 'icon-submit-cc-form.html');
    const html = fs.readFileSync(fixturePath, 'utf8');
    const dom = new JSDOM(html);
    const btn = dom.window.document.getElementById('icon-submit-btn');
    assert(btn, 'Submit button must exist in fixture');
    const result = isElementSensitive(btn, '');
    assert.strictEqual(result, true, 'Submit button in form with cc-number must be flagged as sensitive');
  });

  test('Fixture C: Ordinary "Search" submit button is NOT flagged', () => {
    const fixturePath = path.join(__dirname, 'fixtures', 'sensitive-action', 'search-form.html');
    const html = fs.readFileSync(fixturePath, 'utf8');
    const dom = new JSDOM(html);
    const btn = dom.window.document.getElementById('search-btn');
    assert(btn, 'Search button must exist in fixture');
    const result = isElementSensitive(btn, btn.textContent);
    assert.strictEqual(result, false, 'Ordinary search button must NOT be flagged as sensitive');
  });

  test('Fixture D: Spanish "Comprar ahora" button is flagged', () => {
    const fixturePath = path.join(__dirname, 'fixtures', 'sensitive-action', 'spanish-buy-now.html');
    const html = fs.readFileSync(fixturePath, 'utf8');
    const dom = new JSDOM(html);
    const btn = dom.window.document.getElementById('comprar-btn');
    assert(btn, 'Comprar button must exist in fixture');
    const result = isElementSensitive(btn, btn.textContent);
    assert.strictEqual(result, true, 'Spanish Comprar ahora button must be flagged as sensitive');
  });

  test('Structural Currency Signal: Button in form or container with currency amounts is flagged', () => {
    const html = `
      <form id="order-summary">
        <p>Order Total: $49.99</p>
        <button id="proceed-btn" type="submit">Proceed</button>
      </form>
    `;
    const dom = new JSDOM(html);
    const btn = dom.window.document.getElementById('proceed-btn');
    assert.strictEqual(isElementSensitive(btn, 'Proceed'), true, 'Button in form with $49.99 must be flagged');

    const eurHtml = `<div><span>Total: 35.50€</span><button id="eur-btn">Next</button></div>`;
    const eurDom = new JSDOM(eurHtml);
    const eurBtn = eurDom.window.document.getElementById('eur-btn');
    assert.strictEqual(isElementSensitive(eurBtn, 'Next'), true, 'Button nearby 35.50€ must be flagged');

    const inrHtml = `<div><span>Total: ₹1500</span><button id="inr-btn">Continue</button></div>`;
    const inrDom = new JSDOM(inrHtml);
    const inrBtn = inrDom.window.document.getElementById('inr-btn');
    assert.strictEqual(isElementSensitive(inrBtn, 'Continue'), true, 'Button nearby ₹1500 must be flagged');
  });

  test('International Keywords: Portuguese and Hindi transliterated actions are flagged', () => {
    const dom = new JSDOM('<button id="pt-btn">Comprar agora</button><button id="pt-del">Excluir conta</button><button id="hi-btn">Abhi kharidein</button>');
    const ptBtn = dom.window.document.getElementById('pt-btn');
    const ptDel = dom.window.document.getElementById('pt-del');
    const hiBtn = dom.window.document.getElementById('hi-btn');

    assert.strictEqual(isElementSensitive(ptBtn, ptBtn.textContent), true, 'Portuguese "Comprar agora" must be flagged');
    assert.strictEqual(isElementSensitive(ptDel, ptDel.textContent), true, 'Portuguese "Excluir conta" must be flagged');
    assert.strictEqual(isElementSensitive(hiBtn, hiBtn.textContent), true, 'Hindi "Abhi kharidein" must be flagged');
  });

  test('Non-sensitive inputs: Login, subscribe, and navigation are NOT flagged', () => {
    const html = `
      <form id="login-form">
        <input type="text" name="username" />
        <input type="password" name="password" />
        <button id="login-btn" type="submit">Sign In</button>
      </form>
      <form id="sub-form">
        <input type="email" name="email" />
        <button id="sub-btn" type="submit">Subscribe</button>
      </form>
    `;
    const dom = new JSDOM(html);
    const loginBtn = dom.window.document.getElementById('login-btn');
    const subBtn = dom.window.document.getElementById('sub-btn');

    assert.strictEqual(isElementSensitive(loginBtn, loginBtn.textContent), false, 'Login button must not be flagged');
    assert.strictEqual(isElementSensitive(subBtn, subBtn.textContent), false, 'Subscribe button must not be flagged');
  });
});

