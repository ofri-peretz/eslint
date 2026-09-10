// Safe — and the false positive worth pinning.
//
// The string/Buffer overload supplies a prime chosen elsewhere. Its strength
// is not stated at this call site, so a structural rule must stay silent here
// rather than guess from the argument's presence.
const crypto = require('crypto');

function fromKnownParameters(primeBase64) {
  return crypto.createDiffieHellman(primeBase64, 'base64');
}

module.exports = { fromKnownParameters };
