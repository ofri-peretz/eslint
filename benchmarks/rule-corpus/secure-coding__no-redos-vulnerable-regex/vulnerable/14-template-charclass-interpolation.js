/**
 * VULNERABLE (adversarial) - The interpolation lands INSIDE a character class,
 * and the catastrophic nesting is entirely in the static text around it:
 * `^([<chars>]+)+$`. A text matcher looking for quantifier characters either
 * side of the interpolation has to guess; the structure is unambiguous.
 */
export function createAlphabetMatcher(allowedChars) {
  return new RegExp(`^([${allowedChars}]+)+$`, 'i');
}
