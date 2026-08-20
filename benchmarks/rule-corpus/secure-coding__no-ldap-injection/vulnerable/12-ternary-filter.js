/**
 * VULNERABLE (adversarial) - A ternary picks between a safe constant and an
 * interpolated filter. One branch is attacker-controlled, which is enough.
 */
import ldap from 'ldapjs';

const client = ldap.createClient({ url: 'ldaps://directory.corp.example.com' });

const ALL_PEOPLE = '(objectClass=inetOrgPerson)';

export function browse(req, res, next) {
  client.search(
    'ou=people,dc=corp,dc=example,dc=com',
    { filter: req.query.cn ? `(cn=${req.query.cn})` : ALL_PEOPLE, scope: 'sub' },
    (err, result) => {
      if (err) return next(err);
      result.on('searchEntry', (entry) => res.json(entry.pojo));
    },
  );
}
