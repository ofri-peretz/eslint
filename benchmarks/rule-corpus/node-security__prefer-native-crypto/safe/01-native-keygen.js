/**
 * SAFE - the correct remediation of vulnerable/01: node:crypto's own RSA
 * keypair generation, PEM-encoded by the platform.
 */
const { generateKeyPairSync } = require('node:crypto');

exports.newDeviceKey = function newDeviceKey() {
  const { publicKey, privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  return { publicKey, privateKey };
};
