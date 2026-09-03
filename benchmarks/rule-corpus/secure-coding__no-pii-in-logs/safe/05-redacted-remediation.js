/**
 * SAFE - The CORRECT remediation for fixture 02: log a stable opaque
 * identifier, never the address itself. The word `email` appears only in a
 * comment explaining why it is absent.
 */
import { createHash } from 'node:crypto';

// Deliberately NOT logging account.email - hash it so support can still
// correlate a ticket to a row without the log holding the address.
function correlationId(value) {
  return createHash('sha256').update(value).digest('hex').slice(0, 12);
}

export function logProvisioned(account) {
  console.log('Provisioned account', account.id, correlationId(account.email));
}
