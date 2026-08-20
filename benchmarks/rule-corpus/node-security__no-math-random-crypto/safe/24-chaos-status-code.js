/**
 * SAFE (wave 2, name-inference probe) - a chaos proxy that returns a random
 * HTTP status so the client's retry logic can be exercised.
 *
 * `code` is in the rule's crypto vocabulary because of "verification code".
 * An HTTP status code is a number the server prints in every response.
 */
'use strict';

const FAILURE_CODES = [429, 500, 502, 503, 504];

function chaosMiddleware({ failureRate = 0.1 } = {}) {
  return function chaos(req, res, next) {
    if (Math.random() >= failureRate) return next();
    const httpCode = FAILURE_CODES[Math.floor(Math.random() * FAILURE_CODES.length)];
    res.status(httpCode).json({ error: 'injected failure' });
  };
}

module.exports = { chaosMiddleware };
