// CWE-079: safe — DOMPurify guarded with optional chaining is still sanitized
// @author        ofri-peretz
// @reviewedBy    benchmark-validator
// @lastReviewed  2026-08-26
// @source        aemdemos/lundbeck-vyepti blocks/embed/embed.js:60,65,81
// @sealed        browser-security/no-innerhtml
// This MUST NOT be flagged
//
// `window.DOMPurify?.sanitize(...)` is the defensive form — it tolerates the
// library not having loaded. Reporting it as CWE-79 CRITICAL punishes the more
// careful spelling: the same code without `?.` is recognised correctly. Seven
// Adobe repositories share this exact shape.
const DOMPURIFY = { ALLOWED_TAGS: ['div', 'button'] };

function renderPlaceholder(wrapper) {
  const placeholderHtml = '<div class="embed-placeholder-play"><button type="button"></button></div>';
  wrapper.innerHTML = (window.DOMPurify?.sanitize(placeholderHtml, DOMPURIFY)) ?? placeholderHtml;
}

module.exports = { renderPlaceholder };
