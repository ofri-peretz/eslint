// CWE-326 — a generated Diffie-Hellman prime far below any current floor.
const crypto = require('crypto');

function newParameters() {
  return crypto.createDiffieHellman(512);
}

module.exports = { newParameters };
