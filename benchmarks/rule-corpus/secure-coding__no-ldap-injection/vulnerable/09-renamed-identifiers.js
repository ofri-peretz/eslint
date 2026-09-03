/**
 * VULNERABLE (adversarial, false-negative direction) - Byte-for-byte the same
 * injection as 01, with every identifier renamed to an innocuous word: no `req`,
 * no `query`, no `user`, no `input`, no `filter`. This is the test nobody runs.
 * A rule that decides from evidence still reports it; a rule that decides from
 * spelling goes quiet.
 */
import ldap from 'ldapjs';

const client = ldap.createClient({ url: 'ldaps://directory.corp.example.com' });

export function handleLookup(envelope, reply, onFailure) {
  const criterion = envelope.parsed.needle;
  const spec = `(uid=${criterion})`;
  client.search('ou=people,dc=corp,dc=example,dc=com', { filter: spec, scope: 'sub' }, (err, result) => {
    if (err) return onFailure(err);
    result.on('searchEntry', (entry) => reply.json(entry.pojo));
  });
}
