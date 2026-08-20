/**
 * VULNERABLE - CWE-1321 through a NON-FINAL __proto__ step.
 *
 * `o['__proto__']` READS the getter and returns Object.prototype; the write on
 * the next step lands there. Verified. Contrast safe/13, where __proto__ is the
 * FINAL property and only re-parents the one object.
 */
export function taint(o) {
  o['__proto__'].polluted = 1;
}
