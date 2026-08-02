// CWE-020: Safe — URL scheme allowlist (http/https only)
// @author      claude-fable-5
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-07-31
// This MUST NOT be flagged — an allowlist denies javascript:, data:, vbscript: and everything else by default
const ALLOWED_PROTOCOLS = ['http:', 'https:'];

function sanitizeHref(raw) {
  try {
    const parsed = new URL(raw, window.location.origin);
    return ALLOWED_PROTOCOLS.includes(parsed.protocol) ? parsed.href : '#';
  } catch (err) {
    return '#';
  }
}

function renderProfileLink(anchor, profile) {
  anchor.setAttribute('href', sanitizeHref(profile.website));
  anchor.textContent = profile.websiteLabel;
}
