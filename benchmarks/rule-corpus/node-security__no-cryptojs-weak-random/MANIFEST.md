# Rule corpus — `node-security/no-cryptojs-weak-random` (CWE-338)

Written from CWE-338 / CVE-2020-36732 semantics and real crypto-js idiom, **not**
from the rule's own test file. The point is independent evidence: a corpus
derived from the tests can only re-derive what the author already thought of.

Each fixture is one file, one shape, with the rationale in a header comment.
`vulnerable/` must be reported; `safe/` must stay quiet.

The sink is exactly one export path — `crypto-js`'s `lib.WordArray.random` —
which makes this rule a clean test of the difference between *naming* a sink and
*resolving* one.

## Vulnerable

| # | Shape |
|---|---|
| 01 | `CryptoJS.lib.WordArray.random(32)` minting session ids |
| 02 | `import { lib } from 'crypto-js'` — the namespace on its own |
| 03 | `const { WordArray } = CryptoJS.lib` then two call sites |
| 04 | `import { lib as cjsLib }` — nothing in the chain spelled `CryptoJS` |
| 05 | `const randomWords = CryptoJS.lib.WordArray.random` — extracted reference |
| 06 | `const { random } = lib.WordArray` — destructured off the object |
| 07 | `require('crypto-js').lib.WordArray.random(16)` inline off the require |
| 08 | `.ts` — optional chaining through a namespace import, with a cast |
| 09 | computed last hop, `WordArray[METHOD]` with `const METHOD = 'random'` |
| 10 | **adversarial** — `<script>`-tag global: no import anywhere in the file |
| 11 | **adversarial** — `import { lib } from 'crypto-js/core'`, the subpath entry |
| 12 | **adversarial** — two `const` hops between the require and the call |
| 13 | **adversarial** — computed hop with an inline string, `lib['WordArray']` |

## Safe

| # | Shape |
|---|---|
| 01 | the remediation of 01 — `randomBytes(32)` |
| 02 | `webcrypto.getRandomValues` |
| 03 | a LOCAL `class WordArray` migration shim over `randomBytes` |
| 04 | a LOCAL `const CryptoJS = { random: … }` compat facade |
| 05 | an unrelated `WordArray` — the EFF passphrase wordlist |
| 06 | `_.random(0, 250)` for retry jitter |
| 07 | the migration comment and changelog string |
| 08 | `.ts` — `randomInt` with a config cast |
| 09 | crypto-js imported, but only `SHA256` used — the generator is never reached |
| 10 | `Math.random()` jitter — `no-math-random-crypto`'s question, not this rule's |
| 11 | `faker.random.word()` |
| 12 | **adversarial** — a LOCAL `function random` over `randomInt`, called bare |
| 13 | **adversarial** — a LOCAL object with the exact `lib.WordArray.random` shape |
| 14 | **adversarial** — the real `CryptoJS.lib.WordArray.create`, not `random` |
| 15 | **adversarial** — a private-field RNG, `this.#rng.random(16)` |

## What this corpus proved

Scored on the full 28 fixtures, before and after:

| | TP | FP | FN | Precision | Recall | F1 |
|---|---:|---:|---:|---:|---:|---:|
| before | 8 | 4 | 5 | 66.7% | 61.5% | 64.0% |
| after | 13 | 0 | 0 | 100% | 100% | 100% |

**The rule decided by spelling.** It reported any call whose callee had a
property `random` on an object named or containing `WordArray`, plus anything
`CryptoJS.random(…)`. Neither carries a single piece of evidence that crypto-js
is involved. The four false positives are all ordinary code in a repo that is
*removing* crypto-js: a local `class WordArray` shim over `randomBytes`, a local
`const CryptoJS = { random: … }` facade, an unrelated `WordArray` from a
wordlist module, and a local object built with the exact API shape.

**⚠️ Two of the rule's own tests asserted the defect as correct behaviour** —
`'WordArray.random(16);'` and `'CryptoJS.random(16);'` sat in `invalid` with no
import, no require, and (for the second) an export path crypto-js has never had.
They have been moved to `valid` with the reasoning recorded in the test file.

**The fix resolves the binding.** `resolveModuleBinding` from devkit, extended
locally over one shape it abstains on (a computed key that folds to a constant
string). That also closed three false negatives — 05, 06, 09 — because a
generator carried through a `const` or a destructure resolves to the same export
path as the fully-spelled chain.

**The browser case was kept deliberately.** crypto-js is still shipped by
`<script>` tag, where `CryptoJS` is a global with nothing to resolve. The rule
accepts the full three-segment path `lib.WordArray.random` when the root
identifier has **no definition in the file** — which is what a `/* global */`
comment or a `globals` config entry produces. A local `const`/`class` of the same
name carries a definition and is rejected, so fixture safe/13 stays quiet while
fixture vulnerable/10 still fires. Without this branch the precision fix would
have silently traded away every script-tag codebase.
