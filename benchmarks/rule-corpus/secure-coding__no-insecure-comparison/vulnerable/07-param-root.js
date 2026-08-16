/**
 * VULNERABLE - The tainted root is a function PARAMETER and the enclosing
 * function is named for what it does to invitations, not for security. The
 * secret is still a secret.
 */
import { invitations } from '../store/invitations';

export function redeem(inviteCode, accountId) {
  const record = invitations.get(accountId);
  if (record.secret === inviteCode) {
    invitations.delete(accountId);
    return true;
  }
  return false;
}
