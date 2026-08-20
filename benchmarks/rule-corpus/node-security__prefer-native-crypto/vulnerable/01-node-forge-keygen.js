/**
 * VULNERABLE - node-forge shipped into a service to generate an RSA keypair,
 * something node:crypto has done natively since v10. A pure-JS reimplementation
 * of a primitive the platform provides is an avoidable third-party dependency
 * on the crypto path (CWE-1104).
 */
const forge = require('node-forge');

exports.newDeviceKey = function newDeviceKey() {
  const pair = forge.pki.rsa.generateKeyPair({ bits: 2048 });
  return {
    publicKey: forge.pki.publicKeyToPem(pair.publicKey),
    privateKey: forge.pki.privateKeyToPem(pair.privateKey),
  };
};
