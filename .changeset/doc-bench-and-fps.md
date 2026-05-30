---
"eslint-plugin-secure-coding": patch
"eslint-plugin-lambda-security": patch
"eslint-plugin-node-security": patch
"eslint-plugin-vercel-ai-security": patch
---

fix: ILB-Wild FP reduction + doc examples + doc-test-alignment scanner fixes

**`no-unlimited-resource-allocation` — FP reduction (430 Edge FPs)**
- Skip loop-allocation reporting when the first argument is a numeric literal (e.g. `Buffer.alloc(1024)` inside a loop is statically bounded, not a risk)
- Skip `Array.isArray`, `Array.from`, `Array.of` calls in the `alloc/Array` pattern check (these don't allocate unbounded memory)

**`no-hardcoded-credentials` — FP reduction (~280 Edge FPs)**
- Extended test-file skip to cover `.fixture.`, `.mock.`, `__mocks__/`, `/tests/`, `/fixtures/`, `/mocks/` paths
- Skip string literals that are fallback values in `process.env.X || 'fallback'` expressions — the secret lives in the environment, the string is only a dev-mode default

**Doc examples — 4 rules now have ❌ Incorrect examples**
- `lambda-security/no-missing-authorization-check`
- `lambda-security/no-overly-permissive-iam-policy`
- `node-security/prefer-native-crypto` (renamed non-standard `### ❌ Third-Party (Flagged)` to `### ❌ Incorrect`)
- `vercel-ai-security/require-tool-confirmation` (replaced placeholder with a real tested example)

**`ilb-doc-test-alignment` scanner fixes**
- Accept both `## ❌` and `### ❌` headings (docs use H3 under an H2 `## Examples` section; was only finding H2)
- Slice from end-of-line rather than end-of-regex-match (prevents `## ❌ Incorrect Code` from leaving a partial heading in the parsed section)

Result: `ilb:doc-test-alignment` → 206 ok, 0 doc has no ❌ examples (was 165 missing).
