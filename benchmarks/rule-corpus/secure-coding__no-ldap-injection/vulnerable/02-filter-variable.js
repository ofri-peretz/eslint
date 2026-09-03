/**
 * VULNERABLE - The filter is built into a named variable first, then handed to
 * search(). Same injection, one statement earlier. `mail=*)(objectClass=*` turns
 * a single-user lookup into a directory dump.
 */
import ldap from 'ldapjs';

const client = ldap.createClient({ url: 'ldaps://directory.corp.example.com' });

export function findByMail(req, res, next) {
  const filter = `(&(objectClass=inetOrgPerson)(mail=${req.query.email}))`;
  client.search('ou=people,dc=corp,dc=example,dc=com', { filter, scope: 'sub' }, (err, result) => {
    if (err) return next(err);
    result.on('searchEntry', (entry) => res.json(entry.pojo));
  });
}
