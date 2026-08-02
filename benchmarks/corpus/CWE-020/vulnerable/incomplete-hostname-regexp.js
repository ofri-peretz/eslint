// CWE-020: Incomplete hostname regexp used as a security decision
// @author      claude-fable-5
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-07-31
// This MUST be detected — the unescaped '.' matches any character, so "https://exampleXcom.evil.io" passes
const TRUSTED_HOST = /https?:\/\/example.com/;

function isTrustedRedirect(target) {
  return TRUSTED_HOST.test(target);
}

function handleRedirect(req, res) {
  const target = req.query.next;
  if (isTrustedRedirect(target)) {
    res.redirect(target);
    return;
  }
  res.redirect('/');
}
