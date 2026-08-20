/**
 * VULNERABLE - The expression is named first and evaluated in a later statement,
 * so the sink is not an ancestor of the taint. This is the ordinary way handlers
 * are written and the shape a purely syntactic check cannot see.
 */
const { ledgerDocument } = require('../lib/ledger');

exports.entries = function entries(req, res) {
  const xpathQuery = req.params.filter;
  const doc = ledgerDocument();
  res.json({ nodes: doc.evaluate(xpathQuery, doc).snapshotLength });
};
