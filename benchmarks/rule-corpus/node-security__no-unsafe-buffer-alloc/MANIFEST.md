# Rule corpus — `node-security/no-unsafe-buffer-alloc` (CWE-908 / CWE-789)

Written from CWE-908 semantics (Use of Uninitialized Resource) and real Node
idiom, **not** from the rule's own test file. The point is independent evidence:
a corpus derived from the tests can only re-derive what the author already
thought of.

The rule carries two arms and both are exercised here:

* **CWE-908** — `Buffer.allocUnsafe` / `allocUnsafeSlow` hand back memory that
  was never zeroed. The question is never "was `allocUnsafe` written" but
  **"is any byte READ before it is WRITTEN"**, so the fixtures vary the
  *coverage evidence*, not the call.
* **CWE-789** — the allocation SIZE is chosen by the peer. The question there is
  **"can the peer move this number, and is it bounded by something they cannot
  move"**, so the fixtures vary the provenance of the size and the honesty of
  the mitigation.

Each fixture is one file, one shape, with the rationale in a header comment.
`vulnerable/` must be reported; `safe/` must stay quiet.

## vulnerable/

| file | shape |
|---|---|
| `01-header-partial-write.js` | 16-byte header, 4 bytes stamped at offset 0, the rest goes out on the socket |
| `02-alloc-escapes-return.js` | the allocation is RETURNED — no caller in this file to prove coverage |
| `03-allocunsafeslow-pool.js` | `allocUnsafeSlow` parked on an instance property and read by a later method |
| `04-alloc-passed-into-call.js` | passed directly into `stream.push` — never bound, never covered |
| `05-read-before-cover.js` | the covering copy exists, but a debug log reads the buffer two lines earlier |
| `06-unbounded-alloc-from-request.js` | CWE-789: `Buffer.alloc(Number(req.body.slotBytes))` through one intermediate `const` |
| `07-decoder-length-prefix.ts` | CWE-789 in TypeScript: `chunk.readUInt32BE(0) as number` sizes a `Uint8Array` |
| `08-computed-allocator.js` | **adversarial** — `Buffer[ALLOCATOR](n)` with a `const` string key (config-driven pool) |
| `09-destructured-allocator.js` | **adversarial** — `const { allocUnsafe } = require('node:buffer').Buffer` |
| `10-local-safe-alloc-wrapper.js` | **adversarial** — a local helper named `safeAlloc` that just forwards to `allocUnsafe` |
| `11-let-reassigned-from-request.js` | **adversarial** — a `let` whose declaration is `1024` and whose last write is `Number(req.query.capacity)` |
| `12-math-min-against-attacker.js` | **adversarial** — a FAKE clamp: `Math.min` between two values the same peer supplies |
| `13-implicit-offset-partial-write.js` | **adversarial** — `writeUInt32BE(value)` with the offset OMITTED: 4 of 16 bytes |

## safe/

| file | shape |
|---|---|
| `01-buffer-alloc-literal.js` | the correct remediation: `Buffer.alloc` at a module-constant size |
| `02-allocunsafe-filled-inline.js` | `Buffer.allocUnsafe(n).fill(0)` — zeroed in the same expression |
| `03-covered-by-loop.js` | the ioredis serializer: a loop writing every byte at a MOVING offset |
| `04-covered-by-whole-copy.js` | `source.copy(destination)` — covers by construction |
| `05-covered-by-randomfill.js` | `randomFillSync(buf)` via a NAMED IMPORT — the one idiom where `allocUnsafe` is unambiguously right |
| `06-alloc-clamped-by-guard.js` | the correct CWE-789 remediation: rejected against `MAX_FRAME_BYTES` before allocating |
| `07-alloc-from-bytelength.js` | sized by `Buffer.byteLength` of a value already in memory |
| `08-migration-doc-mentions-allocunsafe.js` | the vocabulary appears only in strings and comments |
| `09-typed-array-copy-not-size.js` | `new Uint8Array(fileContents)` COPIES; the argument is a payload, not a count |
| `10-let-numeric-writes.js` | **adversarial** — the twin of `vulnerable/11`: same `let`, every write a numeric literal |
| `11-allocator-name-as-config-key.js` | **adversarial** — `allocUnsafe` only as an object KEY in a policy table |
| `12-fixed-offsets-fully-covering.js` | an 8-byte header written at literal offsets 0 and 4 — decidably complete |

## What this corpus proved

Baseline (7 vulnerable / 9 safe, before the adversarial wave):
**TP 6 · FP 3 · FN 1 — P 66.7% · R 85.7% · F1 75.0%.**
After the adversarial wave (13 / 12): **TP 7 · FP 4 · FN 5 — P 63.6% · R 58.3% ·
F1 60.9%.**
After the fixes: **TP 13 · FP 0 · FN 0 — P/R/F1 100.0%.** The two calibrated
`benchmarks/corpus/CWE-770/vulnerable/*` fixtures still report, unchanged.

Eight distinct defects, all fixed structurally in
`packages/eslint-plugin-node-security/src/rules/no-unsafe-buffer-alloc/index.ts`:

1. **`bytes` in `WIRE_NAMES` (index.ts:174, name inference on a REPORTING
   path).** `export function nonce(bytes) { Buffer.allocUnsafe(bytes) … }` was
   reported as "the peer picks the allocation"; renaming the parameter to `n`
   silenced it — the definition of a name-inference false positive. Every other
   entry in that list names a BUFFER, which is the list's whole justification;
   in Node `bytes` names a COUNT (`randomBytes(n)`, `bytesRead`). Removed.
2. **`Buffer` read as wire data (index.ts:391, `readsWire`).** `buffer` is in
   `WIRE_NAMES`, so `Buffer.byteLength(json)` — a size taken from a value
   already in memory — read as "off the wire" and made `safe/07` and `safe/08`
   findings. Now the binding is resolved: the global, or an import from
   `node:buffer`, is the namespace, not data. A local binding spelled `Buffer`
   still counts (there is a lock test for a decoder parameter of that name).
3. **`randomFillSync` only recognised as a member expression (index.ts:612,
   `classifyUse`).** The named-import spelling — `import { randomFillSync }
   from 'node:crypto'` — was classified a READ, so the single idiom where
   `allocUnsafe` is correct reported. A bare identifier is now accepted when its
   binding resolves to `node:crypto`.
4. **Fixed-offset writes never accumulate (index.ts:246,
   `coversWholeBuffer`).** An 8-byte header written at literal offsets 0 and 4
   is completely covered and was permanently reported. The allocation size is
   now resolved through `resolveConstant` and the literal spans are tracked in
   a byte map (capped at 4 KiB); an out-of-range span contributes nothing, so a
   CWE-787 overflow cannot "finish" the coverage of the buffer it overflows.
5. **A one-argument write counted as covering (index.ts:249).**
   `header.writeUInt32BE(len)` omits the offset, meaning 0, and writes FOUR
   bytes — but the "`buf.write(str)` copies the whole thing" shortcut waved it
   through. Fixed-width writers are now judged by width, not argument count.
   *This was a false negative the corpus found only because `vulnerable/13` was
   written to attack the coverage test.*
6. **TS casts fall out of `readsWire` (index.ts:521).** `chunk.readUInt32BE(0)
   as number` hit `default: return false`, silencing the whole CWE-789 arm for
   TypeScript decoders — the exact class `provenance.ts` documents. Now
   `unwrapTypeSyntax` runs first.
7. **The size hop went through a file-wide `Map<name, init>` (index.ts:377).**
   It read only the DECLARATOR, so a `let` defaulted to `1024` and then
   reassigned from `req.query` answered "1024". It also could not tell one
   scope's `size` from another's — the defect `provenance.ts` exists to retire.
   Replaced with last-write-before-use over the scope analyser's own references;
   the map is gone.
8. **`Math.min` accepted as a clamp on shape alone (index.ts:606,
   `isClamped`).** `Math.min(req.body.want, req.body.max)` wears the shape of a
   mitigation while leaving both operands in the attacker's hands, so the fake
   mitigation was quieter than no mitigation. At least one operand must now be
   out of the peer's reach.

**A lock test pinned defect 5's sibling.** `no-unsafe-buffer-alloc.test.ts:29`
asserted `Buffer["allocUnsafe"](64)` as **valid**, annotated *"Computed access is
not resolved (documented false negative)"*. Documenting a defect is not
mitigating it. The case has been moved to `invalid`, and the computed key is now
resolved through `resolveConstantString`.
