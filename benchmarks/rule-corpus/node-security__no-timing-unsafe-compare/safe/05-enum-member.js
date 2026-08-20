/**
 * SAFE - error dispatch against a namespace of named constants.
 *
 * `AUTH_STOP_POLL` and `INVALID_TOKEN` match the secret vocabulary only
 * because of how the enum members are spelled. The values are printed in the
 * source file; there is nothing for an attacker to discover.
 */
'use strict';

const ErrorCodes = Object.freeze({
  INVALID_TOKEN: 'invalid_token',
  AUTH_STOP_POLL: 'auth_stop_poll',
  RATE_LIMITED: 'rate_limited',
});

function classify(err, req) {
  if (err.code === ErrorCodes.INVALID_TOKEN) return { status: 401, retry: false };
  if (err.code === ErrorCodes.AUTH_STOP_POLL) return { status: 409, retry: false };
  if (req.headers['x-retry'] === ErrorCodes.RATE_LIMITED) return { status: 429, retry: true };
  return { status: 500, retry: false };
}

module.exports = { classify, ErrorCodes };
