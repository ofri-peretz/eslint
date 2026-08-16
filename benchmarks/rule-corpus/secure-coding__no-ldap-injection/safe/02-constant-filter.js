/**
 * SAFE - A fully constant filter. Nothing crosses a trust boundary; the only
 * interpolation folds to module constants written in this file.
 */
import ldap from 'ldapjs';

const client = ldap.createClient({ url: 'ldaps://directory.corp.example.com' });

const PERSON_CLASS = 'inetOrgPerson';
const ACTIVE_ACCOUNTS = `(&(objectClass=${PERSON_CLASS})(!(accountStatus=disabled)))`;

export function listActive(callback) {
  client.search(
    'ou=people,dc=corp,dc=example,dc=com',
    { filter: ACTIVE_ACCOUNTS, scope: 'sub' },
    callback,
  );
}
