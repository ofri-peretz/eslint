# `secure-coding/no-unlimited-resource-allocation` — the contract

CWE-770, *Allocation of Resources Without Limits or Throttling*.

Written from the weakness and from Node's measured behaviour. **Every claim below
was executed on Node 24, not reasoned about** — and two of them contradict what
the rule currently asserts.

---

## 0. What the weakness actually is, measured

### An allocation is not a sink. A WRITE is.

| step | RSS |
| :--- | ---: |
| baseline | 44 MB |
| `Buffer.alloc(512MB)` | 46 MB |
| `Buffer.allocUnsafe(512MB)` | 46 MB |
| **writing to that buffer** | **558 MB** |
| `new Array(50_000_000)` | 558 MB (no change) |
| **`arr.fill(0)`** | **716 MB** |

Reserving address space is nearly free; the operating system maps zero pages
lazily. The memory is consumed when it is *written*. So `Buffer.alloc(n)` on its
own is a much weaker claim than the rule currently makes.

### `new Array(n)` is not an allocation at all

```
new Array(100_000_000)   →  0 own keys, length 100000000, +0 MB
new Array(4294967295)    →  succeeds
new Array(4294967296)    →  RangeError
```

A sparse array holds no elements. **The rule reports `new Array(userInput)` as
`unlimitedMemoryAllocation`, and this measurement says that is wrong** unless the
array is subsequently filled, spread, or written through.

### Node imposes no useful ceiling of its own

```
Buffer.alloc(1 GiB)                 allocates
Buffer.alloc(4 GiB)                 allocates
Buffer.alloc(MAX_SAFE_INTEGER)      RangeError
buffer.constants.MAX_LENGTH         9007199254740991
```

There is no built-in guard to defer to. A `RangeError` at the top of that range
is itself a denial of service — an uncaught throw on a request path.

### Decompression IS unbounded by default, and the ratio is the stake

```
createGunzip().maxOutputLength                 9007199254740991   (effectively none)
10 MB of zeros → gzip                          10,221 bytes
expansion ratio                                1026x
gunzipSync(bomb, { maxOutputLength: 1024 })    throws ERR_BUFFER_TOO_LARGE
gunzipSync(bomb)                               expands fully
```

A 10 KB upload becomes 10 MB. This is the strongest sink in the rule's surface
and the one where a guard is both necessary and detectable.

---

## 1. Sink — the dangerous operation

| Tier | Sink | Why |
| :--- | :--- | :--- |
| **Strong** | `zlib.createGunzip/createUnzip/createInflate`, `unzipper.Extract/Parse`, `tar.x`, `yauzl.open` | measured 1026x expansion, unbounded by default |
| **Strong** | `Buffer.alloc(n)` / `allocUnsafe(n)` **followed by a write**, or where `n` may exceed `MAX_LENGTH` | the write is what costs |
| **Medium** | `multer()` without `limits.fileSize` | an upload path with no ceiling |
| **Weak** | `Buffer.alloc(n)` with no write in view | reserves address space only |
| **NOT a sink** | `new Array(n)` alone | sparse; 0 own keys; 0 MB |

## 2. Source — where an unbounded value enters

Attacker-controlled, by **evidence** rather than by the identifier's spelling:

- a member access of a request surface — `.body`, `.query`, `.params`, `.headers`,
  `.cookies`, `.rawBody`, `.files`, `.searchParams` — on any object
- a `Content-Length` or similar header value
- a length or size read from parsed input the process did not produce
- **NOT** `process.env` / `process.argv` — operator-supplied. An operator who
  wants to exhaust their own process does not need a bug.
- **NOT** `process.pid`, `__dirname`, `import.meta.url` — runtime facts

## 3. Path — how far the rule follows

One binding hop inside the file: `const n = req.body.size; Buffer.alloc(n)`.
Through arithmetic and template literals. **Not** into a called function, and
**not** across modules — that is [L1](../../ANALYSIS-LIMITS.md).

## 4. Guard — what makes it safe

- an explicit ceiling passed to the API: `maxOutputLength`, `limits.fileSize`, `maxSize`
- `Math.min(n, CONST)` on the size, in view
- a comparison of an accumulated byte count against a threshold **in the same
  function** — this is real and detectable; the rule already scans for it
- a size that resolves to a literal or to arithmetic over literals

**A guard that cannot be faked.** No name-keyed allowlist: `validateSize` proves
nothing, because `const validateSize = () => true` is one line away.

## 5. Context — where the weakness cannot apply

Test files, fixtures, build and migration scripts, vendored bundles. Handled by
`skipTestFiles` and by corpus hygiene rather than by the rule's logic.

---

## The five decisions

| # | Decision | This rule |
| :--- | :--- | :--- |
| 1 | Sink identified by | module binding (`resolveModuleBinding`), never callee spelling |
| 2 | Source identified by | request-surface member access — evidence, not name |
| 3 | Path depth | one binding hop, in-file, through arithmetic |
| 4 | Guard | an explicit numeric ceiling, or a counted-bytes comparison in the same function |
| 5 | **When unprovable** | **stay quiet.** A size the file cannot resolve is not thereby hostile — that assumption produced the 173 findings this rule was fixed away from |

---

## The prediction

**These must report:**

1. `zlib.createGunzip()` piped from a request, no `maxOutputLength`, no byte count
2. `unzipper.Extract()` on an uploaded archive with no ceiling
3. `Buffer.alloc(req.body.size)` then a write into that buffer
4. `Buffer.alloc(n)` where `n` is arithmetic over a request value that can exceed `MAX_LENGTH`
5. `multer({})` with no `limits.fileSize`

**These must stay quiet:**

1. `zlib.createGunzip({ maxOutputLength: 1_000_000 })`
2. A decompression whose output bytes are accumulated and compared to a ceiling in the same function
3. `Buffer.alloc(1024)` — and any literal, and any arithmetic over literals
4. `Buffer.alloc(process.env.SIZE)` — operator-supplied
5. **`new Array(req.body.count)` with no fill, spread or write** — measured to cost nothing
6. `Buffer.alloc(chunk.length)` — a length the process already holds
7. `new Set(collection)` inside a loop over a collection the process already holds

**Known gap, stated up front:** a size arriving as a function parameter with no
visible initializer is not reported. That is [L1](../../ANALYSIS-LIMITS.md), not
an oversight — assuming a parameter is hostile is what generated the noise.

---

## What measuring this spec must answer

- Does prediction-to-report #3 fire, and does #5-quiet stay quiet? **`new Array`
  is the one where the rule and this spec currently disagree.**
- Findings per 1,000 LOC on the 20-repo corpus
- Distinct cases, and the collapse ratio — is the output reviewable at all
- Precision by case, weighted by findings

*Frozen 2026-08-19. Changing it after measurement is a restatement, recorded and
dated, not an edit.*
