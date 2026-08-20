/**
 * VULNERABLE - The format string is ASSEMBLED from user input and then used as
 * a format string. The `%s` the code contributes is real, and so is any
 * specifier the attacker adds through the label.
 */
const util = require('node:util');

function auditPrefix(req, session) {
  const prefix = 'audit[' + req.params.label + '] %s';
  return util.format(prefix, session.userId);
}

module.exports = { auditPrefix };
