/**
 * VULNERABLE - base64 is an encoding. The signing key is written to the secret
 * path fully recoverable, and the toString('base64') reads like protection to a
 * hurried reviewer, which is exactly why this shape matters.
 */
const fs = require('fs');

function stagePrivateKey(secretPath, privateKey) {
  fs.writeFileSync(secretPath, Buffer.from(privateKey).toString('base64'));
}

module.exports = { stagePrivateKey };
