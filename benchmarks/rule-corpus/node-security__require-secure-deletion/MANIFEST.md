# Rule corpus — `node-security/require-secure-deletion` (CWE-459)

Written from CWE-459 semantics and real Node idiom, **not** from the rule's own
test file. The point is independent evidence: a corpus derived from the tests
can only re-derive what the author already thought of.

Each fixture is one file, one shape, with the rationale in a header comment.
`vulnerable/` must be reported; `safe/` must stay quiet.

This is a **require-** rule: it reports the ABSENCE of a real scrub. `delete`
unbinds a property without clearing the value, and every other reference — a
spread copy taken first, an already-serialised body, the ORM's identity map —
keeps it alive. So `vulnerable/` is a `delete` of a property that held a secret,
and `safe/` is either a real scrub (overwrite, `Buffer.fill(0)`, never copying
it in the first place) or a `delete` of something that is not a secret at all.

## vulnerable/

| Fixture | Shape |
|---|---|
| `01-express-user-response.js` | `delete user.password` before `res.json(user)` |
| `02-session-refresh-token.js` | `delete session.refreshToken` as "revocation" |
| `03-computed-literal-api-key.js` | `delete config['api_key']`, `['client_secret']` |
| `04-optional-chain-jwt.js` | `delete ctx.state?.jwt` |
| `05-ts-cast-ssn.ts` | TypeScript, `delete (row as …).ssn` |
| `06-spread-then-delete.js` | the copy is taken BEFORE the delete |
| **adversarial wave** | |
| `07-computed-const-key.js` | `const SECRET_FIELD = 'password'; delete user[SECRET_FIELD]` |
| `08-reflect-delete-property.js` | `Reflect.deleteProperty(record, 'password')` |
| `09-optional-computed-const.js` | both evasions at once |

## safe/

| Fixture | Shape |
|---|---|
| `01-delete-nonsensitive.js` | `delete options.cacheable` etc. |
| `02-overwrite-not-delete.js` | the prescribed scrub — overwrite + `Buffer.fill(0)` |
| `03-destructure-omit.js` | rest destructuring, the secret is never copied |
| `04-delete-request-headers.js` | hop-by-hop headers in a proxy |
| `05-llm-token-metrics.js` | `delete summary.totalTokens` — a COUNT |
| `06-vocabulary-in-prose.js` | the vocabulary only in a string and a comment |
| **adversarial wave** | |
| `07-secrets-manager-arn.js` | `secretsManagerArn` — a POINTER to a secret |
| `08-private-key-path.js` | `privateKeyPath`, `signingKeyFile` — FILENAMES |
| `09-tokenizer-state.js` | `tokenizerState`, `tokenBuffer` — a lexer's scratch |

## What this corpus proved

Baseline (wave 1): **TP 6, FP 1, FN 0 — P 0.857, R 1.00, F1 0.923.**
After the adversarial wave: **TP 6, FP 4, FN 3 — P 0.600, R 0.667, F1 0.632.**
That is the wave doing its job: a rule that looked healthy on the first six
vulnerable fixtures lost a third of its precision and a third of its recall to
nine more.

Three defects, all in the rule file, all fixed:

1. **`normalized.includes(fragment)` — a substring test over a topic
   vocabulary.** Five safe fixtures were reported at MEDIUM as leaked
   credentials: `usage.totalTokens` (an LLM usage count), `parser.tokenizerState`,
   `parser.tokenBuffer`, `options.secretsManagerArn` (a pointer, not a secret)
   and `tls.privateKeyPath` (a filename). Whole-word matching alone fixes only
   two of the five — the other three genuinely contain the word.
   The fix is grammatical rather than lexical: **English compound nouns are
   head-final**, so the credential phrase must END the identifier.
   `refreshToken` IS a token; `tokenBuffer` is a buffer; `privateKeyPath` is a
   path. One invariant instead of a growing exception list. Costs recall only on
   names like `passwordHash` — the suppressing direction, which is the cheap one.
2. **A computed key was only read as a `Literal`.** `const SECRET_FIELD =
   'password'; delete user[SECRET_FIELD]` — a redaction helper keeping its field
   list in one place, which is better code than the inline version — was
   invisible. Now resolved with `resolveConstantString` (`const`, one hop; an
   unresolvable key still abstains).
3. **`Reflect.deleteProperty` was not a sink.** It is the delete operator as a
   function, it is what proxy traps and generic serialisers call, and it forms
   no `UnaryExpression`.

After: **TP 9, FP 0, FN 0 — P 1.00, R 1.00, F1 1.00.**

### One option semantic changed

`additionalSensitiveProperties` was documented as "case-insensitive substrings"
and is now matched as whole words at the end of the name, like the built-ins.
`{ additionalSensitiveProperties: ['pincode'] }` no longer matches `pinCode`
(one word versus two); `'pin code'`, `'pin_code'` and `'pinCode'` all do. The
existing coverage test asserted the old spelling and was updated, with the old
spelling kept as a `valid` case so the change is pinned rather than erased.
