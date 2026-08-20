/**
 * VULNERABLE - The tainted root is a function PARAMETER, not a `req.*` member
 * expression. This is the shape a directory-access layer actually has: the
 * router validates nothing and calls into this helper.
 */
import ldap from 'ldapjs';

const client = ldap.createClient({ url: 'ldaps://directory.corp.example.com' });

export function lookupByLogin(login, callback) {
  const searchFilter = `(sAMAccountName=${login})`;
  client.search('ou=people,dc=corp,dc=example,dc=com', { filter: searchFilter, scope: 'sub' }, callback);
}
