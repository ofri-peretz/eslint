/** SAFE - the header names appear only in documentation and in a UI string.
 *  Nothing here reaches a response.
 *
 *  Our edge layer already sets Content-Security-Policy, X-Frame-Options and
 *  X-Content-Type-Options for every route; do not set them again per handler.
 */
export const AUDIT_ROWS = [
  { name: 'Content-Security-Policy', status: 'enforced at the edge' },
  { name: 'X-Frame-Options', status: 'enforced at the edge' },
];
