// CWE-117: Log injection — untrusted header interpolated into a log template
// @author      claude-fable-5
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-07-31
// This MUST be detected — headers and query params are attacker-controlled and may carry CR/LF
function auditRequest(req) {
  const forwardedFor = req.headers['x-forwarded-for'];
  logger.info(`request user=${req.query.user} ip=${forwardedFor} path=${req.path}`);
}

function auditExport(req, rows) {
  console.log(`export by ${req.query.user}: ${rows.length} rows`);
}
