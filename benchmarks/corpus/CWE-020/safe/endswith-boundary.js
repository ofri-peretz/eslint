// CWE-020: Safe — suffix check with an explicit dot boundary
// @author      claude-fable-5
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-07-31
// This MUST NOT be flagged — endsWith pins the tail, and the apex host is matched exactly
function isTrustedSubdomain(hostname) {
  const host = String(hostname).toLowerCase().split(':')[0];
  return host === 'trusted.com' || host.endsWith('.trusted.com');
}

function issueSessionCookie(req, res) {
  const host = req.headers.host;
  if (!isTrustedSubdomain(host)) {
    res.status(403).end();
    return;
  }
  res.setHeader('Set-Cookie', `sid=${req.session.id}; Domain=${host}; HttpOnly`);
}
