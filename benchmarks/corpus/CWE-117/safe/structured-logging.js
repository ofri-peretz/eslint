// CWE-117: Safe — structured logging keeps untrusted input in an encoded field
// @author      claude-fable-5
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-07-31
// This MUST NOT be flagged — the message is a constant and user data is a JSON-encoded field, not a line fragment
function onLoginAttempt(req) {
  logger.info({ event: 'login_attempt', username: req.body.username }, 'login attempt');
}

function auditRequest(req) {
  logger.info(
    {
      event: 'request',
      username: req.query.user,
      ip: req.headers['x-forwarded-for'],
      path: req.path,
    },
    'request handled',
  );
}
