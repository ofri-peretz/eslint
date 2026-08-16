/**
 * SAFE - The correct remediation for fixture vulnerable/01: the value is escaped
 * for XPath before it reaches the predicate, so no quote can close the literal.
 */
const xpath = require('xpath');
const { escapeXPath } = require('../lib/xpath-escape');
const { directory } = require('../lib/directory');

exports.staffByName = function staffByName(req) {
  return xpath.select("//staff/member[@name='" + escapeXPath(req.query.name) + "']", directory());
};
