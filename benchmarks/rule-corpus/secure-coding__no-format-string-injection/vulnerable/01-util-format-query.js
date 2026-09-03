/**
 * VULNERABLE - The canonical CWE-134 shape in Node: the FORMAT STRING itself
 * comes off the request. A caller passing `fmt=%j%j%j` makes util.format walk
 * arguments the endpoint never meant to expose, and `%s` on an object reaches
 * its custom inspect output.
 */
const util = require('node:util');

function auditLine(req, session) {
  return util.format(req.query.fmt, session.accessToken, session.refreshToken);
}

module.exports = { auditLine };
