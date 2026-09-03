# Rule corpus — `node-security/no-buffer-overread` (CWE-126)

Written from CWE-126 semantics (Buffer Over-read) and real Node idiom, **not**
from the rule's own test file. The point is independent evidence: a corpus
derived from the tests can only re-derive what the author already thought of —
and in this rule's case the tests had themselves become the record of a defect
(see "What this corpus proved").

CWE-126 is a READ past the end of a buffer. Two facts have to be true together
for a finding: the receiver really is a Buffer (an out-of-range read of a
JavaScript *array* is `undefined`, not a disclosure of adjacent memory), and the
offset is one an attacker can move. Every fixture below varies exactly one of
those two, so a rule that gets either from a variable's SPELLING is visible
immediately.

Each fixture is one file, one shape, with the rationale in a header comment.
`vulnerable/` must be reported; `safe/` must stay quiet.

## vulnerable/

| file | shape |
|---|---|
| `01-express-slice-from-query.js` | `blob.slice(Number(req.query.start), …)` where `blob` came from `readFileSync` |
| `02-computed-index-from-body.js` | `table[req.body.slot]` — a single byte at a client-chosen index |
| `03-header-offset-unvalidated.js` | `readUInt32BE(at)` with `at` from an HTTP header, through one intermediate `const` |
| `04-ts-cast-index.ts` | TypeScript: `Number(req.query.at as string)` sizing a `subarray` offset |
| `05-guard-on-the-wrong-variable.js` | a PARTIAL mitigation: the bounds check is on `end`, the read uses `start` |
| `06-worker-message-index.js` | a worker thread indexing a shared page by `message.params.offset` |
| `07-copy-length-from-request.js` | `source.copy(dest, 0, 0, Number(req.query.until))` — the read runs off the SOURCE |
| `08-alias-hop.js` | **adversarial** — the tainted offset reaches the read through a `const` alias |
| `09-let-reassigned-from-request.js` | **adversarial** — a `let` declared `0` and last-written from `req.query` |
| `10-fake-clamp-helper.js` | **adversarial** — a local `clampIndex` that only does `value \| 0` |
| `11-big-endian-64-read.js` | **adversarial** — `readBigUInt64BE`; network byte order is big-endian |
| `12-helper-parameter-from-wire.js` | **adversarial** — the read is in a helper whose offset is a PARAMETER, and the caller one function away passes the query string |

## safe/

| file | shape |
|---|---|
| `01-literal-offsets.js` | a fixed header read at literal offsets after a `frame.length` check |
| `02-bounds-checked-request-offset.js` | the correct remediation for `vulnerable/03`: the same header offset, checked against both ends |
| `03-loop-bounded-by-length.js` | the loop condition IS the bounds check |
| `04-clamped-with-math-min.js` | clamped to `archive.length` — a bound the peer cannot move |
| `05-const-literal-offset.js` | **the name probe** — `const offset = 4`, no request anywhere in the file |
| `06-screaming-const-index.js` | **the second name probe** — `VERSION_INDEX` / `FLAGS_INDEX` protocol constants |
| `07-plain-array-named-buffer.js` | **the third name probe** — `lineBuffer` is an ARRAY of strings |
| `08-argv-slice-not-a-buffer.js` | `process.argv.slice(2)` and `args[patternIndex + 1]` |
| `09-buffer-write-not-read.js` | a buffer OVERWRITE — CWE-787, a different weakness |
| `10-slice-with-bytelength.js` | bounds from `Buffer.byteLength` of a value the process produced |
| `11-lint-doc-mentions-request.js` | the vocabulary appears only in strings and comments |
| `12-typed-array-metadata.js` | `length` / `byteLength` / `byteOffset` — shape, not contents |
| `13-array-named-buffer-user-index.js` | **adversarial** — a genuinely request-controlled index into a genuinely plain ARRAY |
| `14-user-index-write-target.js` | **adversarial** — a real Buffer, a real tainted index, but a WRITE |

## What this corpus proved

Baseline (7 vulnerable / 12 safe, before the adversarial wave):
**TP 4 · FP 3 · FN 3 — P 57.1% · R 57.1% · F1 57.1%.**
After the adversarial wave (12 / 14): **TP 5 · FP 4 · FN 7 — P 55.6% · R 41.7% ·
F1 47.6%.**
After the fixes: **TP 11 · FP 0 · FN 1 — P 100.0% · R 91.7% · F1 95.7%.**

### The false positives were all one defect: a name deciding a report

This rule carried `nominal-inference-report` debt, and the probe the debt note
asks for lands immediately. `const offset = 4; MAGIC[offset - 1]` — a file with
no request, no socket and no parameter — was reported as **"Buffer accessed with
user-controlled index"**. Rename `offset` to `n` and the finding disappears.

Four separate name tests were doing it, all on a reporting path, two of them
matching **printed source** rather than the AST:

```ts
// index.ts:298  — isBufferType
for (const type of bufferTypesSet) if (lowerName.includes(type)) return true;
// index.ts:399  — isUserControlledIndex
for (const keyword of userControlledKeywords) if (varName.includes(keyword)) return true;
// index.ts:418  — isUserControlledIndex, on getText()
keywords.some(k => sourceCode.getText(init.object).toLowerCase().includes(k))
// index.ts:467  — isUserControlledIndex, on getText()
keywords.some(k => sourceCode.getText(indexNode).toLowerCase().includes(k))
```

`userControlledKeywords` contains `offset` and `index`, so every conventional
protocol constant was "user-controlled". `bufferTypes` was substring-matched, so
`rowBuffer` (built by `rows.map`) and `lineBuffer` (an array of strings) were
"buffers" — `safe/07` and `safe/13`.

**Fixed structurally.** `isUserControlledIndex` is now one line delegating to
`makeReadsTaintSource` from `src/utils/provenance.ts`: request roots, request
PROPERTY names wherever the receiver came from, one hop per binding,
last-write-before-use, and `unwrapTypeSyntax`. `isBufferType` resolves the
binding first and falls back to EXACT membership in `{buf, buffer, bytes}` only
for a parameter, whose type this file genuinely cannot see. Nothing was lost:
`isIndexValidated` already exempted parameters, so the name test could only ever
fire on a local — whose provenance is precisely what the taint reader follows.
`npm run lint:name-inference` now reports **no name-substring sites left** in
this rule.

### And five separate false negatives

1. **Every big-endian reader was missing** (`index.ts:150`, `bufferMethods`).
   The default list held `readUInt16LE`/`readUInt32LE`/`readInt*LE` and no `*BE`
   spelling at all. Network byte order IS big-endian, so a protocol parser
   reaches for `*BE` almost exclusively — `vulnerable/03` and `vulnerable/11`
   were both silent. The READ surface is now complete (including
   `readBigUInt64BE`, `readFloat*`, `readDouble*`, `readUIntBE`, `readIntBE`).
2. **TypeScript casts ended the walk** — `Number(req.query.at as string)` fell
   through to `default: return false` (`vulnerable/04`). `makeReadsTaintSource`
   unwraps type syntax.
3. **A `let` was read at its declarator** — `let at = 0; … at = Number(req.query.at)`
   answered "0" (`vulnerable/09`). Last-write-before-use now.
4. **`readFileSync` results were not buffers** (`vulnerable/01`). The commonest
   way a Buffer enters a program was invisible. `readFileSync(path)` with no
   second argument returns a Buffer; with an encoding it returns a string, so
   the argument shape decides rather than the callee's name.
5. **`isIndexValidated` never read the binding.** It walked the index's
   ANCESTORS looking for a `VariableDeclarator` with a matching name — but a use
   site is never inside its own declarator, so the walk could only succeed for
   `const i = f(i)`. `const safeIdx = Math.min(buffer.length - 1, n); buffer[safeIdx]`
   was asserted in the test suite as a "Known Limitation". It now resolves the
   binding through `bindingInit`.

### Two more defects found while fixing those

* **`hasBoundsCheck` matched printed source** (`index.ts:564`). It rendered the
  enclosing condition with `sourceCode.getText` and asked whether the string
  contained `"<buffername>.length"` and one of `< <= > >= && ||` — satisfied by a
  comment, a string literal, or `return buf.length && buf[cursor]`. It also
  keyed on the buffer's SPELLING, so a shadowed name in another scope counted.
  It is now an AST search for a comparison one of whose sides mentions the index
  and the other of which reads `.length` on the SAME resolved buffer — and it is
  consulted by the slice and read-method arms too, which it never was, so the
  documented remediation used to silence `buf[at]` and leave `buf.readUInt32BE(at)`
  reporting.
* **`couldBeNegative` reported on ignorance** (`index.ts:622`). Any subtraction
  answered "could be negative — conservative", and the identifier branch walked
  ANCESTORS, attributing an enclosing declarator's initializer to the index:
  `const { [buf[k]]: a } = -5` was a negative index for `k`. It now resolves the
  value (through `const` aliases and unary minus, which `resolveConstant` alone
  cannot reach) and reports only when it is actually below zero.

### The one remaining false negative — NOT fixed, deliberately

`vulnerable/12-helper-parameter-from-wire.js`:

```js
function readField(frame, at) { return frame.readUInt16BE(at); }
app.get('/field', (req, res) => res.json({ value: readField(store, Number(req.query.at)) }));
```

The read is in a helper whose offset is a PARAMETER, and `isIndexValidated`
treats a parameter as validated because its value is decided by a caller the
rule does not follow. Closing this needs the one-hop call-site analysis that
`no-unsafe-buffer-alloc` has (`wireParams`), plus deferring every report to
`Program:exit`. Fixing it *without* that hop means reporting every parameter
index, which is the sweep the `reportUnvalidatedIndices` option already
measures at 15 findings across 8 repos — twelve of them not overreads. Reported
rather than traded.

### A note for the coordinator

`scripts/lint-name-inference.ts:381-388` still registers this rule's
name-substring debt. The gate now reports it as **stale** ("no name-substring
sites left; delete the entry") and fails the build on that. The entry must be
deleted; `scripts/` was outside this task's write boundary.
