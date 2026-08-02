// CWE-1007: Invisible Format character inside an auth comparison value
// @author      claude-fable-5
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-07-31
// This MUST be detected — the group literal carries a zero-width space (U+200B), so the equality check silently never matches
const ADMIN_GROUP = 'admin​';

function isAdmin(user) {
  return user.group === ADMIN_GROUP;
}

function renderDeleteButton(button, user) {
  button.hidden = !isAdmin(user);
}
