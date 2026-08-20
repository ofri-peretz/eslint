# Rule corpus — `node-security/no-static-iv` (CWE-329)

Written from CWE-329 semantics and real Node crypto idiom, **not** from the
rule's own test file. The point is independent evidence: a corpus derived from
the tests can only re-derive what the author already thought of.

Each fixture is one file, one shape, with the rationale in a header comment.
`vulnerable/` must be reported; `safe/` must stay quiet. There is no partial
credit — a file counts once.

CWE-329 asks one question: **can an attacker predict the IV?** Not "was it typed
out by hand". That distinction is what fixtures 03, 04 and 10 exist to test.

## Vulnerable

| # | Shape |
|---|---|
| 01 | Hex string literal inline at the `createCipheriv` call, CJS `require('crypto')` |
| 02 | `Buffer.from('…','hex')`, destructured `node:crypto` import |
| 03 | `Buffer.alloc(16)` — the all-zero IV, which reads as allocation rather than as a constant |
| 04 | IV hoisted to a module `const` and reused by every call |
| 05 | Hex held in a named `const`, `Buffer.from` written at the call site |
| 06 | `new Uint8Array([…])` cast to Buffer (`.ts`) |
| 07 | Aliased import `createCipheriv as makeCipher` + literal byte array |
| 08 | The decrypt half: `createDecipheriv` with a static IV, namespace binding |
| 09 | The same fixed hex spelled with backticks |
| 10 | IV derived deterministically from the key — a partial mitigation, generated but constant |
| 11 | *(adversarial)* computed member `crypto['createCipheriv']` |
| 12 | *(adversarial)* CJS destructuring with rename, `{ createCipheriv: mkCipher }` |
| 13 | *(adversarial)* a `let` whose **every** write is a fixed value |
| 14 | *(adversarial)* the cipher built inside a local helper — indirection at the caller |
| 15 | *(adversarial)* optional chaining, `crypto?.createCipheriv` |

## Safe

| # | Shape |
|---|---|
| 01 | `crypto.randomBytes(16)` inline — the correct remediation |
| 02 | A per-call `const iv = randomBytes(16)`; `const` is not what makes an IV static |
| 03 | IV arrives as a function parameter — the caller is not visible |
| 04 | `Buffer.alloc(16)` **then `randomFillSync`** — identical allocation to fixture 03 |
| 05 | `webcrypto.getRandomValues` with an `as unknown as Buffer` cast (`.ts`) |
| 06 | The decrypt side reading the per-message IV back out of the blob |
| 07 | The vocabulary present only in a comment and a string literal |
| 08 | A fixed hex handed to `createHmac` — a real bug, but CWE-798, not this rule |
| 09 | IV derived from `randomUUID()` |
| 10 | A `let` whose **every** write is a fresh `randomBytes` |
| 11 | *(adversarial)* `Buffer.alloc(16)` twice, neither of them the IV |
| 12 | *(adversarial)* the callback form `crypto.randomFill(iv, cb)` |
| 13 | *(adversarial)* `new Uint8Array(16)` then `getRandomValues` (`.ts`) |
| 14 | *(adversarial)* the static buffer is the **key**, not the IV |
| 15 | *(adversarial)* deprecated `createDecipher`, which takes no IV at all |

## What this corpus proved

| Wave | TP | FP | FN | Precision | Recall | F1 |
|---|---:|---:|---:|---:|---:|---:|
| Wave 1, shipped rule | 4 | 0 | 6 | 100.0% | 40.0% | **57.1%** |
| Wave 1, after fixes | 9 | 0 | 1 | 100.0% | 90.0% | **94.7%** |
| Wave 2 (adversarial) added | 12 | 0 | 3 | 100.0% | 80.0% | **88.9%** |
| Wave 2, after fixes | 14 | 0 | 1 | 100.0% | 93.3% | **96.6%** |

Six defects, every one a false negative on ordinary production code:

1. **`Buffer.alloc(16)` — the all-zero IV — was invisible.** The buffer arm
   required the first argument to be a *string* literal, so a numeric length
   fell through. This is the commonest static IV in real code precisely because
   it does not look like a constant.
2. **`new Uint8Array([…])` was never checked, though a comment said it was.**
   The code carried the comment `// Check for new Uint8Array([...])` directly
   above a branch that checked `Buffer.from([...])`. The constructor form had no
   arm at all — a defect *described* rather than fixed.
3. **An aliased import defeated the whole rule.** The factory was matched by the
   identifier's spelling, so `import { createCipheriv as makeCipher }` — an
   ordinary rename, not an evasion — was silent. The rule now also resolves the
   binding to `crypto`, which is the evidence a name cannot supply.
4. **A computed member defeated it too.** `crypto['createCipheriv']` puts the
   method name in a `Literal`, which has no `.name`.
5. **A template literal defeated the string arm.** `` Buffer.from(`00112233…`,'hex') ``
   differs from the reported form by one quote character.
6. **A `const` holding the hex, with `Buffer.from` at the call site, was
   missed.** The rule resolved one `const` hop on the IV itself but not on the
   argument to `Buffer.from`.

Fixed structurally — `isModuleBinding` for the factory, `resolveConstantString`
for "which bytes does this actually receive", `unwrapTypeSyntax` for the cast,
and a candidate-set resolver for `let`. No name substring anywhere.

The `let` handling is deliberately symmetric: a `let` is reported only when
**every** write is static (vulnerable/13), and stays quiet when **any** write is
random (safe/10). The zero-buffer finding is suppressed only on evidence of a
CSPRNG fill of the same binding (safe/04, 12, 13) — an unresolved binding keeps
the finding, because the alternative would let any untraceable `Buffer.alloc(16)`
pass as safe.

### The one remaining miss is deliberate

`vulnerable/10-derived-from-key.js` computes the IV as `sha256(key)[0:16]`. It
is a genuine CWE-329 — constant per key, therefore predictable — but the
evidence is *semantic*, not syntactic: nothing in the AST distinguishes it from
a legitimate KDF output. Detecting it would require asserting that any
non-CSPRNG-derived buffer is a static IV, which reports on every well-factored
crypto helper in the ecosystem. Left as a measured, named false negative rather
than paid for in precision.
