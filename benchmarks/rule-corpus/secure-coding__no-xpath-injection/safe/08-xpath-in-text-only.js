/**
 * SAFE - XPath appears only as documentation. A comment and a string constant
 * describing the anti-pattern are not an evaluation.
 */
// Never build `//users/user[name='" + input + "']` by concatenation - escape first.
exports.SECURITY_NOTE =
  "//users/user[username/text()='X' and password/text()='Y'] is CWE-643 when X is user input.";

exports.describe = function describe(logger, req) {
  logger.warn('rejected xpath-shaped input from %s', req.ip);
  return exports.SECURITY_NOTE;
};
