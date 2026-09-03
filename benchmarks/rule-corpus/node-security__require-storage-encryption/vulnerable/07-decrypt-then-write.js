/**
 * VULNERABLE - the inverse of the mitigation. The sealed blob is DECRYPTED and
 * the plaintext is what reaches disk. `decrypt` contains the letters of
 * `encrypt`, which is what makes this worth pinning.
 */
const fs = require('fs');
const { decrypt } = require('./kms');

async function materialiseToken(tokenPath, sealed) {
  fs.writeFileSync(tokenPath, decrypt(sealed));
}

module.exports = { materialiseToken };
