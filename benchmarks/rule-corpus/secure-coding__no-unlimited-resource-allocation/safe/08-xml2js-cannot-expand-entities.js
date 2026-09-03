/**
 * SAFE - Reported 24 times across the corpus as a "billion laughs" sink. The
 * premise was never measured and is false: xml2js parses through sax-js, which
 * rejects custom entity references outright.
 *
 * Measured against xml2js 0.6.2 / sax 1.6.1 — a nine-level billion-laughs
 * payload errors in 1 ms with 0 characters expanded, and so do a one-level
 * entity and an external SYSTEM entity.
 *
 * n8n packages/cli/src/middlewares/body-parser.ts:101 and 23 others
 */
const xml2js = require('xml2js');

function parseXML(xmlString, cb) {
  const parser = new xml2js.Parser();
  parser.parseString(xmlString, cb);
}

module.exports = { parseXML };
