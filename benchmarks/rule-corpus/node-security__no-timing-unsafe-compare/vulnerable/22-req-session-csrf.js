/**
 * VULNERABLE (wave 2) - the express-session CSRF check, where BOTH operands
 * hang off `req`.
 *
 * `req.session` is server state that express-session rehydrated from the store;
 * `req.body._csrf` is the attacker's. They share a receiver and nothing else.
 * A model that classifies by the ROOT identifier sees one `req` on each side
 * and concludes there is no attacker - which is backwards.
 */
'use strict';

function checkCsrf(req, res, next) {
  if (req.body._csrf !== req.session.csrfToken) {
    res.status(403).send('csrf failed');
    return;
  }
  next();
}

module.exports = { checkCsrf };
