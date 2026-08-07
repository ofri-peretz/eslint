// CWE-099: Resource Injection — process.env key and value from the request
// @author       claude-fable-5
// @reviewedBy    benchmark-validator
// @lastReviewed  2026-07-31
// This MUST be detected — writing an attacker-named env var can overwrite PATH,
// NODE_OPTIONS, or LD_PRELOAD and alter how later processes execute.
function setConfig(req, res) {
  const { key, value } = req.body;
  process.env[key] = value; // both key and value attacker-controlled
  res.status(204).end();
}

module.exports = { setConfig };
