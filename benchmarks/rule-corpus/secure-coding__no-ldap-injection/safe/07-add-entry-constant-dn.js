/**
 * SAFE - `client.add(dn, entry, cb)`. The DN is a module constant, and the
 * second argument is an ATTRIBUTE MAP, not a filter: ldapjs encodes each value
 * as a separate BER field, so there is no grammar for the values to escape.
 */
import ldap from 'ldapjs';

const client = ldap.createClient({ url: 'ldaps://directory.corp.example.com' });

const ONBOARDING_DN = 'cn=pending,ou=onboarding,dc=corp,dc=example,dc=com';

export function stageOnboarding(req, res, next) {
  const userEntry = {
    objectClass: 'inetOrgPerson',
    cn: req.body.commonName,
    sn: req.body.surname,
  };
  client.add(ONBOARDING_DN, userEntry, (err) => {
    if (err) return next(err);
    res.status(201).end();
  });
}
