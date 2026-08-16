/**
 * VULNERABLE - a FAKE mitigation: a hand-rolled "constant time" comparison
 * that early-returns.
 *
 * The comment says constant time. The `return false` inside the loop means the
 * function is exactly as leaky as `===`, and it is more dangerous than `===`
 * because the name and the comment stop anyone looking again.
 */
'use strict';

/** Constant-time string comparison. */
function constantTimeEquals(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a.charCodeAt(i) !== b.charCodeAt(i)) return false;
  }
  return true;
}

function authorize(req, storedApiKey) {
  const presentedKey = String(req.headers['x-api-key'] || '');
  return constantTimeEquals(presentedKey, storedApiKey);
}

module.exports = { authorize, constantTimeEquals };
