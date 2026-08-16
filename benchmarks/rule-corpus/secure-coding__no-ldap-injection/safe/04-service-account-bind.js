/**
 * SAFE - The canonical ldapjs service-account bind, straight out of the README:
 * `client.bind(dn, password, cb)`. The DN is a module constant and the password
 * comes from the environment. A bind password is an LDAP protocol field, not a
 * filter - there is no filter grammar for it to escape out of, so CWE-90 does
 * not apply to this call at all.
 */
import ldap from 'ldapjs';

const client = ldap.createClient({ url: 'ldaps://directory.corp.example.com' });

const SERVICE_DN = 'cn=svc-directory,ou=service,dc=corp,dc=example,dc=com';

export function connect(callback) {
  const password = process.env.LDAP_BIND_PASSWORD;
  client.bind(SERVICE_DN, password, callback);
}
