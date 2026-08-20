/**
 * SAFE (adversarial) - Bounded ranges nested inside an unbounded quantifier,
 * which is the exact shape the relaxed second analysis pass targets. These are
 * linear anyway, because each iteration is terminated by a mandatory character
 * the inner class cannot match: `-`, a newline, a `:`.
 *
 * If the relaxation over-reported, it would report here.
 */
const TAG_CHAIN = /^(?:[a-z]{2,4}-)+$/;
const WRAPPED_BODY = /^(?:.{1,80}\n)+$/;
const CLOCK = /^(?:\d{1,2}:){2}\d{1,2}$/;

export function isTagChain(value) {
  return TAG_CHAIN.test(value);
}

export function isWrapped(value) {
  return WRAPPED_BODY.test(value);
}

export function isClock(value) {
  return CLOCK.test(value);
}
