/**
 * VULNERABLE (adversarial) - path.join with a literal '/tmp' root. This is the
 * portable spelling people reach for when they do not want to depend on
 * os.tmpdir(), and the resolved path is just as fixed and just as
 * world-writable as a hard-coded string.
 */
const fs = require('node:fs');
const path = require('node:path');

function cacheSamlAssertion(assertion) {
  fs.writeFileSync(path.join('/tmp', 'saml-assertion.xml'), assertion);
}

module.exports = { cacheSamlAssertion };
