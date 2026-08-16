/**
 * SAFE (adversarial) - The file imports ldapjs, so the file gate is open, and
 * then calls `.add`, `.delete` and `.search` on a Set, a Map and an Array. Those
 * names are on the LDAP method list but the receivers are collections, and none
 * of these calls speak LDAP. This is the shape that produced the historical
 * Shopify/cli false positives.
 */
import ldap from 'ldapjs';

const client = ldap.createClient({ url: 'ldaps://directory.corp.example.com' });

const seenAttributes = new Set();
const entryCache = new Map();

export function indexEntry(req, entry) {
  seenAttributes.add(req.body.attributeName, entry.dn);
  entryCache.delete(req.params.dn, entry);
  return [entry].search?.(req.query.term, entry);
}

export { client };
