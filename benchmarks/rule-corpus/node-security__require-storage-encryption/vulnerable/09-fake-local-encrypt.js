/**
 * VULNERABLE (adversarial) - a LOCAL function wearing a trusted name. This
 * `encrypt` is a placeholder that returns its input, so the session secret is
 * written to disk in the clear. Any check that accepts "the value went through
 * something called encrypt" is satisfied by it.
 */
const fs = require('fs');

// FIXME: wire up KMS — returning the input keeps local dev working
const encrypt = (value) => value;

function persistSessionSecret(dest, sessionSecret) {
  fs.writeFileSync(dest, encrypt(sessionSecret));
}

module.exports = { persistSessionSecret };
