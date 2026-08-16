/**
 * SAFE - authorisation decision on a role string.
 *
 * The role is a low-cardinality enum the user is allowed to know. Timing tells
 * an attacker whether they are an admin, which the response body tells them
 * anyway.
 */
'use strict';

const ADMIN_ROLES = ['admin', 'owner'];

function requireRole(wanted) {
  return function guard(req, res, next) {
    const actual = req.user.role;

    if (actual !== wanted && !ADMIN_ROLES.includes(actual)) {
      res.status(403).send('forbidden');
      return;
    }

    next();
  };
}

module.exports = { requireRole };
