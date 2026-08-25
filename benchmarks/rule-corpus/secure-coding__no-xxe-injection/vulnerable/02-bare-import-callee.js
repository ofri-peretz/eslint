/**
 * VULNERABLE - A bare named import, so the sink is a plain CallExpression with
 * no receiver at all, and the document handed to it is the raw request body of
 * a webhook. libxmljs2 binds libxml2, which loads external entities when
 * entity substitution is on and nothing here turns it off.
 *
 * This fixture used to import xml2js. It was moved to libxmljs2 on 2026-08-24
 * after a probe showed xml2js cannot resolve an external entity at all - it
 * throws "Invalid character entity" - so the shape it was written to exercise
 * (a bare-identifier callee) was being carried by a library that could not
 * produce the vulnerability. See ../safe/12-xmldom-upload.js.
 */
import { parseXml } from 'libxmljs2';

export function handleSoapCallback(req, res) {
  const doc = parseXml(req.body);
  return res.json({ root: doc.root().name() });
}
