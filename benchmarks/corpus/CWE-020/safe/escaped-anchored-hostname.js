// CWE-020: Safe — hostname regexp with escaped dots and full anchoring
// @author      claude-fable-5
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-07-31
// This MUST NOT be flagged — every metacharacter is escaped and the pattern is anchored at both ends
const TRUSTED_HOST = /^https:\/\/example\.com(\/[^\s]*)?$/;

function isTrustedRedirect(target) {
  return TRUSTED_HOST.test(target);
}

function handleRedirect(req, res) {
  const target = req.query.next;
  res.redirect(isTrustedRedirect(target) ? target : '/');
}
