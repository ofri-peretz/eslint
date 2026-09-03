/**
 * VULNERABLE (name-inference FALSE-NEGATIVE probe) - the same HMAC check as
 * 02, with both operands renamed to something uninformative.
 *
 * `v` and `expected` say nothing. But the RIGHT operand is structurally a
 * secret whatever it is called: it is the return of `createHmac(...).digest()`.
 * A rule that reads only names cannot see this; a rule that resolves the
 * binding can.
 */
'use strict';

const { createHmac } = require('node:crypto');

function check(req) {
  const v = req.headers['x-sig'];
  const expected = createHmac('sha256', process.env.SECRET).update(req.rawBody).digest('hex');

  if (v === expected) {
    return true;
  }
  return false;
}

module.exports = { check };
