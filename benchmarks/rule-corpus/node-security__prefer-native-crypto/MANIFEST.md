# Rule corpus — `node-security/prefer-native-crypto` (CWE-1104)

Written from CWE-1104 semantics and real Node module idiom, **not** from the
rule's own test file. The point is independent evidence: a corpus derived from
the tests can only re-derive what the author already thought of.

Each fixture is one file, one shape, with the rationale in a header comment.
`vulnerable/` must be reported; `safe/` must stay quiet.

The sink family is **every syntactic site where a module specifier enters a
file**, judged against a closed set of libraries whose job `node:crypto` already
does. Two questions therefore matter independently: *did the rule see the
specifier at all*, and *is the set the right set*.

## Vulnerable

| # | Shape |
|---|---|
| 01 | `require('node-forge')` generating an RSA keypair |
| 02 | `import sjcl from 'sjcl'` for AES-CCM |
| 03 | `import sha256 from 'js-sha256'` in request-signing middleware |
| 04 | `require('bcryptjs')` on the registration path → password-hash message |
| 05 | `.ts` — `aes-js` CTR mode with byte-array casts |
| 06 | `await import('node-forge')` on a lazy certificate path |
| 07 | `export { default as legacyCipher } from 'sjcl'` — an internal barrel |
| 08 | `createRequire(import.meta.url)('js-md5')` from an ESM CLI |
| 09 | `.ts` — specifier hoisted to a `const`, `require(HASH_PACKAGE)` |
| 10 | `require('node-forge/lib/rsa')` — a deep subpath of a listed package |
| 11 | `require('md5')` — a package the list was missing |
| 12 | `import shajs from 'sha.js'` — likewise |
| 13 | **adversarial** — `.ts`, `import forge = require('node-forge')` |
| 14 | **adversarial** — `` require(`sjcl`) ``, backticks |
| 15 | **adversarial** — `import(/* webpackChunkName */ 'sjcl')` |

## Safe

| # | Shape |
|---|---|
| 01 | the remediation of 01 — `generateKeyPairSync` |
| 02 | `require('bcrypt')`, the native binding the rule's own message recommends |
| 03 | `argon2` — third-party by necessity, `node:crypto` has no Argon2 |
| 04 | the remediation of 03 — `createHmac` |
| 05 | `require('./forge-adapter')` — a LOCAL path containing a library name |
| 06 | `.ts` — `jose`, which implements JWS/JWE, a format the platform lacks |
| 07 | `@noble/hashes/sha256` — audited, and the scoped-specifier base-name probe |
| 08 | a dependency report: every library name is DATA in a table |
| 09 | a local object named `forge`, backed by `createSign` |
| 10 | `.ts` — the remediation of 05, AES-GCM with a key cast |
| 11 | the migration comment |
| 12 | `node:tls` / `node:https` — platform TLS |
| 13 | **adversarial** — a stub registry with its own `function require` |
| 14 | **adversarial** — `node-forge-parser-shim`, `md5-file-stream`: prefix lookalikes |
| 15 | **adversarial** — `.ts`, `@peculiar/webcrypto`, a scoped polyfill |
| 16 | **adversarial** — `import('./legacy/sjcl-adapter.js')`, a relative path |
| 17 | **adversarial** — `export const` with no `from`, values naming the libraries |
| 18 | **adversarial** — a local `const md5` bound to `createHash` |

## What this corpus proved

Scored on the full 33 fixtures, before and after:

| | TP | FP | FN | Precision | Recall | F1 |
|---|---:|---:|---:|---:|---:|---:|
| before | 6 | 1 | 9 | 85.7% | 40.0% | 54.5% |
| after | 15 | 0 | 0 | 100% | 100% | 100% |

**Seven false negatives are the identical specifier-site gap `no-cryptojs` had**
— `import()`, `export … from`, `export * from`, `import x = require(…)`, a
`const` specifier, a backtick specifier, and `createRequire`. The two rules
shipped byte-identical detection code, so they shipped byte-identical blind
spots. Both now use the same six-site listener.

**One false positive from the same cause as `no-cryptojs`** — a local
`function require` in a stub registry (safe/13).

**Two false negatives were the LIST, not the plumbing.** `md5`, `sha.js` and
`hash.js` are the same thing as `js-md5` / `js-sha256` — a pure-JS
reimplementation of a primitive `node:crypto` exposes — and were absent because
the set had been assembled from the `js-*` naming convention rather than from
what the packages do. `js-sha1` was added alongside for the same reason.
`crypto-browserify` was deliberately **not** added: it exists to stand in *for*
`node:crypto` where `node:crypto` does not exist, so "migrate to native crypto"
is advice its consumers cannot take. That exclusion has its own `valid` test.

**Two design decisions the corpus confirmed rather than changed.** The base-name
split (`specifier.split('/')[0]`) means a scoped package's base name is its
*scope*, so `@noble/hashes` and `@peculiar/webcrypto` are never judged — correct
here, since the listed packages are all unscoped, but it is a silent abstention
worth knowing about. And membership stays exact: `node-forge-parser-shim` and
`md5-file-stream` are quiet, where a prefix test would report both.
