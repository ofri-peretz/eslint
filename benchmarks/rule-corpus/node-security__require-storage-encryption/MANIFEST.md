# Rule corpus — `node-security/require-storage-encryption` (CWE-312 / CWE-311)

Written from CWE-312 semantics and real Node idiom, **not** from the rule's own
test file. The point is independent evidence: a corpus derived from the tests
can only re-derive what the author already thought of.

Each fixture is one file, one shape, with the rationale in a header comment.
`vulnerable/` must be reported; `safe/` must stay quiet.

This is a **require-** rule: it reports a credential reaching the filesystem
without encryption. So `vulnerable/` is a secret written in the clear, and
`safe/` is either a real encrypt-then-write, a store that is not disk, or a
write whose payload is not a credential at all. Fake mitigations — base64, a
local no-op `encrypt`, a `decrypt` on the way IN — belong in `vulnerable/`.

**Is the rule vacuous?** No. Four of the eight first-wave vulnerable fixtures
report, on ordinary code (`fs.writeFileSync(TOKEN_CACHE, refreshToken)`,
`fs.appendFileSync(auditPath, \`… token=${token}\`)`). It is narrow, not vacuous.

## vulnerable/

| Fixture | Shape |
|---|---|
| `01-oauth-token-cache.js` | `fs.writeFileSync(TOKEN_CACHE, refreshToken)` |
| `02-destructured-write-apikey.js` | `const { writeFileSync } = require('node:fs')` |
| `03-append-credential-log.js` | `appendFileSync(auditPath, \`… token=${token}\`)` |
| `04-json-stringify-credentials.js` | the secret inside `JSON.stringify({ password })` |
| `05-ts-cast-client-secret.ts` | TypeScript `config.clientSecret as string` |
| `06-base64-encoded-private-key.js` | `Buffer.from(key).toString('base64')` as "protection" |
| `07-decrypt-then-write.js` | `decrypt(sealed)` written to disk — the inverse of the fix |
| `08-kubeconfig-service-account.js` | `import { writeFile } from 'node:fs/promises'`, token in a template |
| **adversarial wave** | |
| `09-fake-local-encrypt.js` | a LOCAL `const encrypt = (v) => v` |
| `10-computed-member-write.js` | `fs['writeFileSync'](dest, signingKey)` |
| `11-fs-extra-outputfile-secret.js` | `fse.outputFile(dest, clientSecret)` |

## safe/

| Fixture | Shape |
|---|---|
| `01-sitemap-write.js` | the eslint-plugin-security corpus false positive |
| `02-encrypt-then-write.js` | real AES-256-GCM before the write |
| `03-tls-key-read.js` | READING `./ssl.key` at startup is how TLS works |
| `04-keychain-instead-of-disk.js` | keytar for the secret, a non-secret hint on disk |
| `05-build-manifest-write.js` | bundler output |
| `06-env-example-template.js` | `.env.example` — credential KEYS, placeholder values |
| **adversarial wave** | |
| `07-password-policy-doc.js` | `./docs/password-policy.md` |
| `08-tokenizer-cache.js` | `tokenizerCachePath` — `tokenizer` contains `token` |
| `09-secret-word-in-prose.js` | the vocabulary only in a comment and in prose |

## What this corpus proved

Baseline (wave 1): **TP 4, FP 0, FN 4 — P 1.00, R 0.50, F1 0.667.**
After the adversarial wave: **TP 4, FP 2, FN 7 — P 0.667, R 0.364, F1 0.471.**

**No defect found here belongs to the rule file.** All seven live in
`src/utils/credential-evidence.ts`, which this task's boundary forbids editing,
so nothing was changed and the numbers above are both before AND after. The
module is consumed by exactly two rules — this one and
`require-secure-credential-storage` — and `isFileWrite` by this one alone, so
the fixes can be made in a single pass without touching anything else:

1. **`isFileWrite` (l.232-239) requires a MemberExpression callee** and a closed
   four-name method list. `const { writeFileSync } = require('node:fs')`,
   `import { writeFile } from 'node:fs/promises'`, `fs['writeFileSync']` and
   `fs-extra`'s `outputFile` are all silent — five of the seven misses.
   `resolveModuleBinding(callee, scope, { equivalents: { 'fs-extra': 'fs' } })`
   is the fix; it is exactly what `no-data-in-temp-storage` was moved to in this
   same pass, and that rule went from R 0.30 to R 1.00 on its own corpus.
2. **`nameOf` (l.65-85) returns `''` for a `CallExpression`,** so the credential
   inside `JSON.stringify({ password })` — the commonest real spelling — is no
   evidence (`vulnerable/04`).
3. **`nameOf` does not unwrap `TSAsExpression`,** so a cast the TypeScript
   compiler requires erases the evidence (`vulnerable/05`). `unwrapTypeSyntax`
   from devkit is the one-line fix.
4. **`isEncryptedExpression` (l.156-168) judges the callee's NAME and never
   resolves the binding.** A local `const encrypt = (v) => v` is accepted as
   encryption (`vulnerable/09`). This is the single highest-value fix in the
   module: the whole rule is "was it encrypted", and the answer is currently a
   spelling. Resolve the callee and require it to come from a crypto module (or
   at minimum reject a local function whose body returns its own parameter).
5. **`namesACredential` (l.59-62) is a substring test over a TOPIC vocabulary.**
   `./docs/password-policy.md` and `tokenizerCachePath` are reported
   (`safe/07`, `safe/08`). Note `nameHasAnyWord` does **not** fix `password-policy`
   — `password` is a whole word there. What is missing is that the *value*, not
   the *filename*, has to be the credential.
