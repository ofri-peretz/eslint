// Safe — the 2048-bit MODP group.
const crypto = require('crypto');

function agreeKey(peerPublicKey) {
  const dh = crypto.getDiffieHellman('modp14');
  dh.generateKeys();
  return dh.computeSecret(peerPublicKey);
}

module.exports = { agreeKey };
