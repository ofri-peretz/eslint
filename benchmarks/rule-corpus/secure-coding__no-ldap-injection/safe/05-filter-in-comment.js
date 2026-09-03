/**
 * SAFE - The sink vocabulary appears ONLY in a comment and in a log string.
 * The executable code builds no filter and reaches no directory.
 *
 * Historical note: this endpoint used to run
 *   client.search(base, { filter: `(uid=${req.query.uid})` })
 * which was replaced by the cached projection below.
 */
import ldap from 'ldapjs';

export const LDAP_FILTER_DOCS = 'https://ldap.com/ldap-filters/';

export function describeSearch(req, res) {
  res.json({
    note: 'filter syntax is (uid=<value>), see the docs link',
    docs: LDAP_FILTER_DOCS,
    clientVersion: ldap.version,
    requested: req.params.topic,
  });
}
