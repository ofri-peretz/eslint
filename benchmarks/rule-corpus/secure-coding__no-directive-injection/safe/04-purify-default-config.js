/**
 * SAFE - The correct remediation for the DOMPurify shape: sanitize with the
 * default profile and add nothing back. This is the counterpart of
 * vulnerable/06-purify-add-tags.js, which re-allows exactly what the sanitizer
 * exists to strip. Same call, same sink name, opposite verdict — the config is
 * the whole difference.
 */
const DOMPurify = require('dompurify');

function renderNewsletter(rawHtml) {
  return DOMPurify.sanitize(rawHtml);
}

module.exports = { renderNewsletter };
