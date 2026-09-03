# Rule corpus — `node-security/no-timing-unsafe-compare` (CWE-208)

Written from CWE-208 semantics and real Node idiom, **not** from the rule's own
test file. The point is independent evidence: a corpus derived from the tests
can only re-derive what the author already thought of.

Each fixture is one file, one shape, with the rationale in a header comment.
`vulnerable/` must be reported; `safe/` must stay quiet.

The rule decides partly by NAME — `secretPatterns` is a documented, configurable
word list — so name inference is probed in **both** directions: a genuine secret
with an uninformative name (a miss is a false negative), and a non-secret wearing
a security-sounding one (a report is a false positive that costs trust).

`===` is deliberately not the only shape here. A developer who knew enough to
convert both values to Buffers reaches for `buf.equals`, and that is a timing
oracle Node's own crypto documentation warns about.

---

## `vulnerable/` — 25 fixtures

### Wave 1 — the sink family

| Fixture | Shape |
|---|---|
| `01-api-key-middleware.js` | `provided !== process.env.API_KEY` |
| `02-hmac-webhook.js` | **the canonical CWE-208 shape** — HMAC of the request body |
| `03-session-cookie.js` | cookie session id vs the stored one |
| `04-password-hash.js` | PBKDF2 output vs a stored hash |
| `05-csrf-token.js` | submitted CSRF token vs one held in redis |
| `06-destructured-header.js` | `const { authorization } = req.headers` |
| `07-intermediate-const.js` | one intermediate `const`, with `String(x \|\| '').trim()` |
| `08-buffer-equals.js` | `provided.equals(expectedDigest)` |
| `09-buffer-compare.js` | `Buffer.compare(a, b) === 0` |
| `10-startswith-prefix.js` | `submitted.startsWith(licenceSecretPrefix)` |
| `11-lodash-isequal.js` | `isEqual(providedDigest, storedDigest)` |
| `12-localecompare.js` | `presented.localeCompare(storedToken) === 0` |
| `13-hand-rolled-early-return.js` | a FAKE mitigation: "constant time" that early-returns |
| `14-ts-cast.ts` | TypeScript Express, `req.header(...) as string` |
| `15-unrevealing-name.js` | **name-inference FN probe** — `v === expected`, HMAC on the right |
| `16-header-default-idiom.js` | isolates one taint hop: `req.headers[k] \|\| ''` |

### Wave 2 — adversarial

| Fixture | Attack |
|---|---|
| `20-local-timingsafeequal-alias.js` | a local `timingSafeEqual = (a, b) => a === b` |
| `21-optional-chaining.js` | `req.body?.apiKey !== account?.apiKey` |
| `22-req-session-csrf.js` | **both operands under `req`** — `req.body._csrf` vs `req.session.csrfToken` |
| `23-let-reassigned.js` | positive control: `let` written from `req.headers` |
| `24-computed-secret-member.js` | `creds['apiKey']` — bracket access to the secret |

### Wave 3 — attacking what the wave-2 fixes assumed

| Fixture | Attack |
|---|---|
| `30-sync-store-lookup.js` | the store read is SYNCHRONOUS — no `await` to see |
| `31-three-arg-wrapper.js` | the fake helper takes a third argument |
| `32-unrevealing-both-sides.js` | **name-inference FN probe** — `v !== w`, no crypto anchor |
| `33-koa-ctx-state.js` | positive control: Koa `ctx.state` vs `ctx.request.headers` |

## `safe/` — 18 fixtures

### Wave 1 — remediations and genuinely non-secret comparisons

`01-timing-safe-equal.js` (length check + `crypto.timingSafeEqual`, `require`) ·
`02-timing-safe-equal-esm.ts` (`import { timingSafeEqual } from 'node:crypto'`,
`as string`) · `03-content-type.js` · `04-role-check.js` · `05-enum-member.js` ·
`06-self-comparison.js` (`token !== token.trim()`) · `07-boolean-predicate.js` ·
`08-const-literal-tag.js` (a URN constant) · `09-both-user-input.js`
(`password !== confirmPassword`) · `10-config-diff.js` (a CLI, no attacker)

### Wave 2 — name-inference FP probes

| Fixture | Probe |
|---|---|
| `20-author-ownership.js` | `authorId` — `/auth/i` matching `author` |
| `21-mac-address.js` | `macAddress` — `mac` is the message-authentication-code pattern |
| `22-token-count.js` | `tokenCount` — a quantity |
| `23-word-in-comment-only.js` | vocabulary only in a comment and a log line |
| `24-bearer-prefix.js` | `startsWith('Bearer ')` — the new API surface must stay quiet |

### Wave 3

| Fixture | Probe |
|---|---|
| `30-post-author-id.js` | `postAuthorId` — the same collision, differently spelled |
| `31-correct-constant-time.js` | a CORRECT XOR-accumulator: the negative control for the fake-mitigation detector |
| `32-prompt-token-limit.js` | `promptTokenLimit` — a quota |

---

## What this corpus proved

| Round | TP | FP | FN | Precision | Recall | F1 |
|---|---:|---:|---:|---:|---:|---:|
| Wave 1 (15v / 10s) | 2 | 0 | 13 | 100.0% | 13.3% | **23.5%** |
| after wave-1 fixes (16v / 10s) | 11 | 0 | 5 | 100.0% | 68.8% | **81.5%** |
| Wave 2 added (21v / 15s) | 12 | 0 | 9 | 100.0% | 57.1% | **72.7%** |
| after wave-2 fixes | 16 | 0 | 5 | 100.0% | 76.2% | **86.5%** |
| Wave 3 added (25v / 18s) | 17 | 2 | 8 | 89.5% | 68.0% | **77.3%** |
| **after wave-3 fixes** | **19** | **0** | **6** | **100.0%** | **76.0%** | **86.4%** |

**Wave 1 opened at 13.3% recall.** The rule was silent on its own headline
shape.

### Defects found and fixed

1. **The canonical webhook check was suppressed by the rule's own precision
   guard.** The expected signature is an HMAC **of the request body**, so the
   taint reader marks BOTH operands attacker-controlled, and the "exactly one
   side untrusted" test then returned early. Fixed by asking a second question
   when both sides are tainted: did either value cross a boundary the attacker
   is not on the other side of — an `await`, a crypto derivation, or a call
   whose receiver the attacker cannot steer? (`02`, `03`, `04`, `05`, `14`,
   `21`, `24`, `30`.)
2. **A crypto derivation was not recognised as a secret.** `createHmac(…)
   .digest('hex')` is a secret whatever it is named, and that is the only
   evidence available when the operands are called `v` and `expected` (`15`).
3. **`ChainExpression` was never unwrapped.** Every operand written with
   optional chaining — ordinary modern Node — was neither a secret nor a
   constant nor a self-comparison, and the rule fell silent (`21`).
4. **Only `BinaryExpression` was visited.** `buf.equals`, `Buffer.compare`,
   `startsWith`, `localeCompare` and `isEqual` are memcmp wearing a method
   name (`08`–`12`).
5. **A local function wearing a trusted name evaded everything** (`20`, `31`).
   Resolved through the scope analyser: a local whose body puts one parameter
   on each side of an equality operator IS the comparison. The same predicate
   catches the **fake constant-time helper** — and a *correct* implementation
   cannot trip it, because it accumulates `diff |= a[i] ^ b[i]` and never
   compares the two inputs to each other. The `.length` guard is excluded
   because both versions have it. `safe/31` is the negative control.
6. **Bracket access to a secret property was invisible** — `creds['apiKey']`
   (`24`).
7. **Two name-inference false positives**, `postAuthorId` and
   `promptTokenLimit`. An earlier fix enumerated whole identifier SPELLINGS
   (`authorid`, `macaddress`, …); wave 3 broke it in one attempt, because an
   exact-spelling set only matches the spellings it was handed. Replaced with
   collision WORDS (`author`) and non-secret TAILS (`count`, `limit`, `address`)
   checked against `identifierWords`, which generalises. `auth` still matches
   `authorization`, which is the constraint that rules out word-boundary
   anchoring.

### Known limits — measured, not fixed

**Five of the six remaining false negatives are ONE shared-utility defect, not
five rule defects.** `makeReadsTaintSource` in
`packages/eslint-plugin-node-security/src/utils/provenance.ts` has no
`LogicalExpression` case, so `req.headers['x-key'] || ''` — the standard
defensive header read — falls through to `default: return false` and the taint
walk stops. Verified by rewriting each fixture with the `|| ''` fallback removed:

```
07-intermediate-const.js        as-written -> 0   || removed -> 1
10-startswith-prefix.js         as-written -> 0   || removed -> 1
12-localecompare.js             as-written -> 0   || removed -> 1
13-hand-rolled-early-return.js  as-written -> 0   || removed -> 1
16-header-default-idiom.js      as-written -> 0   || removed -> 1
```

With that one case added, this rule's recall on this corpus would be **96.0%**
(24/25). The utility is shared with `no-ssrf`, `detect-child-process` and
`no-unsafe-dynamic-require`, so it is reported rather than changed here.

The sixth, **`32-unrevealing-both-sides.js`**, is the floor of a name-based
rule: `v !== w`, where `w` came from `vault.get('service-credential')`. There is
no crypto call to anchor it and no revealing name. Reaching it would mean
reporting on every comparison of two ordinary values.
