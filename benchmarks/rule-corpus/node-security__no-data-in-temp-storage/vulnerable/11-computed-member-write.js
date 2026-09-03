/**
 * VULNERABLE (adversarial) - the sink reached through a computed member.
 * `fs['writeFileSync']` is the same function as `fs.writeFileSync`; a rule that
 * only visits non-computed members sees nothing. Bundler-generated and
 * minifier-friendly code writes it this way routinely.
 */
const fs = require('node:fs');

function dumpDiagnostics(report) {
  fs['writeFileSync']('/tmp/diagnostics.json', JSON.stringify(report));
}

module.exports = { dumpDiagnostics };
