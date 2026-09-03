/**
 * SAFE - the remediation for 02/09, written with a named ESM import from the
 * `node:` specifier.
 */
import { randomBytes } from 'node:crypto';

import store from '../lib/session-store.js';

export function makeSessionToken() {
  return randomBytes(32).toString('base64url');
}

export async function login(res, user) {
  const sessionToken = makeSessionToken();
  await store.put(sessionToken, { userId: user.id });
  res.setHeader('Set-Cookie', `sid=${sessionToken}; HttpOnly; Secure; Path=/`);
  return sessionToken;
}
