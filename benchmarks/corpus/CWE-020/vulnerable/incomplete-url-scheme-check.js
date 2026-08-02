// CWE-020: Incomplete URL scheme denylist
// @author      claude-fable-5
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-07-31
// This MUST be detected — only 'javascript:' is blocked; 'data:', 'vbscript:' and 'blob:' still execute
function sanitizeHref(raw) {
  const value = String(raw).trim().toLowerCase();
  if (value.startsWith('javascript:')) {
    return '#';
  }
  return raw;
}

function renderProfileLink(anchor, profile) {
  anchor.setAttribute('href', sanitizeHref(profile.website));
  anchor.textContent = profile.websiteLabel;
}
