// CWE-099: Safe — assignment to a fixed allowlisted env key
// @author       claude-fable-5
// @reviewedBy    benchmark-validator
// @lastReviewed  2026-07-31
// This must NOT be flagged — the target key is a literal from a closed
// allowlist, so user input can never choose which env variable is written.
const ALLOWED = { locale: 'APP_LOCALE', theme: 'APP_THEME' };

function setConfig(req, res) {
  const target = ALLOWED[req.body.setting];
  if (!target) return res.status(400).end();
  process.env[target] = String(req.body.value);
  res.status(204).end();
}

module.exports = { setConfig };
