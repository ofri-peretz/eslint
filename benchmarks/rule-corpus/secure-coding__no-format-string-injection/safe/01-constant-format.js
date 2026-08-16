/**
 * SAFE - The remediation, and the one the rule's own message asks for: a
 * constant format string with the untrusted values as ARGUMENTS. util.format
 * substitutes arguments verbatim and never re-scans them, so a `%d` inside
 * req.body.name reaches the output as the two characters `%d`.
 */
const util = require('node:util');

function auditLine(req) {
  return util.format('audit user=%s action=%s', req.body.name, req.body.action);
}

module.exports = { auditLine };
