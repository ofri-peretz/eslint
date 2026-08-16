/**
 * VULNERABLE (adversarial wave) - The Express idiom: destructure the query, use
 * what you took. Nothing on the line that calls the sink says `req`, and the
 * declaration that does is a pattern rather than a name.
 */
const util = require('node:util');

function auditRow(req, row) {
  const { fmt, locale } = req.query;
  return util.format(fmt, row.email, row.internalNotes, locale);
}

module.exports = { auditRow };
