/**
 * VRH.AI Sanitization Module
 * Provides HTML escaping and DOMPurify-powered sanitization to prevent XSS
 * in the privileged extension context (sidepanel, settings pages).
 *
 * USAGE:
 *   escapeHtml(str)    — Escape all HTML-special chars. Call on ANY untrusted
 *                         text BEFORE inserting into innerHTML or template literals.
 *   sanitizeHtml(html) — Strip dangerous tags/attributes using DOMPurify with a strict allowlist.
 *                         Defense-in-depth layer; use AFTER markdown rendering.
 */

// ── HTML Entity Escaping ──
// Converts the five HTML-special characters to their entity equivalents.
// This is the PRIMARY defense: if text is escaped before it enters any
// innerHTML assignment, injected markup is rendered as visible text.
function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#39;');
}

// ── DOMPurify Strict Allowlist ──
// Explicitly scoped to tags and attributes emitted by markdown rendering.
const ALLOWED_TAGS = [
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'br', 'ul', 'ol', 'li', 'blockquote',
  'pre', 'code', 'strong', 'em', 'b', 'i',
  'a', 'div', 'span'
];

const ALLOWED_ATTR = [
  'style', 'href', 'target', 'class'
];

/**
 * Sanitize an HTML string using DOMPurify with strict markdown allowlists.
 * Strips script tags, on* handlers, data/javascript URIs, and dangerous elements.
 * @param {string} html
 * @returns {string}
 */
function sanitizeHtml(html) {
  if (typeof html !== 'string') return '';

  const purifier = typeof DOMPurify !== 'undefined'
    ? DOMPurify
    : (typeof window !== 'undefined' && window.DOMPurify ? window.DOMPurify : null);

  if (purifier && typeof purifier.sanitize === 'function') {
    return purifier.sanitize(html, {
      ALLOWED_TAGS,
      ALLOWED_ATTR
    });
  }

  // Fallback if DOMPurify is unavailable
  return escapeHtml(html);
}

// Export for browser environments (loaded as a plain <script> tag)
if (typeof window !== 'undefined') {
  window.escapeHtml   = escapeHtml;
  window.sanitizeHtml = sanitizeHtml;
}

// Export for Node.js test environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    escapeHtml,
    sanitizeHtml,
    ALLOWED_TAGS,
    ALLOWED_ATTR
  };
}
