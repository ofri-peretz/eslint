# Rule corpus — `node-security/no-deprecated-buffer` (CWE-676)

Written from CWE-676 semantics (Use of Potentially Dangerous Function) and real
Node idiom, **not** from the rule's own test file. The point is independent
evidence: a corpus derived from the tests can only re-derive what the author
already thought of.

The dangerous function here is exactly two spellings — `new Buffer(...)` and the
`Buffer(...)` factory call (DEP0005). With a numeric argument both return
uninitialized heap memory (CVE-2018-7166); with a string argument both are the
ambiguous overload Node deprecated. The *interesting* question is never "is the
word `Buffer` on this line" — it is **"does this callee resolve to Node's
`Buffer`?"**, which is why every fixture below varies the binding rather than the
call.

Each fixture is one file, one shape, with the rationale in a header comment.
`vulnerable/` must be reported; `safe/` must stay quiet.

## vulnerable/

| file | shape |
|---|---|
| `01-upload-size-from-request.js` | `new Buffer(n)` in an Express handler, `n` from `req.body` — uninitialized memory goes out in the response |
| `02-factory-call-no-new.js` | the `Buffer(str, 'base64')` FACTORY call, no `new` |
| `03-node-prefix-named-import.js` | ESM `import { Buffer } from 'node:buffer'` |
| `04-require-buffer-destructured.js` | CJS `const { Buffer } = require('buffer')` — bare specifier |
| `05-cli-intermediate-const.js` | CLI entry point; the size reaches the constructor through ONE intermediate `const` |
| `06-ts-cast-size.ts` | TypeScript: `new Buffer(declared as number)` — the cast a TS Express handler is forced to write |
| `07-namespace-member-call.js` | `const buffer = require('node:buffer'); new buffer.Buffer(n)` — the legacy namespace spelling; the callee is a MemberExpression |
| `08-aliased-import-binding.js` | **adversarial** — `import { Buffer as NodeBuffer } from 'node:buffer'` |
| `09-require-member-alias.js` | **adversarial** — `const BufferCtor = require('buffer').Buffer`, the commonest pre-Node-10 CJS spelling |

## safe/

| file | shape |
|---|---|
| `01-buffer-alloc.js` | the correct remediation: `Buffer.alloc(n)`, zero-filled |
| `02-buffer-from.js` | `Buffer.from(value, encoding)` |
| `03-buffer-concat.js` | `Buffer.concat(parts)` |
| `04-allocunsafe-filled.js` | `Buffer.allocUnsafe(n).fill(0)` — a static method, not the constructor; another rule's business |
| `05-other-buffer-constructors.js` | `new ArrayBuffer` / `new SharedArrayBuffer` / `new DataView` — names that merely CONTAIN "Buffer" |
| `06-codemod-mentions-constructor.js` | the vocabulary appears only in strings, a regex and comments (a codemod that rewrites the constructor) |
| `07-buffer-static-helpers.js` | `Buffer.byteLength` / `isBuffer` / `isEncoding` |
| `08-local-ring-buffer-class.js` | **the binding probe** — `Buffer` is a LOCAL `class` (an audio ring buffer); `new Buffer(1024)` is that class |
| `09-imported-local-buffer-class.js` | `import { Buffer } from './lib/frame-buffer.js'` — a project class of the same name |
| `10-buffer-from-ts-cast.ts` | TypeScript remediated shape with an `as string` cast |
| `11-typeof-feature-detect.js` | **adversarial** — `typeof Buffer !== 'undefined'` + `Buffer.from`, the isomorphic-package opener |
| `12-local-gap-buffer-factory.js` | **adversarial** — the CallExpression twin of `safe/08`: a local `function Buffer(text)` editor gap buffer, called without `new` |

## What this corpus proved

Baseline (7 vulnerable / 10 safe, before the adversarial wave):
**TP 6 · FP 2 · FN 1 — P 75.0% · R 85.7% · F1 80.0%.**
After the adversarial wave (9 / 12): **TP 6 · FP 3 · FN 3 — F1 66.7%.**

Every one of those six misses had the same root cause, at
`src/rules/no-deprecated-buffer/index.ts:71` (pre-fix `isBufferIdentifier`):

```ts
node.type === AST_NODE_TYPES.Identifier && node.name === 'Buffer'
```

That is a SPELLING test, and it is wrong in both directions.

* **False positives** — any local declaration spelled `Buffer` was reported:
  a `class Buffer` ring buffer (`safe/08`), a `function Buffer` gap-buffer
  factory (`safe/12`), and `import { Buffer } from './lib/frame-buffer.js'`
  (`safe/09`). The fix a user would apply — `Buffer.alloc(1024)` — calls a
  static method their class does not have.
* **False negatives** — every binding that reaches Node's real constructor
  under another name was silent: `import { Buffer as NodeBuffer }`
  (`vulnerable/08`), `const BufferCtor = require('buffer').Buffer`
  (`vulnerable/09`), and `new buffer.Buffer(n)` (`vulnerable/07`), whose callee
  is not an Identifier at all.

**Fixed structurally** by resolving the callee's binding through the scope
analyser (`findVariable`) instead of reading its name: an unresolved reference
(or a `globals` entry with no definition in the file) is the Node global; an
`ImportBinding` counts only when the module is `buffer`/`node:buffer` and the
IMPORTED name is `Buffer`; a `Variable` counts only when it was destructured
from, or read off, a `require('buffer')`. Member-expression callees are matched
against the module namespace the same way. **After: TP 9 · FP 0 · FN 0 —
P/R/F1 100.0%.**

A third defect the corpus surfaced while reading, in the AUTOFIX rather than the
detection: `getBufferReplacement` returned `Buffer.from` for every argument that
was not a numeric *literal*, so `new Buffer(size)` — the commonest shape there
is — was auto-fixed to `Buffer.from(size)`, which throws `TypeError` at runtime.
The replacement now resolves the argument through `resolveConstant`, fixes
`const SIZE = 1024; new Buffer(SIZE)` correctly, and offers **no fix at all**
when the argument's type cannot be established. The report still stands.
