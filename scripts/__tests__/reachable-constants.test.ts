/**
 * Tests for util-vocabulary attribution.
 *
 * The audit reads the `src/utils/*` a rule imports, because moving a word list
 * one directory over used to clear `unconfigurable-vocabulary` for free — the
 * gate recorded a relocation as a repair.
 *
 * The first version of that fix over-corrected: it charged a rule with EVERY
 * constant in every util it imported. `require-cookie-secure-attrs` imports three
 * cookie-text helpers and was billed for four credential vocabularies it never
 * consults. Acting on that would have added an option for a list the rule does
 * not read — a real option that changes nothing is a promise to the consumer we
 * do not keep, which is worse than the smell it was meant to fix.
 *
 * So both directions are pinned here: a constant a rule can reach is charged, and
 * one it cannot is not.
 */
import { describe, expect, it } from 'vitest';
import { reachableConstants } from '../rule-audit';

const UTIL = `
const SECRET_TERMS = ['password', 'token', 'secret', 'apiKey'];
const COOKIE_FLAGS = ['secure', 'httponly', 'samesite', 'domain'];
const MEASUREMENT_TERMS = ['count', 'length', 'size', 'total'];

export function namesSecret(name) {
  return SECRET_TERMS.includes(name) && !isMeasurement(name);
}

function isMeasurement(name) {
  return MEASUREMENT_TERMS.includes(name);
}

export function staticCookieText(node) {
  return COOKIE_FLAGS.includes(node.name);
}
`;

describe('reachableConstants', () => {
  it('charges a constant the imported binding reads directly', () => {
    expect(reachableConstants(UTIL, ['namesSecret']).has('SECRET_TERMS')).toBe(true);
  });

  /**
   * The whole point of the closure walk. `namesSecret` never mentions
   * `MEASUREMENT_TERMS`; it calls `isMeasurement`, which does. A one-level scan
   * would miss it and under-report.
   */
  it('follows a call to another function in the same file', () => {
    expect(reachableConstants(UTIL, ['namesSecret']).has('MEASUREMENT_TERMS')).toBe(true);
  });

  /**
   * The over-attribution case, by name. This is the regression that prompted the
   * fix: importing the cookie helper must not bill the rule for credential
   * vocabularies sitting in the same file.
   */
  it('does NOT charge a constant the imported binding cannot reach', () => {
    const reach = reachableConstants(UTIL, ['staticCookieText']);
    expect(reach.has('COOKIE_FLAGS')).toBe(true);
    expect(reach.has('SECRET_TERMS')).toBe(false);
    expect(reach.has('MEASUREMENT_TERMS')).toBe(false);
  });

  it('charges the union when several bindings are imported', () => {
    const reach = reachableConstants(UTIL, ['namesSecret', 'staticCookieText']);
    expect([...reach].sort()).toEqual(
      expect.arrayContaining(['COOKIE_FLAGS', 'MEASUREMENT_TERMS', 'SECRET_TERMS']),
    );
  });

  it('charges nothing when the rule imports nothing from the util', () => {
    expect([...reachableConstants(UTIL, [])]).toEqual([]);
  });

  it('charges nothing for a binding the util does not define', () => {
    expect([...reachableConstants(UTIL, ['notARealExport'])]).toEqual([]);
  });

  /** These utils call each other in cycles; the walk must terminate. */
  it('terminates on mutually recursive helpers', () => {
    const cyclic = `
      const TERMS = ['a', 'b', 'c', 'd'];
      export function ping(n) { return pong(n) || TERMS.includes(n); }
      function pong(n) { return ping(n); }
    `;
    expect(reachableConstants(cyclic, ['ping']).has('TERMS')).toBe(true);
  });

  it('handles an arrow-function export', () => {
    const arrows = `
      const ARROW_TERMS = ['x', 'y', 'z', 'w'];
      export const isArrowy = (n) => ARROW_TERMS.includes(n);
    `;
    expect(reachableConstants(arrows, ['isArrowy']).has('ARROW_TERMS')).toBe(true);
  });
});
