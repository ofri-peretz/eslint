/**
 * VULNERABLE - os.tmpdir() interpolated into a template literal is the portable
 * spelling of a hard-coded /tmp path. The report name is constant, so the
 * resolved path is identical on every run in a directory every local user can
 * write.
 */
const os = require('os');
const fs = require('fs');

function writeBillingReport(rows) {
  const csv = rows.map((r) => r.join(',')).join('\n');
  fs.writeFileSync(`${os.tmpdir()}/billing-report.csv`, csv);
}

module.exports = { writeBillingReport };
