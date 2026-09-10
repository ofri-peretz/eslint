// Safe — ECDH on prime256v1.
const crypto = require('crypto');

function agree(peerPublicKey) {
  const ecdh = crypto.createECDH('prime256v1');
  ecdh.generateKeys();
  return ecdh.computeSecret(peerPublicKey);
}

module.exports = { agree };
