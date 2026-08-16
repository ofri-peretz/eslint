/**
 * VULNERABLE - The PII sits one object deeper (`account.holder.email`). The
 * outermost node is still a MemberExpression, so this is the same shape as 02
 * with a longer chain - it exists to prove chain depth is not what decides.
 */
import { syncLedger } from '../integrations/plaid.js';

export async function reconcile(account) {
  try {
    await syncLedger(account.id);
  } catch (err) {
    console.error('Bank sync failed for', account.holder.email);
  }
}
