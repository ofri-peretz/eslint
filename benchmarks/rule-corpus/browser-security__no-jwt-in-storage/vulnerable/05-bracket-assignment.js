/**
 * VULNERABLE - Web Storage is also a plain object; bracket assignment is the
 * same write.
 */
export function remember(token) {
  localStorage['auth_token'] = token;
}
