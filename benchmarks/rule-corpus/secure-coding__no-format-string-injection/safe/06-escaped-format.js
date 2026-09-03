/**
 * SAFE (correct remediation of an earlier vulnerable shape) - The user's string
 * is placed in the ARGUMENT position under a constant format, and the one place
 * it must be embedded has its percent signs doubled first, which is how
 * printf-family escaping works.
 */
const util = require('node:util');

function escapeFormat(value) {
  return String(value).replace(/%/g, '%%');
}

function renderBanner(req) {
  const safePattern = escapeFormat(req.query.pattern);
  return util.format('%s | tenant=%s', safePattern, req.params.tenant);
}

module.exports = { renderBanner, escapeFormat };
