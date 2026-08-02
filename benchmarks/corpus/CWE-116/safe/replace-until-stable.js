// CWE-116: Safe — global replace applied until the output is stable
// @author      claude-fable-5
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-07-31
// This MUST NOT be flagged — the loop removes nested/overlapping tags, and the result is written as text
const HTML_TAG = /<[^>]*>/g;

function stripTags(input) {
  let current = String(input);
  let previous;
  do {
    previous = current;
    current = current.replace(HTML_TAG, '');
  } while (current !== previous);
  return current;
}

function renderBio(container, req) {
  container.textContent = stripTags(req.body.bio);
}
