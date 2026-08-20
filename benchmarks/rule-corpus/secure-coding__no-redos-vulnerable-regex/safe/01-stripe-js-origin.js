/**
 * SAFE - stripe/stripe-js src/shared.ts:23. Anchored at both ends, two
 * INDEPENDENT optional groups, no nesting. It contains a `?`, a `*` and a
 * trailing `?`, which is exactly why a character-counting heuristic once called
 * it "Nested Quantifier Pattern | CRITICAL". Counting quantifier characters is
 * not the same as finding quantifier nesting.
 */
const STRIPE_V3_URL = /^https:\/\/js\.stripe\.com\/v3\/?(\?.*)?$/;

export function isStripeScript(src) {
  return STRIPE_V3_URL.test(src);
}
