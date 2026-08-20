/**
 * SAFE — the remediation this rule's own message prescribes: use a `Map`.
 *
 * A Map has no prototype chain to pollute and `set('__proto__', x)` stores an
 * ordinary entry. There is no computed member access anywhere in the file. If a
 * rule reports here it is telling users that taking its advice is still a
 * finding.
 */
const sessions = new Map();

export function storeSession(sessionId, session) {
  sessions.set(sessionId, session);
}

export function readSession(sessionId) {
  return sessions.get(sessionId) ?? null;
}

export function dropSession(sessionId) {
  sessions.delete(sessionId);
}
