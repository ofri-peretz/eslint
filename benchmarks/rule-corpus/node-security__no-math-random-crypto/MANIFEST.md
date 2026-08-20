# Rule corpus — `node-security/no-math-random-crypto` (CWE-338)

Written from CWE-338 semantics and real Node idiom, **not** from the rule's own
test file. The point is independent evidence: a corpus derived from the tests
can only re-derive what the author already thought of.

Each fixture is one file, one shape, with the rationale in a header comment.
`vulnerable/` must be reported; `safe/` must stay quiet.

The rule decides partly by NAME — deliberately, and its header comment records
the measurements behind the word list. That makes name inference the highest-risk
surface, so it is probed in **both** directions: a genuine credential with an
uninformative name (a miss is a false negative), and a non-credential wearing a
security-sounding one (a report is a false positive that costs a maintainer's
trust).

---

## `vulnerable/` — 22 fixtures

### Wave 1 — the sink family

| Fixture | Shape |
|---|---|
| `01-password-reset-token.js` | `Math.random().toString(36).slice(2)` ×2 → reset token |
| `02-session-id-factory.js` | factory returning `Math.random()` → session id in a cookie |
| `03-otp-sms.js` | `Math.floor(100000 + Math.random() * 900000)` → SMS second factor |
| `04-csp-nonce.js` | CSP `nonce-` value drawn from `Math.random()` |
| `05-password-salt.js` | per-user PBKDF2 salt |
| `06-temp-upload-filename.js` | predictable temp path in `os.tmpdir()` (symlink race) |
| `07-accumulator-loop.js` | `let token = ''; token += ALPHABET[Math.floor(Math.random()*n)]` |
| `08-intermediate-const.js` | credential reaches the sink through ONE intermediate `const` |
| `09-helper-function.js` | local, then `return` from a crypto-NAMED helper |
| `10-object-property.js` | `{ verifyCode: Math.floor(Math.random()*1e6) }` |
| `11-assign-member.js` | `user.passwordResetToken = …` (ORM mutate-then-save) |
| `12-csrf-token-cast.ts` | TypeScript, `as string` cast, Express middleware |
| `13-cipher-iv.js` | AES-GCM IV filled byte-by-byte; `require('node:crypto')` |

### Wave 2 — adversarial: shapes that never form the AST node the rule visits

| Fixture | Attack |
|---|---|
| `20-computed-member.js` | `Math['random']()` — callee property is a Literal |
| `21-destructured-random.js` | `const { random } = Math` — callee is a bare Identifier |
| `22-local-secure-random-alias.js` | `const secureRandom = Math.random` — a local wearing a trusted name |
| `23-let-reassigned.js` | positive control: `let` whose credential arrives by reassignment |
| `24-arrow-helper.js` | positive control: arrow bound to a crypto-named `const` |

### Wave 3 — adversarial: attacking what the wave-2 fix assumed

| Fixture | Attack |
|---|---|
| `30-var-alias.js` | the alias fix required `const`; this is the `var` spelling |
| `31-rng-object-member.js` | `const rng = { next: Math.random }; rng.next()` |
| `32-relay-chain.js` | three named locals between the draw and the word "token" |
| `33-unrevealing-name.js` | **name-inference FN probe** — a real reset token named `v` |

## `safe/` — 18 fixtures

### Wave 1 — genuinely non-security randomness, and the remediations

`01-retry-jitter.js` (full-jitter backoff) · `02-trace-sample-rate.js` ·
`03-ab-bucket.js` · `04-loading-tip.js` · `08-shuffle-demo-deck.js` ·
`09-load-generator.ts` (TypeScript synthetic latency) ·
`05-crypto-random-uuid.js` (`crypto.randomUUID()`) ·
`06-random-bytes-esm.js` (`import { randomBytes } from 'node:crypto'`) ·
`07-get-random-values-otp.js` (`webcrypto.getRandomValues` + rejection sampling)

### Wave 2 — name-inference FP probes

| Fixture | Probe |
|---|---|
| `20-cache-buster.js` | `cacheKey` — a CDN cache-buster, not a key |
| `21-auth-retry-jitter.js` | `authRetryDelay` — safe/01 with the service named |
| `22-word-in-string-only.js` | vocabulary only in a comment and a log line |
| `23-let-literal-writes.js` | `let` whose every write is a literal |
| `24-chaos-status-code.js` | `httpCode` — an HTTP status, not a verification code |

### Wave 3

| Fixture | Probe |
|---|---|
| `30-forward-hop-noise.js` | a relayed random that becomes a `setTimeout` delay |
| `31-shadowed-binding.js` | two functions, each with a local `raw` — scope, not a name map |
| `32-token-refresh-delay.js` | `tokenRefreshDelay` — the strongest word, on a duration |
| `33-token-count.js` | `tokenCount` — a quantity of LLM tokens |

---

## What this corpus proved

| Round | TP | FP | FN | Precision | Recall | F1 |
|---|---:|---:|---:|---:|---:|---:|
| Wave 1 (13v / 9s) | 10 | 0 | 3 | 100.0% | 76.9% | **87.0%** |
| Wave 2 added (18v / 14s) | 12 | 3 | 6 | 80.0% | 66.7% | **72.7%** |
| after wave-2 fixes | 17 | 0 | 1 | 100.0% | 94.4% | **97.1%** |
| Wave 3 added (22v / 18s) | 18 | 1 | 4 | 94.7% | 81.8% | **87.8%** |
| **after wave-3 fixes** | **20** | **0** | **2** | **100.0%** | **90.9%** | **95.2%** |

### Defects found and fixed

1. **The `FunctionDeclaration` arm was inconsistent with the `ReturnStatement`
   arm.** The former tested only `CRYPTO_FUNCTION_PATTERNS`; the latter tested
   those *and* `nameSuggestsCrypto`. So `makeSessionToken` reported when the
   draw sat directly under its `return` and was silent one statement earlier.
   Fixed by following the BINDING forward through the scope analyser rather
   than by widening any name list (`08`, `09`, `32`).
2. **`Math['random']()` was invisible** — the callee's property is a `Literal`.
3. **`const { random } = Math`, `const secureRandom = Math.random` and
   `const rng = { next: Math.random }` were invisible** — resolved through
   `findVariable`, requiring one definition and no later write, so a `var`
   read-only alias counts and a reassigned `let` does not.
4. **Three name-inference false positives**, all reporting on a name and not on
   evidence: `cacheKey`, `authRetryDelay`, `httpCode` (and `tokenCount` in wave
   3). Subtracted by exact word membership — a DURATION or QUANTITY tail means
   the value is a schedule or a count, and `code`/`key` are neutralised by a
   listed non-security qualifier. Subtraction only: no name is ever ruled *in*
   by these sets.

### A fake TP the corpus caught

`31-rng-object-member.js` originally also declared
`int: (max) => Math.floor(Math.random() * max)` on the same object. The file
scored as a true positive — for the *other* `Math.random()`, not the aliased
one under test. Removing the decoy took wave 3 from an apparent 90.5% to its
real 87.8%. Per-file scoring flatters a fixture that contains more than one
instance of the sink.

### Known limits — measured, not fixed

- **`06-temp-upload-filename.js`** — a predictable temp filename is CWE-338/377,
  and no identifier in the file carries security vocabulary. Reaching it would
  need `tmp`/`file`/`upload` in the crypto word list, which reports on every
  temp-file helper in every codebase. Not worth the trade.
- **`33-unrevealing-name.js`** — a genuine reset token named `v`. This is the
  floor of a name-based rule. The only structural evidence available would be
  "the value reaches a mail/cookie/DB sink", which is a taint analysis this
  rule does not have.

Both are false negatives in the *conservative* direction: they cost recall, not
a stranger's trust.
