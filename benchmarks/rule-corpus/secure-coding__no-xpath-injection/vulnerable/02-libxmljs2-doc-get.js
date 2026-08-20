/**
 * VULNERABLE - libxmljs2's `doc.get(expr)` is its XPath entry point, and this is
 * verbatim how the package's issues and Stack Overflow answers write a lookup by
 * name. The username closes the string literal and the predicate.
 */
const libxmljs = require('libxmljs2');
const { readCatalogue } = require('../lib/catalogue');

exports.findAccount = function findAccount(username) {
  const doc = libxmljs.parseXml(readCatalogue());
  return doc.get('//accounts/account[name="' + username + '"]');
};
