/**
 * VULNERABLE - xml2js is the most-installed XML parser on npm. `parseString` is
 * imported as a bare function, so the sink is a plain CallExpression with no
 * receiver at all, and the document handed to it is the raw request body of a
 * webhook.
 */
import { parseString } from 'xml2js';

export function handleSoapCallback(req, res) {
  parseString(req.body, (err, result) => {
    if (err) return res.status(400).end();
    return res.json(result.Envelope.Body);
  });
}
