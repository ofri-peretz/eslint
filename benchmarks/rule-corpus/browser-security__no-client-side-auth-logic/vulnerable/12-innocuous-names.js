/**
 * VULNERABLE - FALSE-NEGATIVE DIRECTION. The credential comparison with every
 * telling identifier renamed. The property name is the only evidence there is,
 * so `.password` must stay — but the surrounding names must not matter.
 */
export function step(a, b) {
  if (a.password === b) {
    proceed();
  }
}
