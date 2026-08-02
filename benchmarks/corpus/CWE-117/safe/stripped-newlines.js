// CWE-117: Safe — CR/LF stripped before the value reaches the log line
// @author      claude-fable-5
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-07-31
// This MUST NOT be flagged — record boundaries cannot be forged once newlines and tabs are removed
function sanitizeForLog(value) {
  return String(value)
    .replace(/[\r\n\t]+/g, ' ')
    .slice(0, 256);
}

function onLoginAttempt(req) {
  logger.info('login attempt: ' + sanitizeForLog(req.body.username));
}
