/**
 * VULNERABLE - the attacker's value arrives by destructuring `req.headers`.
 *
 * The single commonest way a header is read in an Express handler. The secret
 * is the admin bearer token loaded at boot.
 */
'use strict';

const adminBearerToken = process.env.ADMIN_BEARER;

function requireAdmin(req, res, next) {
  const { authorization } = req.headers;

  if (authorization === adminBearerToken) {
    next();
    return;
  }

  res.status(403).send('forbidden');
}

module.exports = { requireAdmin };
