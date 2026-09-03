/**
 * SAFE (adversarial) - Unicode-mode patterns. `\p{...}` only parses when the
 * parser is told about the `u` flag, so a rule that hard-codes `unicode: false`
 * throws here and either crashes or falls back to guessing.
 */
const LETTERS_ONLY = /^\p{L}+$/u;
const DIGITS_BOUNDED = /^\p{Nd}{1,10}$/u;
const EMOJI = /\p{Extended_Pictographic}/gu;

export function isName(value) {
  return LETTERS_ONLY.test(value);
}

export function isPin(value) {
  return DIGITS_BOUNDED.test(value);
}

export function stripEmoji(value) {
  return value.replace(EMOJI, '');
}
