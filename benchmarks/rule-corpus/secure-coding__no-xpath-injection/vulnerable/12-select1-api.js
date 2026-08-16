/**
 * VULNERABLE (adversarial) - `select1` is the xpath package's OTHER documented
 * entry point (it returns the first node instead of an array). Same evaluator,
 * same injection.
 */
const xpath = require('xpath');
const { usersDocument } = require('../lib/users');

exports.byMail = function byMail(mail) {
  return xpath.select1("//users/user[email/text()='" + mail + "']", usersDocument());
};
