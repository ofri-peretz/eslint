/**
 * SAFE (wave 3) - a CORRECT hand-rolled constant-time comparison.
 *
 * The negative control for the fake-mitigation detector, and the thing that
 * makes that detector honest. A real implementation never compares the two
 * inputs to each other: it accumulates their XOR and compares the accumulator
 * to zero, so there is no equality operator with one input on each side.
 *
 * The `.length` guard is present in both the correct and the fake version,
 * which is exactly why it has to be excluded from the test.
 */
'use strict';

function constantTimeEquals(a, b) {
  if (a.length !== b.length) return false;

  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function authorize(req, tokenStore) {
  const presentedToken = req.headers['x-auth-token'];
  const storedToken = await tokenStore.current();

  return constantTimeEquals(presentedToken, storedToken);
}

module.exports = { authorize, constantTimeEquals };
