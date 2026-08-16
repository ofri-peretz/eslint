/**
 * VULNERABLE - Computed access on a region map; the key is dynamic, the
 * cleartext value is written down.
 */
const BY_REGION = { 'eu-west': 'ws://eu.acme-corp.io/feed' };

export function socketFor(region) {
  return BY_REGION[region];
}
