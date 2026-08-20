/**
 * VULNERABLE - DN injection, the other half of CWE-90. The distinguished name is
 * concatenated from a route param, so `admin,ou=service` re-parents the delete
 * onto a different subtree. Escaping here needs dnValue(), not filterValue().
 */
import ldap from 'ldapjs';

const client = ldap.createClient({ url: 'ldaps://directory.corp.example.com' });

export function removeAccount(req, res, next) {
  const dn = 'uid=' + req.params.uid + ',ou=people,dc=corp,dc=example,dc=com';
  client.del(dn, (err) => {
    if (err) return next(err);
    res.status(204).end();
  });
}
