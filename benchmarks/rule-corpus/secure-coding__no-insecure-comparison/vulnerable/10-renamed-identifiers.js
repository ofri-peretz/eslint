/**
 * VULNERABLE (adversarial, false-negative direction) - Fixture 01's bug with the
 * identifiers renamed to innocuous words. `candidate` is still the header the
 * caller sent and `reference` is still the service credential; the comparison is
 * still byte-by-byte and still short-circuits. Only the spelling changed.
 */
import { registry } from '../lib/registry';

export function admit(candidate, tenantId) {
  const reference = registry.lookup(tenantId).credential;
  if (candidate !== reference) {
    throw new Error('rejected');
  }
  return true;
}
