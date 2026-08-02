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
| **Recommended**| `warn` — the rule is unconditional (see below)                       |
| **Best For**   | Codebases that send, hash, or persist buffers built by hand          |

## This rule is unconditional — read this before enabling it

**The rule performs no dataflow or taint analysis.** It reports every
`Buffer.allocUnsafe()` / `Buffer.allocUnsafeSlow()` call it sees. It does *not*
attempt to prove whether the resulting buffer is fully overwritten before it is
read, and it therefore **reports correct uses too**:

```js
// Reported, even though this is safe — the copy overwrites every byte.
const buf = Buffer.allocUnsafe(src.length);
src.copy(buf);
```

That is deliberate. Proving "every byte is written before any read" requires
interprocedural dataflow, which this plugin does not do
(see the rule-scope philosophy in `.agent/plugin-rule-scope.md`). Deciding
whether a given `allocUnsafe` is safe is left to the reviewer — the rule's job
is to make sure someone looks.

There is exactly one structural exemption, and it is a parent-node check rather
than variable tracking: an allocation zeroed in the same expression.

```js
Buffer.allocUnsafe(64).fill(0); // not reported — equivalent to Buffer.alloc(64)
```

For the complementary read-side analysis — buffers read past their written
region (CWE-126) — see
[`no-buffer-overread`](./no-buffer-overread.md).

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

## Examples

### ❌ Incorrect

```js
const buf = Buffer.allocUnsafe(1024);
res.end(buf);                          // leaks prior heap contents

const header = Buffer.allocUnsafe(16);
header.writeUInt32BE(len, 0);          // 12 bytes still uninitialized
socket.write(header);

const slow = Buffer.allocUnsafeSlow(64);
```

### ✅ Correct

```js
const buf = Buffer.alloc(1024);              // zero-filled
const header = Buffer.alloc(16);
header.writeUInt32BE(len, 0);                // remaining bytes are zeros

const scratch = Buffer.allocUnsafe(64).fill(0); // zeroed at the call site
```

## Options

None. The rule takes no configuration.

## Error Message Format

```text
🔒 NODE-SECURITY CWE-908 | Uninitialized Buffer Allocation | HIGH
   Fix: Use `Buffer.alloc(size)` (zero-filled), or keep `allocUnsafe` only where
   the very next statement overwrites the whole buffer.
```

## When Not To Use It

Turn the rule off (or scope it with an override) in code where `allocUnsafe` is
a measured, reviewed performance decision and every allocation is provably
overwritten — stream framing layers, codecs, parsers with their own buffer
pools. Because the rule is unconditional, it will report all of them.

## Known False Positives

- Any `allocUnsafe` whose buffer is fully overwritten through a variable
  (`const b = Buffer.allocUnsafe(n); src.copy(b);`). Documented above; this is
  the rule's main noise source and the reason it ships as `warn`.

## Known False Negatives

- Computed access (`Buffer['allocUnsafe'](n)`) and dynamic dispatch
  (`global['Buffer'].allocUnsafe(n)`) are not resolved.
- Aliases (`const alloc = Buffer.allocUnsafe; alloc(n);`) are not tracked.
- Buffer shims and polyfills that ship their own `allocUnsafe` are out of scope.

## Landscape

| Package | Rule | Behavior |
| :--- | :--- | :--- |
| `eslint-plugin-security-node` | `detect-buffer-unsafe-allocation` | Unconditional; ships `recommended: false` |
| `@microsoft/eslint-plugin-sdl` | `no-unsafe-alloc` | Unconditional |
| **`eslint-plugin-node-security`** | **`no-unsafe-buffer-alloc`** | Unconditional, plus `allocUnsafeSlow`, the `.fill()` exemption, and a `Buffer.alloc` suggestion |
