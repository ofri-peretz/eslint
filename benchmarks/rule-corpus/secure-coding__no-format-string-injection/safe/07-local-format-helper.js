/**
 * SAFE - A LOCAL function named `format`. It is this module's own date
 * helper; it has nothing to do with util.format and does not interpret
 * specifiers at all.
 *
 * Name-identical to the sink, resolved to a different binding. A rule matching
 * the callee's spelling reports this file's `format(req.query.tz, stamp)` as
 * CWE-134.
 */
function format(timezone, stamp) {
  return new Date(stamp).toLocaleString('en-US', { timeZone: timezone });
}

function renderRow(req, row) {
  return format(req.query.tz, row.createdAt);
}

module.exports = { format, renderRow };
