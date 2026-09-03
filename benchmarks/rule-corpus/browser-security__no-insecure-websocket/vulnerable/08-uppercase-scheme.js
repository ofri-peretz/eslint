/**
 * VULNERABLE - ADVERSARIAL. URL schemes are ASCII case-insensitive, so this
 * opens exactly the same cleartext channel. A rule that tests
 * `startsWith('ws://')` is defeated by the shift key — and legacy endpoints,
 * the ones most likely to still be cleartext, are also the ones most likely to
 * be written this way.
 */
export const SOCKETS = { legacy: 'WS://legacy.acme-corp.io/feed' };
