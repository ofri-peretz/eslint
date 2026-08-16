/**
 * VULNERABLE (partial mitigation, judged honestly) - Stripping `*` blocks the
 * wildcard-dump payload and nothing else. `)(uid=admin` still closes the filter,
 * because `(`, `)`, `\` and NUL are untouched. RFC 4515 escaping is all five or
 * none, so this is vulnerable, not safe.
 */
import ldap from 'ldapjs';

const client = ldap.createClient({ url: 'ldaps://directory.corp.example.com' });

export function findEmployee(req, res, next) {
  const term = String(req.query.term).replace(/\*/g, '');
  const filter = `(|(cn=${term})(mail=${term}))`;
  client.search('ou=people,dc=corp,dc=example,dc=com', { filter, scope: 'sub' }, (err, result) => {
    if (err) return next(err);
    result.on('searchEntry', (entry) => res.json(entry.pojo));
  });
}
