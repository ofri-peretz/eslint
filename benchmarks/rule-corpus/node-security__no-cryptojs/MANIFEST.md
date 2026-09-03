# Rule corpus — `node-security/no-cryptojs` (CWE-1104)

Written from CWE-1104 semantics and real Node module idiom, **not** from the
rule's own test file. The point is independent evidence: a corpus derived from
the tests can only re-derive what the author already thought of.

Each fixture is one file, one shape, with the rationale in a header comment.
`vulnerable/` must be reported; `safe/` must stay quiet.

The sink family here is not a call — it is **every syntactic site where a module
specifier enters a file**. There are six of them in modern Node/TypeScript, and
the rule visited two.

## Vulnerable

| # | Shape |
|---|---|
| 01 | `const CryptoJS = require('crypto-js')` in an Express login route |
| 02 | `import CryptoJS from 'crypto-js'` in a queue worker |
| 03 | subpath imports — `crypto-js/aes`, `crypto-js/enc-utf8` |
| 04 | `await import('crypto-js')` on a lazily-loaded legacy decrypt path |
| 05 | `export { AES, HmacSHA256, enc } from 'crypto-js'` — a compat barrel |
| 06 | `export * from 'crypto-js'` — the wildcard barrel, no local binding at all |
| 07 | `const load = createRequire(import.meta.url); load('crypto-js')` |
| 08 | `.ts` — specifier hoisted to a `const`, result `as typeof import('crypto-js')` |
| 09 | `nodeModule.createRequire(import.meta.url)('crypto-js')` — namespace form |
| 10 | `.ts` — `import CryptoJS = require('crypto-js')` (`esModuleInterop: false`) |
| 11 | deep subpath require — `crypto-js/lib-typedarrays`, `crypto-js/sha256` |
| 12 | **adversarial** — `import(/* webpackChunkName */ 'crypto-js')` |
| 13 | **adversarial** — `require` nested in a try/catch optional-dependency probe |
| 14 | **adversarial** — `export { default as legacyMd5 } from 'crypto-js/md5'` |
| 15 | **adversarial** — `require(\`crypto-js\`)`, backticks, no interpolation |

## Safe

| # | Shape |
|---|---|
| 01 | the remediation of 01 — `createHmac` + `timingSafeEqual` from `node:crypto` |
| 02 | bare `crypto` specifier rather than `node:crypto` |
| 03 | `.ts` — `webcrypto.subtle.digest` with the cast a TS caller writes |
| 04 | `require('./crypto-js-shim')` — a LOCAL path containing the package name |
| 05 | `crypto-random-string` and `crypto-hash` — neighbouring, maintained packages |
| 06 | a dependency-audit CLI: `'crypto-js'` is DATA in a deny-list array |
| 07 | the migration comment that records the removal |
| 08 | `resolver.require('crypto-js')` — a method on a graph object, not the loader |
| 09 | a codemod that `delete`s `deps['crypto-js']` |
| 10 | `randomUUID` request-id middleware |
| 11 | **adversarial** — a test-support stub registry with its own `function require` |
| 12 | **adversarial** — the same shadow as `const require = (id) => …` |
| 13 | **adversarial** — `import('./legacy/crypto-js-adapter.js')`, a relative path |
| 14 | **adversarial** — `export * from './crypto/native.js'`, a local barrel |
| 15 | **adversarial** — `createRequire` loading `better-sqlite3` |
| 16 | **adversarial** — `export const DEPRECATED_DEPENDENCY = 'crypto-js'` (no `from`) |

## What this corpus proved

Scored on the full 31 fixtures, before and after:

| | TP | FP | FN | Precision | Recall | F1 |
|---|---:|---:|---:|---:|---:|---:|
| before | 5 | 2 | 10 | 71.4% | 33.3% | 45.5% |
| after | 15 | 0 | 0 | 100% | 100% | 100% |

**Four false-negative classes, one per unvisited specifier site.** The rule
listened for `ImportDeclaration` and a `CallExpression` whose callee is spelled
`require`. `import()`, `export … from`, `export * from` and TypeScript's
`import x = require(…)` bind exactly the same package and were all silent —
fixtures 04, 05, 06, 10, 12, 14.

**Two more from reading the specifier as a raw `Literal`.** `require(PKG)` with
`const PKG = 'crypto-js'` and `` require(`crypto-js`) `` are the same dependency
as the quoted form. Now resolved through `utils/const-value`'s
`resolveConstantString` — fixtures 08, 15.

**One from `callee.name === 'require'` being too narrow.** An ESM file that needs
a CommonJS-only package writes `const load = createRequire(import.meta.url)`.
The loader is now identified by resolving it to `node:module`'s `createRequire`
through `isModuleBinding`, not by its local name — fixtures 07, 09.

**Two false positives from the same test being too wide.** A file that declares
its OWN `require` — a stub registry in a test helper, a bundle evaluator in a
build script — loads nothing from npm, and was reported for the spelling of a
local function. The rule now requires the name to resolve to no declaration (or
to a `createRequire` result), which is what Node's injected module-wrapper
`require` looks like — fixtures safe/11, safe/12.
