// CWE-020: indexOf-emulated suffix check with no boundary
// @author      claude-fable-5
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-07-31
// This MUST be detected — the intent is "ends with .trusted.com", but ".trusted.com.evil.io" also matches
function isTrustedSubdomain(hostname) {
  return hostname.lastIndexOf('.trusted.com') !== -1;
}

function issueSessionCookie(req, res) {
  const host = req.headers.host;
  if (isTrustedSubdomain(host)) {
    res.setHeader('Set-Cookie', `sid=${req.session.id}; Domain=${host}; HttpOnly`);
    return;
  }
  res.status(403).end();
}
