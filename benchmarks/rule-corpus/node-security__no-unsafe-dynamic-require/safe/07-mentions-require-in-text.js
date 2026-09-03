/**
 * SAFE - the words `require(req.query.plugin)` appear in a comment and in a
 * lint-message string. The code requires one static module. A report here would
 * prove the rule reads TEXT rather than structure.
 */
const rules = require('./rules');

// Historical note: v1 shipped `require(req.query.plugin)` in the reload route.
const ADVICE = 'never write require(req.body.name) — use an allowlist table';

module.exports = { rules, ADVICE };
