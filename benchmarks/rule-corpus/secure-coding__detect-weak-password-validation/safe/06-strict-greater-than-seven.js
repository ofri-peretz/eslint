/**
 * SAFE — `password.length > 7` is a minimum of EIGHT.
 *
 * Eight is the NIST SP 800-63B floor and is exactly what this rule's own
 * documentation lists under "✅ Correct" as `password.length >= 8`. Written with
 * a strict `>` the threshold literal is 7, and a check that asks only
 * "is the literal below 8?" reports the correct code.
 *
 * The four operators do not share one threshold test: `>= n` and `< n` set the
 * minimum at `n`, while `> n` and `<= n` set it at `n + 1`.
 */
export function isAcceptablePassword(password) {
  return password.length > 7 && /[^A-Za-z0-9]/.test(password);
}
