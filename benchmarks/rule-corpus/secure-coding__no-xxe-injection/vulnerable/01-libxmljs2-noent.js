/**
 * VULNERABLE - The canonical Node XXE. libxmljs2's `parseXml` with `noent: true`
 * substitutes external entities, so a `<!ENTITY x SYSTEM "file:///etc/passwd">`
 * declared inside an uploaded invoice is read off the server's disk and echoed
 * back. This is the exact library and the exact switch the rule's own fix text
 * names ("Use libxmljs with noent: false").
 */
const libxmljs = require('libxmljs2');

exports.importInvoice = function importInvoice(req, res) {
  const doc = libxmljs.parseXml(req.body.invoice, { noent: true, dtdload: true });
  res.json({ total: doc.get('//total').text() });
};
