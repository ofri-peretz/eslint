/**
 * VULNERABLE - The textbook CWE-643: an XML-backed login. A password of
 * `' or '1'='1` makes the predicate unconditionally true and authenticates as
 * the first user in the document.
 */
const xpath = require('xpath');
const { usersDocument } = require('../lib/users');

exports.authenticate = function authenticate(username, password) {
  const expression =
    "//users/user[username/text()='" + username + "' and password/text()='" + password + "']";
  return xpath.select1(expression, usersDocument()) !== undefined;
};
