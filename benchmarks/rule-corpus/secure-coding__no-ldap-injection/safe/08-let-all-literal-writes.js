/**
 * SAFE (adversarial) - A `let` reassigned on a branch, but EVERY write is a
 * module constant written in this file. Nothing an attacker supplies reaches the
 * filter; the request only selects which constant is used.
 */
import ldap from 'ldapjs';

const client = ldap.createClient({ url: 'ldaps://directory.corp.example.com' });

const ACTIVE = '(&(objectClass=inetOrgPerson)(!(accountStatus=disabled)))';
const ALL = '(objectClass=inetOrgPerson)';

export function listPeople(req, res, next) {
  let filter = ACTIVE;
  if (req.query.includeDisabled === 'true') {
    filter = ALL;
  }
  client.search('ou=people,dc=corp,dc=example,dc=com', { filter, scope: 'sub' }, (err, result) => {
    if (err) return next(err);
    result.on('searchEntry', (entry) => res.json(entry.pojo));
  });
}
