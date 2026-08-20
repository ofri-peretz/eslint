# Rule corpus - `postgresql-security/no-insecure-ssl` (CWE-319)

## What the rule owns

A PostgreSQL connection that negotiates TLS and then does not authenticate the
server. The encryption is real; the identity check is not. An attacker on the
network path presents any certificate and reads or rewrites every row.

Two spellings say the same thing, and the corpus holds both:

- `ssl: { rejectUnauthorized: false }` — the node-postgres / Node TLS option
- `?sslmode=no-verify` in the DSN — libpq's equivalent, and the one that slips
  through review because it looks like configuration rather than code

## What each fixture proves

| fixture | proves |
|---|---|
| `vulnerable/01` | the canonical `new Pool({ ssl: { rejectUnauthorized: false } })` |
| `vulnerable/02` | `new pg.Pool(...)` — the namespace spelling of the same callee |
| `vulnerable/03` | the config object is one binding away from the constructor |
| `vulnerable/04` | the `ssl` block itself is the extracted binding |
| `vulnerable/05` | a TypeScript `as PoolConfig` cast, which is erased and changes nothing |
| `vulnerable/06` | `rejectUnauthorized` folds to `false` through a named constant |
| `vulnerable/07` | the DSN spelling, `sslmode=no-verify` |
| `safe/01` | the remediation: `rejectUnauthorized: true` with a pinned CA |
| `safe/02` | `ssl: true` — verification on, via Node's default trust store |
| `safe/03` | the DSN remediation, `sslmode=verify-full` |
| `safe/04` | no `ssl` key at all |
| `safe/05` | the value is decided at runtime from an env var |
| `safe/06` | a `Pool` from `generic-pool` — the SPELLING of the callee is not evidence |
| `safe/07` | `new https.Agent({ rejectUnauthorized: false })` — a real weakness, owned by another plugin |

## Deliberately out of scope

- **No `ssl` key.** pg defaults to no TLS. That is a deployment decision — a unix
  socket, a service mesh terminating mTLS, a local development database — and
  reporting it fires on essentially every non-production config. `safe/04` pins
  the abstention.
- **A runtime-decided value** (`safe/05`). The file does not disable
  verification; an operator might. That is not a source defect.
- **`https.Agent`, `fetch`, and every other non-PostgreSQL TLS client**
  (`safe/07`). Real weaknesses, owned by `node-security`. A ruleset that bills
  the same line from two plugins is one users stop trusting.

## Adversarial wave

Written after the rule first scored 100%, aimed squarely at breaking it. It
took the score to **90.0%** and found two real defects:

| fixture | what it broke |
|---|---|
| `vulnerable/10-computed-key` | computed keys were skipped entirely, so `{ ['ssl']: { ['rejectUnauthorized']: false } }` turned the finding off — an evasion costing two characters |
| `vulnerable/11-falsy-zero` | the value was compared to `false` by identity. Node COERCES the option: measured on this Node build, `new TLSSocket(sock, { rejectUnauthorized: 0 })` reports `_rejectUnauthorized === false` exactly as `false` does |
| `vulnerable/08-shorthand-property` | (held) ES6 shorthand `{ ssl }` |
| `vulnerable/09-spread-config` | (held) the insecure block layered over a spread base |
| `safe/08-reassigned-config` | (held) a config written twice — abstaining is correct |
| `safe/09-other-driver-ssl` | (held) an `ioredis` client with the identically-spelled option |
| `safe/10-runtime-flag` | (held) a value decided at runtime |

`undefined` is deliberately NOT treated as falsy here: an absent option takes
`tls.connect`'s default, which is to verify.
