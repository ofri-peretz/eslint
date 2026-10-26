// CWE-079: XSS — template engine auto-escaping switched off globally
// @author      claude-sonnet-5-5
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-10-26
// This MUST be detected — escapeMarkup = false makes every interpolated value render as raw HTML, so a display name containing <script> executes
const view = createView({ templates: './templates' });

view.escapeMarkup = false;

function renderProfile(user) {
  return view.render('profile', { displayName: user.displayName, bio: user.bio });
}
