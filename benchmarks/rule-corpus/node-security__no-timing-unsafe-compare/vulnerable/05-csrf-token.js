/**
 * VULNERABLE - double-submit CSRF check with `!==`.
 *
 * The submitted half is attacker-supplied; the stored half is the secret. A
 * timing oracle here lets an off-origin page learn the victim's CSRF token and
 * forge state-changing requests.
 */
'use strict';

const redis = require('../lib/redis');

async function checkCsrf(req, res, next) {
  const submittedToken = req.body._csrf;
  const storedCsrfToken = await redis.get(`csrf:${req.cookies.sid}`);

  if (submittedToken !== storedCsrfToken) {
    res.status(403).send('csrf failed');
    return;
  }

  next();
}

module.exports = { checkCsrf };
