/**
 * VULNERABLE (adversarial wave) - The same defect as 01, imported the way Node
 * documents it: `const { format } = require('node:util')`. The receiver
 * `util.` never appears, so a rule matching the spelling `util.format` sees an
 * ordinary call to something called `format`.
 */
const { format } = require('node:util');

function auditLine(req, session) {
  return format(req.query.fmt, session.accessToken);
}

module.exports = { auditLine };
