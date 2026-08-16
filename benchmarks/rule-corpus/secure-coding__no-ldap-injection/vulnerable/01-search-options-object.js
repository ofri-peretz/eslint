/**
 * VULNERABLE - THE canonical ldapjs idiom, copied from the library's own README:
 * `client.search(base, opts, cb)` where `opts.filter` is the filter string.
 * ldapjs has NO positional-filter overload, so this is how every real ldapjs
 * codebase writes a search. `(uid=*)` or `(uid=x)(|(uid=admin)` closes the
 * filter and returns the whole directory.
 */
import ldap from 'ldapjs';

const client = ldap.createClient({ url: 'ldaps://directory.corp.example.com' });

export function findEmployee(req, res) {
  client.search(
    'ou=people,dc=corp,dc=example,dc=com',
    { filter: `(uid=${req.query.uid})`, scope: 'sub', attributes: ['cn', 'mail'] },
    (err, result) => {
      if (err) return res.status(502).end();
      result.on('searchEntry', (entry) => res.json(entry.pojo));
    },
  );
}
