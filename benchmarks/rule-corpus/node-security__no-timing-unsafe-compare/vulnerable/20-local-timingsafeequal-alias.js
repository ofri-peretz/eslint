/**
 * VULNERABLE (wave 2) - a LOCAL function wearing the trusted name.
 *
 * `timingSafeEqual` here is `(a, b) => a === b`. Every call site reads as
 * remediated code and every call site is a timing oracle. This is the shape a
 * codebase reaches after somebody stubbed the helper "to avoid the Buffer
 * conversion for now".
 */
'use strict';

const timingSafeEqual = (a, b) => a === b;

async function authorize(req, tokenStore) {
  const providedToken = req.headers['x-auth-token'];
  const storedToken = await tokenStore.current();

  return timingSafeEqual(providedToken, storedToken);
}

module.exports = { authorize };
