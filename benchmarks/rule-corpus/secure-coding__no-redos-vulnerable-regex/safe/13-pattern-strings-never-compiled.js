/**
 * SAFE (adversarial) - Catastrophic pattern text, as DATA. These strings are a
 * deny-list this project's own scanner greps source files for; nothing here is
 * ever handed to `RegExp`. A rule that matches on printed source reports three
 * times in this file.
 */
export const REDOS_DENY_LIST = Object.freeze({
  nestedPlus: '^(a+)+$',
  starStar: '^([\\/\\w \\.-]*)*$',
  wordRun: '^(\\w+\\s*)+$',
});

export function describeShape(key) {
  return `pattern ${REDOS_DENY_LIST[key]} is rejected: (X+)+ backtracks exponentially`;
}
