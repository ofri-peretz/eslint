/**
 * VULNERABLE (adversarial) - Optional chaining on the sink. `client?.search?.(…)`
 * is an OptionalCallExpression whose callee is an OptionalMemberExpression; the
 * injection is identical.
 */
import ldap from 'ldapjs';

let client = null;

export function connect() {
  client = ldap.createClient({ url: 'ldaps://directory.corp.example.com' });
}

export function findEmployee(req, res, next) {
  client?.search?.(
    'ou=people,dc=corp,dc=example,dc=com',
    { filter: `(mail=${req.query.email})`, scope: 'sub' },
    (err, result) => {
      if (err) return next(err);
      result.on('searchEntry', (entry) => res.json(entry.pojo));
    },
  );
}
