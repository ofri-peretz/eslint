/**
 * VULNERABLE - A fallback list read by index.
 */
const RELAYS = ['wss://a.acme-corp.io', 'ws://b.acme-corp.io'];

export function relay(i) {
  return RELAYS[i];
}
