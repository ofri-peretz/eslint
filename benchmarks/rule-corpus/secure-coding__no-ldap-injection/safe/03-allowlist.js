/**
 * SAFE - The request only chooses a key; the value that reaches the filter is
 * always one of three literals written in this file. An attacker controls which
 * constant is used, never the filter text.
 */
import ldap from 'ldapjs';

const client = ldap.createClient({ url: 'ldaps://directory.corp.example.com' });

const DEPARTMENT_FILTERS = Object.freeze({
  engineering: '(ou=engineering)',
  sales: '(ou=sales)',
  support: '(ou=support)',
});

export function listDepartment(req, res, next) {
  const filter = DEPARTMENT_FILTERS[req.params.department];
  if (!filter) return res.status(400).json({ error: 'unknown department' });
  client.search('ou=people,dc=corp,dc=example,dc=com', { filter, scope: 'sub' }, (err, result) => {
    if (err) return next(err);
    result.on('searchEntry', (entry) => res.json(entry.pojo));
  });
}
