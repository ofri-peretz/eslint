/**
 * VULNERABLE - Express API-key gate using `!==`.
 *
 * `===` on strings short-circuits at the first differing byte. An attacker who
 * can measure response time (or, on a shared host, cache timing) recovers the
 * key one character at a time: 62 * n requests instead of 62^n.
 */
'use strict';

function requireApiKey(req, res, next) {
  const provided = req.headers['x-api-key'];

  if (!provided) {
    res.status(401).json({ error: 'missing key' });
    return;
  }

  if (provided !== process.env.API_KEY) {
    res.status(403).json({ error: 'forbidden' });
    return;
  }

  next();
}

module.exports = { requireApiKey };
