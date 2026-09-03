/**
 * VULNERABLE - The tainted root is a function parameter, destructured the way
 * Koa and Express handlers routinely destructure their context. Nothing here is
 * called `req`; the provenance is in the shape of the handler.
 */
const util = require('node:util');

function exportRows({ query }, rows) {
  return rows.map((row) => util.format(query.format, row.email, row.internalNotes));
}

module.exports = { exportRows };
