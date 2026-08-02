// CWE-636: Safe — the catch block denies
// @author      claude-fable-5
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-07-31
// This MUST NOT be flagged — any verification failure resolves to "not authorized"
function isAuthorized(token) {
  try {
    return verifyToken(token).valid === true;
  } catch (err) {
    logger.warn({ event: 'token_verify_failed', reason: err.name });
    return false;
  }
}

function handleRequest(req, res) {
  if (!isAuthorized(req.headers.authorization)) {
    res.status(401).end();
    return;
  }
  res.json(loadAccountData(req.params.id));
}
