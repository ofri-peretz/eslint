/**
 * SAFE - the remediation for 03, using the WebCrypto surface Node exposes
 * globally, with rejection sampling so the six-digit range stays uniform.
 */
'use strict';

const { webcrypto } = require('node:crypto');

function drawOtp() {
  const buffer = new Uint32Array(1);
  let value;
  do {
    webcrypto.getRandomValues(buffer);
    value = buffer[0];
  } while (value >= 4294000000);
  return String(100000 + (value % 900000));
}

module.exports = { drawOtp };
