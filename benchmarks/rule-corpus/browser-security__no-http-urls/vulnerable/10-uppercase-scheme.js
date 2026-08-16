/**
 * VULNERABLE - ADVERSARIAL. Uppercase scheme in a config constant. Two rules in
 * this family were defeated by exactly this; the fixture pins that this one is
 * not.
 */
export const env = { legacyBase: 'HTTP://legacy.acme-corp.io/v0' };
