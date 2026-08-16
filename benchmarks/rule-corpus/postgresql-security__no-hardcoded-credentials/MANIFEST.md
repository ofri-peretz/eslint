# Rule corpus - `postgresql-security/no-hardcoded-credentials` (CWE-798)

## What the rule owns

A PostgreSQL connection secret written into the source. Once it is there it is
in git history, in every clone, and in every CI log that prints the config.

Two spellings, both in the corpus:

- `password: '…'` on a `Pool` / `Client` config
- the password in the userinfo of a DSN — `postgres://user:PASSWORD@host/db`

## The line this rule has to walk

The weakness is a SECRET, not a connection string. Reporting every DSN is the
false positive that gets the rule switched off, because
`postgres://db.internal:5432/orders` contains no secret at all — peer, IAM or
certificate authentication supplies one at connect time. Half the safe fixtures
here exist to pin that distinction.

## What each fixture proves

| fixture | proves |
|---|---|
| `vulnerable/01` | the canonical `password: '…'` literal |
| `vulnerable/02` | the same secret spelled as a DSN |
| `vulnerable/03` | the DSN as the bare constructor argument |
| `vulnerable/04` | `new pg.Pool(...)` — the namespace spelling of the callee |
| `vulnerable/05` | the config object declared one binding above the constructor |
| `vulnerable/06` | a TypeScript `satisfies PoolConfig` clause, which is erased |
| `vulnerable/07` | the secret hoisted into a named constant |
| `vulnerable/08` | a computed key: `{ ['password']: … }` |
| `vulnerable/09` | ES6 shorthand `{ password }` |
| `vulnerable/10` | a scoped driver — the package root is `@vercel/postgres` |
| `vulnerable/11` | the secret layered over a spread base config |
| `safe/01`–`03` | the remediations: env vars, an env DSN, a secret manager |
| `safe/04` | **a DSN with a host and database and NO credentials** |
| `safe/05` | a DSN assembled from env vars at runtime |
| `safe/06` | `password: ''` — a unix-socket / trust-auth setup |
| `safe/07` | a `Client` from `../test/fake-transport` — spelling is not evidence |
| `safe/08` | a localhost development DSN with a user but no password |
| `safe/09` | the password read from a call — its value is not in this file |
| `safe/10` | a config binding written twice — abstaining is correct |
| `safe/11` | a `${PGHOST}` deploy-time placeholder |
| `safe/12` | a `password` key on a seed-user object, not a connection config |

## Deliberately out of scope

- **A username.** `postgres://app@host/db` names an account; it is not a secret.
- **An empty password.** `password: ''` discloses nothing.
- **Values this file cannot see** — a call, an env var, a secret-manager await.
  The rule reports a secret it can NAME, not everything it cannot prove safe.
- **Every non-PostgreSQL constructor**, however it is spelled. `safe/07` pins it.

## Adversarial wave

Fixtures 08–11 (vulnerable) and 09–12 (safe) were written after the rule first
scored 100%, aimed at breaking it. The score HELD at 100% — the structural
rewrite (resolve the binding, fold the value, parse the DSN) already covered
computed keys, shorthand, scoped packages and spreads, because none of those is
a special case once the rule stops pattern-matching the source text.
