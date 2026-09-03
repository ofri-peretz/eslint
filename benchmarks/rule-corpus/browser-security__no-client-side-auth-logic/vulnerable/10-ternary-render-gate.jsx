/**
 * VULNERABLE - ADVERSARIAL. The same decision as an expression rather than a
 * statement. React codebases write gates this way far more often than with an
 * `if`, and a rule that only visits `IfStatement` never sees them.
 */
export function Toolbar() {
  return localStorage.getItem('isAdmin') ? <DangerZone /> : <ReadOnlyBanner />;
}
