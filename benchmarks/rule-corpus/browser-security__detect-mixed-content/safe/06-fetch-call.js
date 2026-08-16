/**
 * SAFE FOR THIS RULE - A request the code makes itself is not a document
 * subresource. `require-https-only` owns the fetch call site.
 */
export async function loadUsers() {
  const res = await fetch('http://api.acme-corp.io/v1/users');
  return res.json();
}
