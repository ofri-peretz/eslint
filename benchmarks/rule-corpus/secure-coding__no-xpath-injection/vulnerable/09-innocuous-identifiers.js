/**
 * VULNERABLE (adversarial) - The FALSE-NEGATIVE direction nobody runs: the same
 * injection with every identifier renamed to a word no taint list contains. The
 * value comes from a helper, not from a parameter, so neither the name list nor
 * the parameter fallback can see it.
 */
const xpath = require('xpath');
const { ledger, currentTicket } = require('../lib/ledger');

exports.lookup = function lookup(doc) {
  const k = currentTicket();
  return xpath.select("//entries/entry[@key='" + k + "']", doc ?? ledger());
};
