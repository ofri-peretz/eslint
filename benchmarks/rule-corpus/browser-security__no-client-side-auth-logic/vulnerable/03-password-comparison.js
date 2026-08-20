/**
 * VULNERABLE - A credential compared in the client. Whatever this branch
 * protects, the comparison runs on the attacker's machine.
 */
export function unlock(vault, entered) {
  if (vault.password === entered) {
    revealSecrets();
  }
}
