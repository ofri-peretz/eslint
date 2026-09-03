/**
 * VULNERABLE - Written from inside a helper, mid-file.
 */
export function stashRecovery(user) {
  const value = user.recoveryCodes.join(',');
  sessionStorage.setItem('recovery_code', value);
}
