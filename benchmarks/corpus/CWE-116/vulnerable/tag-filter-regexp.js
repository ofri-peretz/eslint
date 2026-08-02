// CWE-116: Broken sanitizer — regexp tag filter as HTML sanitization
// @author      claude-fable-5
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-07-31
// This MUST be detected — '.' skips newlines and only <script> is targeted, so <img onerror=…> and <script\n> pass
const SCRIPT_TAG = /<script.*?>.*?<\/script>/gi;

function sanitizeHtml(html) {
  return html.replace(SCRIPT_TAG, '');
}

function renderComment(node, comment) {
  node.innerHTML = sanitizeHtml(comment.bodyHtml);
}
