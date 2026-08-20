/**
 * SAFE - The correct remediation: RFC 4515 escaping via the library's own
 * escape helper before the value reaches the filter.
 */
import ldap from 'ldapjs';

const client = ldap.createClient({ url: 'ldaps://directory.corp.example.com' });

export function findEmployee(req, res, next) {
  const filter = `(uid=${ldap.escape.filterValue(req.query.uid)})`;
  client.search('ou=people,dc=corp,dc=example,dc=com', { filter, scope: 'sub' }, (err, result) => {
    if (err) return next(err);
    result.on('searchEntry', (entry) => res.json(entry.pojo));
  });
}
