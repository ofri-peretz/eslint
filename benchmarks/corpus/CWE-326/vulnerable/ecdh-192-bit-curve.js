// CWE-326 — ECDH on a curve whose field size is under 224 bits.
const crypto = require('crypto');

function agree(peerPublicKey) {
  const ecdh = crypto.createECDH('secp192k1');
  ecdh.generateKeys();
  return ecdh.computeSecret(peerPublicKey);
}

module.exports = { agree };
