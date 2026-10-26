// CWE-079: Safe — template auto-escaping left on, raw output limited to sanitized HTML
// @author      claude-sonnet-5-5
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-10-26
// This MUST NOT be flagged — escapeMarkup is true, and an unrelated option set to false is not the escaping switch
const view = createView({ templates: './templates' });

view.escapeMarkup = true;
view.cache = false;

function renderProfile(user, sanitizeHtml) {
  return view.render('profile', {
    displayName: user.displayName,
    bio: sanitizeHtml(user.bio),
  });
}
