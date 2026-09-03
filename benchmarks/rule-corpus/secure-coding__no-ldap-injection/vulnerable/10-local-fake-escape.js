/**
 * VULNERABLE (adversarial) - A LOCAL function wearing a trusted name. It is
 * named `escapeFilterValue` and it does nothing at all. Any rule that decides
 * "escaped" from the callee's spelling will clear this, which is the whole
 * point: the name is not the evidence, the body is.
 */
import ldap from 'ldapjs';

const client = ldap.createClient({ url: 'ldaps://directory.corp.example.com' });

/** @returns the value unchanged - a stub someone left behind */
function escapeFilterValue(value) {
  return value;
}

export function findEmployee(req, res, next) {
  const filter = `(uid=${escapeFilterValue(req.query.uid)})`;
  client.search('ou=people,dc=corp,dc=example,dc=com', { filter, scope: 'sub' }, (err, result) => {
    if (err) return next(err);
    result.on('searchEntry', (entry) => res.json(entry.pojo));
  });
}
