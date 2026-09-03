---
title: no-unsafe-buffer-alloc
description: Disallow `Buffer.allocUnsafe()` and `Buffer.allocUnsafeSlow()`, which return uninitialized memory.
tags: ['security', 'node-security', 'memory-safety']
category: security
cwe: CWE-908
owasp: A01:2021
autofix: suggestions
---

> **Keywords:** no-unsafe-buffer-alloc, Buffer.allocUnsafe, Buffer.allocUnsafeSlow, uninitialized memory, CWE-908, Buffer.alloc, Node.js, ESLint rule
> **CWE:** [CWE-908: Use of Uninitialized Resource](https://cwe.mitre.org/data/definitions/908.html)

<!-- @rule-summary -->
Disallow `Buffer.allocUnsafe()` and `Buffer.allocUnsafeSlow()`. Both hand back a buffer over memory that was never zeroed — until every byte is overwritten, the buffer contains whatever the allocator last stored there.
<!-- @/rule-summary -->

This rule is part of [`eslint-plugin-node-security`](https://www.npmjs.com/package/eslint-plugin-node-security).

## Quick Summary

| Aspect         | Details                                                              |
| -------------- | -------------------------------------------------------------------- |
| **Severity**   | High (Security — memory disclosure)                                  |
| **Auto-Fix**   | 💡 Suggestion (`Buffer.alloc`)                                       |
| **Category**   | Node Security                                                        |
| **CWE**        | [CWE-908](https://cwe.mitre.org/data/definitions/908.html)           |
| **Recommended**| `warn` — reports unless coverage is structurally visible (see below) |
| **Best For**   | Codebases that send, hash, or persist buffers built by hand          |

## What the rule reports, and what it lets through

The hazard is a byte that is **read before it is written**. A buffer that is
filled before anything looks at it discloses nothing, so the rule stays silent
on two shapes and reports everything else.

**1. Zeroed in the same expression.** A parent-node check, not variable
tracking.

```js
Buffer.allocUnsafe(64).fill(0); // not reported — equivalent to Buffer.alloc(64)
```

**2. Covered before it is read.** The allocation is bound to a local, and the
first thing that touches that local is a *covering* write.

```js
// Not reported — the loop writes every byte before `result` escapes.
// (redis/ioredis lib/Command.ts:667)
const result = Buffer.allocUnsafe(this.length);
let offset = 0;
for (const item of this.items) {
  const length = Buffer.byteLength(item);
  Buffer.isBuffer(item)
    ? item.copy(result, offset)
    : result.write(item, offset, length);
  offset += length;
}
return result;
```

"Covering" is narrower than "any write", because proving full coverage is
undecidable and the rule refuses to pretend otherwise. Two shapes cover by
construction:

| Shape | Covering? | Why |
| :--- | :--- | :--- |
| `buf.fill(v)` | ✅ | fills to the end of the buffer by definition |
| `src.copy(buf)`, `buf.set(src)`, `buf.write(s)` | ✅ | one argument: starts at 0, runs for the source's whole length |
| `buf.write(s, offset)` / `src.copy(buf, offset)` **inside a loop** | ✅ | a moving offset is a buffer being walked |
| `buf.writeUInt32BE(v, 0)` | ❌ | a fixed offset stamps one field and leaves the rest |
| `src.copy(buf, 0, 0, 4)` | ❌ | a fixed slice |
| `buf[i] = v` | ❌ | one byte |

A partial write does not *end* the search — it is not a read either — so a
fixed-offset write followed by a covering one is still accepted. A read reached
before any covering write is reported.

Anything the rule cannot resolve to a local binding still reports:
`return Buffer.allocUnsafe(n)`, `this.buf = Buffer.allocUnsafe(n)`,
`f(Buffer.allocUnsafe(n))`. References are compared in **source order**, which
is an approximation of execution order: a buffer written inside a callback
declared above its first read is judged on where the text sits, not on when it
runs.

For the complementary read-side analysis — buffers read past their written
region (CWE-126) — see
[`no-buffer-overread`](./no-buffer-overread.md).

## The CWE-789 half: allocation sized off the wire

The same rule reports `new Array(n)`, `Buffer.alloc(n)` and the typed-array
constructors when `n` is a length field a peer chose. The mechanism is not the
one this documentation used to claim ("a large length makes the process
allocate and then walk a huge structure"). Measured on V8 (node 24,
`--expose-gc`, `heapUsed` delta):

```text
new Array(1e9)  ->  0.003 ms,    0.0 MB   // dictionary mode — free
new Array(3e7)  -> 20.700 ms,  228.9 MB   // packed elements — 12 wire bytes buy 229 MB
new Array(4e7)  ->  0.007 ms,    0.0 MB   // flips back to dictionary mode
```

The cost is a **narrow band** below V8's packed-elements limit (~33.5M
elements), not a monotonic function of `n`. That inverts the usual advice: a
bounds check that rejects only implausibly large lengths rejects exactly the
values that cost nothing, and admits the ones that cost a quarter of a
gigabyte. Clamp against the maximum the *protocol* permits, not against a
number that merely looks big.

`Buffer.alloc(n)` and the typed arrays have no such threshold — they commit `n`
bytes at every `n`.

## Why `allocUnsafe` is dangerous

`Buffer.alloc(size)` zero-fills. `Buffer.allocUnsafe(size)` skips that step and
returns a slice of a pre-allocated pool, which is why it is faster. The bytes it
returns are whatever the previous owner of that memory left behind: decrypted
request bodies, session tokens, private keys.

Any byte not overwritten before the buffer is read, hashed, written to disk, or
sent over the network discloses that memory to whoever receives it. This is the
same class of defect as [CVE-2018-7166](https://nvd.nist.gov/vuln/detail/CVE-2018-7166),
where Node's own `randomFillSync` fallback returned unzeroed memory.

`Buffer.allocUnsafeSlow(size)` has the identical hazard — it only differs in
allocating outside the shared pool.

| Allocator                       | Zero-filled | Reported by this rule |
| :------------------------------ | :---------- | :-------------------- |
| `Buffer.alloc(size)`            | ✅ yes      | no                    |
| `Buffer.allocUnsafe(size)`      | ❌ no       | yes                   |
| `Buffer.allocUnsafeSlow(size)`  | ❌ no       | yes                   |
| `Buffer.allocUnsafe(size).fill(0)` | ✅ yes   | no (structural exemption) |
| `const b = Buffer.allocUnsafe(n); src.copy(b);` | ✅ effectively | no (covered before read) |

## Examples

### ❌ Incorrect

```js
const buf = Buffer.allocUnsafe(1024);
res.end(buf);                          // leaks prior heap contents

const header = Buffer.allocUnsafe(16);
header.writeUInt32BE(len, 0);          // 12 bytes still uninitialized
socket.write(header);                  // …and they go out on the wire

const slow = Buffer.allocUnsafeSlow(64);
```

### ✅ Correct

```js
const buf = Buffer.alloc(1024);              // zero-filled
const header = Buffer.alloc(16);
header.writeUInt32BE(len, 0);                // remaining bytes are zeros

const scratch = Buffer.allocUnsafe(64).fill(0); // zeroed at the call site

const copy = Buffer.allocUnsafe(src.length);    // covered before any read
src.copy(copy);
send(copy);
```

## Options

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `wireNames` | `string[]` | `["chunk","chunks","buffer","buf","payload","frame","packet","raw","message","msg"]` | Binding names that carry bytes off the wire. Replaces the default; pass [] to turn the name arm off. |
| `requestRootNames` | `string[]` | `["req","request","ctx","event"]` | Root identifiers treated as a request. Replaces the default. |
| `countNames` | `string[]` | `["length","len","size","count","n","num","total","capacity","bytelength"]` | Identifiers that hold an allocation size rather than a payload. Replaces the default. |

## Error Message Format

```text
🔒 NODE-SECURITY CWE-908 | Uninitialized Buffer Allocation | HIGH
   Fix: Use `Buffer.alloc(size)` (zero-filled), or keep `allocUnsafe` only where
   the very next statement overwrites the whole buffer.
```

## When Not To Use It

Turn the rule off (or scope it with an override) in code where `allocUnsafe` is
a measured, reviewed performance decision and coverage is proved by an argument
the rule cannot see — a pool whose bookkeeping lives in another module, or a
codec that hands the buffer to native code to fill.

## Known False Positives

- An allocation covered through a shape the rule does not model: filled by a
  helper (`fillHeader(buf)`), by a native binding, or across a module boundary.
  These stay reported; unresolved is not the same as safe.
- Coverage proved only by execution order that differs from source order — a
  buffer written inside a callback declared above its first read.

## Known False Negatives

- Computed access (`Buffer['allocUnsafe'](n)`) and dynamic dispatch
  (`global['Buffer'].allocUnsafe(n)`) are not resolved.
- Aliases (`const alloc = Buffer.allocUnsafe; alloc(n);`) are not tracked.
- Buffer shims and polyfills that ship their own `allocUnsafe` are out of scope.
- A loop write at a moving offset is treated as covering. A loop that writes
  only part of the buffer — an early `break`, a bound smaller than the
  allocation — is accepted on a coverage argument the rule did not check.

## Landscape

| Package | Rule | Behavior |
| :--- | :--- | :--- |
| `eslint-plugin-security-node` | `detect-buffer-unsafe-allocation` | Unconditional; ships `recommended: false` |
| `@microsoft/eslint-plugin-sdl` | `no-unsafe-alloc` | Unconditional |
| **`eslint-plugin-node-security`** | **`no-unsafe-buffer-alloc`** | `allocUnsafeSlow` too, the `.fill()` exemption, a covered-before-read check that clears the whole-buffer-copy idiom, a `Buffer.alloc` suggestion, and the CWE-789 wire-sized-allocation check |
