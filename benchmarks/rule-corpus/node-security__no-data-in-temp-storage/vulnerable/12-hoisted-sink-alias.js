/**
 * VULNERABLE (adversarial) - the write function itself is hoisted into a
 * `const` before use. The receiver `fs` never appears at the call site.
 */
const fs = require('fs');

const write = fs.writeFileSync;

function persistLicense(license) {
  write('/tmp/license-key.txt', license);
}

module.exports = { persistLicense };
