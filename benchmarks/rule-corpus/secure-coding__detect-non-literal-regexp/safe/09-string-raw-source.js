/**
 * ADVERSARIAL, SAFE — `String.raw` around the pattern source.
 *
 * `String.raw` is the idiomatic way to write a regex source as a string without
 * doubling every backslash, and it is what TypeScript's own handbook suggests
 * for constructed patterns. The quasi has no substitutions, so the produced
 * string is fixed at parse time — as constant as a plain literal, just spelled
 * as a TaggedTemplateExpression.
 */
export const SEMVER = new RegExp(String.raw`^\d+\.\d+\.\d+(?:-[\w.]+)?$`);

export function isSemver(value) {
  return SEMVER.test(value);
}
