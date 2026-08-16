# Rule corpus — `node-security/no-insecure-key-derivation` (CWE-916)

Written from CWE-916 semantics and real Node KDF idiom, **not** from the rule's
own test file. The point is independent evidence: a corpus derived from the
tests can only re-derive what the author already thought of.

Each fixture is one file, one shape, with the rationale in a header comment.
`vulnerable/` must be reported; `safe/` must stay quiet.

Two independent questions: *did the rule recognise the call as PBKDF2*, and
*could it read the iteration count it was handed*. The corpus separates them,
because the rule failed at both.

**Scope.** The rule claims "PBKDF2 with insufficient iterations", so the corpus
stays on PBKDF2 — including the crypto-js and Web Crypto spellings, which are
the same primitive under different call conventions. Adjacent CWE-916 shapes
(`scrypt` with a low `N`, `bcrypt.hash(pw, 4)`) are deliberately excluded rather
than counted as misses; they appear in `safe/` only where the rule must not
mistake them for PBKDF2.

## Vulnerable

| # | Shape |
|---|---|
| 01 | `pbkdf2Sync(pw, salt, 1000, 64, 'sha512')` on an Express register route |
| 02 | the callback form, `pbkdf2(…, 10000, …)`, imported as a bare identifier |
| 03 | `const KDF_ROUNDS = 5000` hoisted beside the call |
| 04 | `const pbkdf2Async = promisify(pbkdf2)` — 2,048 rounds |
| 05 | `util.promisify(crypto.pbkdf2)(…)` inline — 4,096 rounds |
| 06 | `.ts` — Web Crypto `subtle.deriveBits({ name: 'PBKDF2', iterations: 1000 })` |
| 07 | crypto-js `CryptoJS.PBKDF2(pw, salt, { iterations: 1000 })` |
| 08 | `const ROUNDS = 10 * 1000` — units spelled as arithmetic |
| 09 | `import { pbkdf2Sync as deriveKeyMaterial }` — renamed at the boundary |
| 10 | one iteration — the degenerate case |
| 11 | `import * as nodeCrypto` namespace form, 20,000 rounds |
| 12 | `.ts` — `const KDF = {…} as const`, sink receives `KDF.iterations` |
| 13 | **adversarial** — `const KDF_ROUNDS = 2 ** 12` |
| 14 | **adversarial** — `.ts`, the Web Crypto parameter object hoisted to a const |
| 15 | **adversarial** — `const kdf = crypto.pbkdf2Sync`, called under the alias |

## Safe

| # | Shape |
|---|---|
| 01 | the remediation of 01 — 600,000 iterations |
| 02 | the same floor held in a const |
| 03 | `1_200_000` — numeric separators are not a different value |
| 04 | `scryptSync` with `N = 2^15` — one of the rule's own recommended alternatives |
| 05 | Argon2id — the other one |
| 06 | **positional probe**: the small number is `keylen` (32), iterations is 600,000 |
| 07 | a verifier re-deriving with the iteration count STORED on the record |
| 08 | a wrapper whose iteration count is a parameter; its caller passes the floor |
| 09 | the migration comment and note string |
| 10 | `hkdfSync` — expands high-entropy input, has no iteration count by design |
| 11 | `.ts` — the `pbkdf2` npm ponyfill at 650,000 |
| 12 | the remediation of 06 — the same Web Crypto call at the floor |
| 13 | **adversarial** — `deriveBits({ name: 'HKDF', … })` on the same sink |
| 14 | **adversarial** — `.ts`, `deriveBits({ name: 'ECDH', … })` |
| 15 | **adversarial** — the remediation of 07, crypto-js PBKDF2 at 600,000 |
| 16 | **adversarial** — `promisify(crypto.scrypt)`, where `64` is a key length |
| 17 | **adversarial** — a `let` raised from 1,000 to 600,000 before the call |
| 18 | **adversarial** — `.ts`, a config object holding BOTH `keylen: 32` and `iterations: 600000` |

## What this corpus proved

Scored on the full 33 fixtures, before and after:

| | TP | FP | FN | Precision | Recall | F1 |
|---|---:|---:|---:|---:|---:|---:|
| before | 5 | 0 | 10 | 100% | 33.3% | 50.0% |
| after | 15 | 0 | 0 | 100% | 100% | 100% |

Ten false negatives, no false positives. They split into two causes.

**The call was not recognised as PBKDF2 (fixtures 04, 05, 09, 15).** The check
was `callee.property.name === 'pbkdf2' | 'pbkdf2Sync'`, or the same on a bare
identifier. That misses everything modern Node actually writes: the promisified
form (aliased *and* inline), an import renamed at the boundary, and the
primitive bound to a local `const`. The callee is now also resolved through
`resolveModuleBinding`, and `util.promisify` is followed to what it wrapped —
so `promisify(crypto.scrypt)` stays quiet (safe/16) while `promisify(pbkdf2)`
does not.

**The count could not be read (fixtures 08, 12, 13, 14).** `resolveConstant`
stops at a literal bound to a `const`. `10 * 1000`, `2 ** 12` and
`KDF.iterations` are ordinary style. A small local fold now handles numeric
arithmetic and one hop into an object literal, `const` only — a `let` can be
raised between the declaration and the call, and fixture safe/17 is exactly that
case, where abstaining is the only defensible answer. The suggestion fixer
rewrites the expression where it is *written*, so `const R = 10 * 1000` becomes
`const R = 100000` rather than producing code the author did not write.

**Two whole call conventions were absent (fixtures 06, 07, 14).** PBKDF2 does
not always take its iteration count as argument index 2. Web Crypto's
`subtle.deriveBits`/`deriveKey` names the algorithm inside a parameter object,
and crypto-js's `PBKDF2` takes an options object — both are PBKDF2, both are
CWE-916 when the count is low, and neither existed for this rule. The Web Crypto
branch checks `name === 'PBKDF2'`, so HKDF and ECDH derivations on the same sink
stay quiet (safe/13, safe/14).

**One deliberate non-fix.** crypto-js's `PBKDF2` defaults to **one** iteration
when the options object is omitted. Reporting an *absent* key would mean
reporting on the absence of evidence, so `CryptoJS.PBKDF2(pw, salt)` is left
quiet and recorded here instead.

**One design decision confirmed, not changed.** The rule matches the export name
`pbkdf2`/`pbkdf2Sync` on any receiver. That is exact membership against a closed
API surface — `node:crypto`, the `pbkdf2` ponyfill and `browserify-pbkdf2` all
ship these two names with the same positional signature — so the receiver does
not have to be identified for argument index 2 to mean iterations. Fixture
safe/11 depends on that.
