/**
 * VULNERABLE - Computed property access on a region map. The key is dynamic;
 * the cleartext value is written down all the same.
 */
const REGIONS = { 'eu-west': 'http://eu.acme-corp.io/v1' };

export function regionUrl(region) {
  return REGIONS[region];
}
