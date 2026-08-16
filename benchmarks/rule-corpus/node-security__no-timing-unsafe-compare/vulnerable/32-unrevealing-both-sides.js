/**
 * VULNERABLE (wave 3, name-inference FALSE-NEGATIVE probe) - a real secret
 * with no crypto call to anchor it and no revealing name on either side.
 *
 * `w` is a live signing credential pulled from the vault. `v` is the header
 * the caller sent. This is the same finding as 01 with the identifiers
 * renamed, and there is no structural evidence in the file that says "secret"
 * - the vault call is an ordinary method on an ordinary object.
 */
'use strict';

const vault = require('../lib/vault');

async function gate(req, res, next) {
  const v = req.headers['x-svc'];
  const w = await vault.get('service-credential');

  if (v !== w) {
    res.status(403).send('forbidden');
    return;
  }

  next();
}

module.exports = { gate };
