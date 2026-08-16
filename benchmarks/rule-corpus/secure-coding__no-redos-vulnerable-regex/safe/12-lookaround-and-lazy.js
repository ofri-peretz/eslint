/**
 * SAFE (adversarial) - Lookbehind, lookahead, and lazy quantifiers: the three
 * constructs most likely to make a shape-based matcher lose its footing. All
 * three patterns are anchored or bounded and none of them can backtrack.
 */
const PRICE = /(?<=\$)\d+(?:\.\d{2})?/;
const STRONG_PIN = /^(?=.*\d)(?=.*[a-z])[a-z0-9]{8,12}$/;
const FIRST_TAG = /<([a-z][a-z0-9]*?)>/i;

export function extractPrice(text) {
  return text.match(PRICE)?.[0] ?? null;
}

export function isStrongPin(value) {
  return STRONG_PIN.test(value);
}

export function firstTag(html) {
  return html.match(FIRST_TAG)?.[1] ?? null;
}
