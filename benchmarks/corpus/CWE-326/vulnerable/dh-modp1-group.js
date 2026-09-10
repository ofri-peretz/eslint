// CWE-326 — key agreement on the 768-bit MODP group.
// A named group is a fixed prime: one precomputation breaks every session
// that used it. This is the group Logjam (CVE-2015-4000) demonstrated against.
const crypto = require('crypto');

function agreeKey(peerPublicKey) {
  const dh = crypto.getDiffieHellman('modp1');
  dh.generateKeys();
  return dh.computeSecret(peerPublicKey);
}

module.exports = { agreeKey };
