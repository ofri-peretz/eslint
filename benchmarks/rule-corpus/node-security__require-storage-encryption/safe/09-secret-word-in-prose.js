/**
 * SAFE (adversarial) - the credential vocabulary appears only in a comment and
 * in user-facing prose. The value written is a rendered report.
 *
 * Positive control for this probe: vulnerable/06 proves the rule DOES fire when
 * an identifier at the same sink genuinely names a secret.
 */
const fs = require('node:fs');

function emitComplianceReport(outPath, findings) {
  // Auditors ask whether any secret, password or api key was ever logged.
  const report = findings.map((f) => `- ${f.control}: ${f.status}`).join('\n');
  fs.writeFileSync(outPath, `# Compliance\n\n${report}\n`);
}

module.exports = { emitComplianceReport };
