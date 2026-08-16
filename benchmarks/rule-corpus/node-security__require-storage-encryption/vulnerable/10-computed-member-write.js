/**
 * VULNERABLE (adversarial) - the sink reached through a computed member.
 * `fs['writeFileSync']` is `fs.writeFileSync`; the signing key still lands on
 * disk unencrypted.
 */
const fs = require('node:fs');

function stageSigningKey(dest, signingKey) {
  fs['writeFileSync'](dest, signingKey);
}

module.exports = { stageSigningKey };
