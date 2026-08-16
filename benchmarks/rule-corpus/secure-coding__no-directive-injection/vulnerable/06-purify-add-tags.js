/**
 * VULNERABLE - The sanitizer is present and configured to allow back exactly
 * what it exists to strip. The call site reads as sanitized and returns markup
 * that can execute script.
 */
const DOMPurify = require('dompurify');

function renderNewsletter(rawHtml) {
  return DOMPurify.sanitize(rawHtml, {
    ADD_TAGS: ['iframe'],
    ADD_ATTR: ['onload', 'target'],
  });
}

module.exports = { renderNewsletter };
