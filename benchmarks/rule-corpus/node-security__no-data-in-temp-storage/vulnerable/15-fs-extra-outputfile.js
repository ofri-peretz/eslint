/**
 * VULNERABLE (adversarial) - fs-extra is a drop-in fs replacement and
 * outputFileSync is its write entry point (it mkdirs the parent, then writes).
 * The tenant export lands at a fixed path in shared temp storage.
 */
const fse = require('fs-extra');

function exportTenant(tenantId, rows) {
  fse.outputFileSync('/tmp/tenant-export.json', JSON.stringify({ tenantId, rows }));
}

module.exports = { exportTenant };
