/**
 * SAFE FOR THIS RULE - The constructor's argument is a MemberExpression, not a
 * URL — the literal lives inside the array. This rule has no string at the
 * constructor to judge or to autofix, and `no-insecure-websocket` reports the
 * cleartext element where it is written.
 *
 * Written as a `safe/` fixture deliberately: it was the obvious candidate for a
 * false negative, and the honest answer is that the family covers it at the
 * other end. Exactly one rule reports this file.
 */
export function connectFallback(i) {
  return new WebSocket(['wss://a.acme-corp.io', 'ws://b.acme-corp.io'][i]);
}
