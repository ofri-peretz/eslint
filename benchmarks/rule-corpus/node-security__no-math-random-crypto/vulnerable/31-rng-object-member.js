/**
 * VULNERABLE (wave 3) - the sink reached through a member of a const object.
 *
 * The "pluggable RNG" abstraction, in its overwhelmingly common state: one
 * implementation, and it is Math.random. Call sites read `rng.next()`, so the
 * callee is a member expression whose object is not `Math`.
 */
'use strict';

const rng = {
  next: Math.random,
};

function newRecoveryCode() {
  const recoveryCode = rng.next().toString(36).slice(2, 10).toUpperCase();
  return recoveryCode;
}

module.exports = { newRecoveryCode, rng };
