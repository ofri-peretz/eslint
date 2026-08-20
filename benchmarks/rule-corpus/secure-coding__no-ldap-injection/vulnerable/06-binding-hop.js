/**
 * VULNERABLE - One binding hop between the request and the filter, and the
 * filter is built with `+` rather than a template literal.
 */
import ldap from 'ldapjs';

const client = ldap.createClient({ url: 'ldaps://directory.corp.example.com' });

export function findGroupMembers(req, res, next) {
  const groupName = req.body.group;
  const ldapFilter = '(&(objectClass=groupOfNames)(cn=' + groupName + '))';
  client.search('ou=groups,dc=corp,dc=example,dc=com', { filter: ldapFilter, scope: 'sub' }, (err, result) => {
    if (err) return next(err);
    result.on('searchEntry', (entry) => res.json(entry.pojo));
  });
}
