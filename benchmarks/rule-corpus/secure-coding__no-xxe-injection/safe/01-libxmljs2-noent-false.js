/**
 * SAFE - The correct remediation for fixture vulnerable/01: entity substitution
 * and DTD loading are both explicitly off, so an uploaded document cannot reach
 * the filesystem no matter what it declares.
 */
const libxmljs = require('libxmljs2');

exports.importInvoice = function importInvoice(req, res) {
  const doc = libxmljs.parseXml(req.body.invoice, {
    noent: false,
    dtdload: false,
    dtdvalid: false,
  });
  res.json({ total: doc.get('//total').text() });
};
