/**
 * VULNERABLE (adversarial) - `String(...)` around the taint. Coercing to a
 * string is not escaping; `String('*)(uid=admin')` is still `*)(uid=admin`.
 */
import ldap from 'ldapjs';

const client = ldap.createClient({ url: 'ldaps://directory.corp.example.com' });

export function findEmployee(req, res, next) {
  const filter = '(cn=' + String(req.query.cn) + ')';
  client.search('ou=people,dc=corp,dc=example,dc=com', { filter, scope: 'sub' }, (err, result) => {
    if (err) return next(err);
    result.on('searchEntry', (entry) => res.json(entry.pojo));
  });
}
