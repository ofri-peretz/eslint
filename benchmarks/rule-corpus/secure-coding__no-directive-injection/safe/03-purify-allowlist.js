/**
 * SAFE - The correct DOMPurify configuration: an allow-list that names no
 * executable element and no event attribute. This is the answer the rule steers
 * people toward, and reporting it would be reporting the fix.
 */
const DOMPurify = require('dompurify');

function renderNewsletter(rawHtml) {
  return DOMPurify.sanitize(rawHtml, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'ul', 'li'],
    ALLOWED_ATTR: ['href', 'title'],
  });
}

module.exports = { renderNewsletter };
