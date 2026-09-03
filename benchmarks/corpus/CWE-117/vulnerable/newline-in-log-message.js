// CWE-117: Log injection — request field concatenated into a log line
// @author      claude-fable-5
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-07-31
// This MUST be detected — a username containing \r\n forges an extra log record ("admin\n[INFO] login ok")
function onLoginAttempt(req) {
  logger.info('login attempt: ' + req.body.username);
}

function onLoginFailure(req, reason) {
  logger.warn('login failed for ' + req.body.username + ' reason=' + reason);
}
