/**
 * VULNERABLE - ADVERSARIAL. The `&&` spelling of the same gate.
 */
const canPurge = sessionStorage.getItem('role') && featureEnabled('purge');
if (canPurge) {
  purgeAuditLog();
}
