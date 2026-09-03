/**
 * SAFE (adversarial) - The correct remediation reached through a namespace
 * import. Escaping is escaping regardless of how the helper module was bound.
 */
const xpath = require('xpath');
const guards = require('../lib/xpath-escape');
const { directory } = require('../lib/directory');

exports.byName = function byName(name) {
  return xpath.select("//staff/member[@name='" + escapeXPath(name) + "']", directory());
};

function escapeXPath(value) {
  return guards.forXpathLiteral(value);
}
