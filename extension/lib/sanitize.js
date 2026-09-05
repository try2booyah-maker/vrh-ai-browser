/**
 * VRH.AI Sanitization Module
 * Provides HTML escaping and sanitization to prevent XSS in the privileged
 * extension context (sidepanel, settings pages).
 *
 * USAGE:
 *   escapeHtml(str)    — Escape all HTML-special chars. Call on ANY untrusted
 *                         text BEFORE inserting into innerHTML or template literals.
 *   sanitizeHtml(html) — Strip dangerous tags/attributes from an HTML string.
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

// ── Dangerous Tag / Attribute Stripping ──
// A secondary defense layer that removes known-dangerous HTML even if
// something bypasses the primary escape (e.g. through a code path that
// intentionally allows some markup like <strong>, <em>).
//
// This does NOT replace a real library like DOMPurify — it is a pragmatic
// blocklist approach that covers the most common XSS vectors.

// Tags that must be completely removed (tag + content)
const DANGEROUS_TAGS = /(<script[\s>][\s\S]*?<\/script>|<style[\s>][\s\S]*?<\/style>|<iframe[\s>][\s\S]*?<\/iframe>|<object[\s>][\s\S]*?<\/object>|<embed[\s>][\s\S]*?<\/embed>|<applet[\s>][\s\S]*?<\/applet>|<form[\s>][\s\S]*?<\/form>)/gi;

// Self-closing or void dangerous tags
const DANGEROUS_VOID_TAGS = /<(script|iframe|object|embed|applet|form|base|meta|link)\b[^>]*\/?>/gi;

// Event handler attributes (on*)
const EVENT_ATTRS = /\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;

// javascript: / data: / vbscript: in href/src/action attributes
const DANGEROUS_PROTOCOLS = /(href|src|action|formaction|xlink:href)\s*=\s*(?:"(?:javascript|data|vbscript):[^"]*"|'(?:javascript|data|vbscript):[^']*')/gi;

function sanitizeHtml(html) {
  if (typeof html !== 'string') return '';
  return html
    .replace(DANGEROUS_TAGS,      '')
    .replace(DANGEROUS_VOID_TAGS, '')
    .replace(EVENT_ATTRS,         '')
    .replace(DANGEROUS_PROTOCOLS, '$1=""');
}

// Make functions globally available (loaded as a plain <script> tag in
// extension pages — no ES module support in MV3 extension pages by default).
if (typeof window !== 'undefined') {
  window.escapeHtml   = escapeHtml;
  window.sanitizeHtml = sanitizeHtml;
}
