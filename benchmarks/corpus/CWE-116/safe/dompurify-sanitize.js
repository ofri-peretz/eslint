// CWE-116: Safe — dedicated HTML sanitizer with an explicit allowlist
// @author      claude-fable-5
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-07-31
// This MUST NOT be flagged — DOMPurify parses the markup and drops anything outside the allowlist
function renderComment(node, comment) {
  node.innerHTML = DOMPurify.sanitize(comment.bodyHtml, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href', 'title'],
  });
}
