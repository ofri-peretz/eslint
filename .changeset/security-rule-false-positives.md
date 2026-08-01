---
'eslint-plugin-secure-coding': minor
'eslint-plugin-node-security': minor
---

Cut false positives in five security rules, measured against a 1,470-file corpus (webpack `lib/`, lodash, eslint-plugin-import `src/`, and two NestJS boilerplates).

**`secure-coding/no-hardcoded-credentials` — decide on the value, not the key name.** The rule reported any string in a credential-named slot, so `errors: { password: 'incorrectPassword' }` (an i18n error key) was a CVSS 9.8 finding — 5 of its 10 corpus hits. Detection is now driven by the value's shape: entropy, character-class mix, charset, and a "natural word string" test that rejects identifier- and message-shaped values. A credential-shaped name is still consulted, but only to promote an already-secret-shaped value. Corpus: **10 → 7 findings, and all 7 are true positives** — including two the old logic missed, because a 25-character random `key:` is now found by shape rather than by being on a name allowlist.

**`secure-coding/no-unsafe-deserialization` — `setTimeout` is not a deserializer.** `await new Promise(resolve => setTimeout(resolve, 1000))` was rated CVSS 9.8 CRITICAL. `setTimeout` / `setInterval` now only report in their implied-`eval` form (string first argument), and calls inside a function named `deserialize` / `unserialize` / `fromJSON` / `fromBuffer` — a class implementing a serialization protocol — are exempt. Corpus: **35 → 4**.

**`secure-coding/no-graphql-injection` — require real GraphQL syntax.** Any template literal containing a nested brace or the word `type` was a CVSS 9.8 GraphQL injection. Operation and schema keywords must now start a line, schema keywords require a body, and a bare selection set must be the entire string. Concatenations are matched on their reassembled static value rather than on their source text. Corpus: **41 → 0**.

**`node-security/require-secure-deletion` — only sensitive properties.** The rule fired on every `delete obj.prop`. It now reports only a statically known, sensitive property name (`password`, `token`, `apiKey`, `privateKey`, `sessionId`, …), configurable via the new `additionalSensitiveProperties` option, and understands computed access and optional chaining. Corpus: **25 → 1** (a genuine `delete userDto.oldPassword`).

**`secure-coding/no-insecure-comparison` — removed from `recommended`, `recommended-strict` and `owasp-top-10`.** It is deprecated in favour of `node-security/no-timing-unsafe-compare`, and its loose-equality half re-reports core `eqeqeq` under a CWE-697 banner — 433 corpus findings, all duplicates. No narrowing fixes that, so the honest change is to stop switching it on for people; it remains exported and available via `strict` or explicit opt-in. Its timing-attack half was also narrowed to match secret keywords on identifier **word segments** instead of substrings of the whole expression text, which stops `if (key === "__non_webpack_require__")` (and `monkey`, `keyword`, `machine`, `author`) from being reported: **443 → 221**.
