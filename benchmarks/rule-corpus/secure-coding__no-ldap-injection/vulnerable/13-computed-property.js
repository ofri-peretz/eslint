/**
 * VULNERABLE (adversarial) - The options object is spread from a constant and
 * the filter is attached through a COMPUTED property key. Same object, same
 * call, a property node the rule has to actually read rather than pattern-match.
 */
import ldap from 'ldapjs';

const client = ldap.createClient({ url: 'ldaps://directory.corp.example.com' });

const FILTER_KEY = 'filter';
const BASE_OPTIONS = { scope: 'sub', attributes: ['cn', 'mail'] };

export function findEmployee(req, res, next) {
  const options = { ...BASE_OPTIONS, [FILTER_KEY]: `(uid=${req.query.uid})` };
  client.search('ou=people,dc=corp,dc=example,dc=com', options, (err, result) => {
    if (err) return next(err);
    result.on('searchEntry', (entry) => res.json(entry.pojo));
  });
}
