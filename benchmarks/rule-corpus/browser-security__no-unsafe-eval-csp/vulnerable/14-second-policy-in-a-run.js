/** VULNERABLE - ADVERSARIAL. Byte-for-byte an unsafe policy, and short. Its
 *  only purpose is to be linted AFTER another unsafe file in the same process,
 *  which is what ESLint does to every project. A matcher that carries state
 *  between calls starts its search past the offset this policy occupies and
 *  reports nothing at all. */
export const csp = "script-src 'unsafe-eval'";
