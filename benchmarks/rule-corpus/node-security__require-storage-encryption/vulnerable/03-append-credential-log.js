/**
 * VULNERABLE - a debug trail that appends the bearer token of every outbound
 * call. Append is a disk write; the log file is long-lived, is collected by log
 * shippers, and now holds live credentials.
 */
const fs = require('fs');

function traceUpstreamCall(auditPath, url, token) {
  fs.appendFileSync(auditPath, `${new Date().toISOString()} ${url} token=${token}\n`);
}

module.exports = { traceUpstreamCall };
