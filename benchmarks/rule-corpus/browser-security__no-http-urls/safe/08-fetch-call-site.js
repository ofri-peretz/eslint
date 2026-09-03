/**
 * SAFE FOR THIS RULE - A request the code makes itself. `require-https-only`
 * owns the call site, where it can say a REQUEST is made rather than that a
 * string exists.
 */
export function loadUsers() {
  return fetch('http://api.acme-corp.io/v1/users');
}
