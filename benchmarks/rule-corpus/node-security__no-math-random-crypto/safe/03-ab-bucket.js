/**
 * SAFE - A/B experiment bucket assignment for anonymous visitors.
 *
 * A visitor who guesses their own bucket gains nothing: they could flip it by
 * clearing a cookie anyway. This is a product decision made with a coin, not a
 * credential.
 */
'use strict';

const VARIANTS = ['control', 'treatment'];

function assignVariant(existing) {
  if (existing && VARIANTS.includes(existing)) return existing;
  const bucket = Math.random() < 0.5 ? VARIANTS[0] : VARIANTS[1];
  return bucket;
}

module.exports = { assignVariant, VARIANTS };
