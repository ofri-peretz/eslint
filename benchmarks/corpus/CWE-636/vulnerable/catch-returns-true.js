// CWE-636: Fail-open — auth check whose catch block returns "authorized"
// @author      claude-fable-5
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-07-31
// This MUST be detected — a malformed or expired token throws, and the catch grants access
function isAuthorized(token) {
  try {
    return verifyToken(token).valid;
  } catch (err) {
    return true;
  }
}

function handleRequest(req, res) {
  if (!isAuthorized(req.headers.authorization)) {
    res.status(401).end();
    return;
  }
  res.json(loadAccountData(req.params.id));
}
