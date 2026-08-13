---
'eslint-plugin-secure-coding': patch
---

`no-unlimited-resource-allocation` now judges **what** is allocated instead of
whether the printed callee text contains `Buffer`.

The old check asked: is this call inside any loop, and does
`sourceCode.getText(callee)` contain `alloc`, `Array`, `Buffer`, `Map`, `Set`,
`readFile` or `writeFile`? No provenance, no size, no bound. Adjudicated against
an 8-repo corpus that was **37 of the rule's 43 findings, every one false**:

| Reported | Why it was wrong |
|---|---|
| `Buffer.byteLength(arg)` | A read-only size **probe**. Allocates nothing. |
| `this.#decodeArrayItems.bind(…)` | Matched via `.bind` containing `Array`. |
| `new Set()` | Zero args, so the numeric-literal escape could never apply — *every* `new Set()` in any loop reported. |
| `stringArray.push(x)` | Matched on the **variable** name. |
| `for (var e = Array(t), u = 0; …)` | The allocation is in the for-**init** and runs once. |

The sharpest one: `Shopify/cli` `system.ts:437` was flagged on the size cap
itself — the next lines throw `Stdin input exceeded the maximum allowed size`.
The rule reported the mitigation for its own finding.

Three requirements now, each of which the substring heuristic lacked:

1. The callee is an allocator, matched **exactly** — `Buffer.alloc`,
   `Buffer.allocUnsafe`, `Array`, `Map`, `Set`, `WeakMap`, `WeakSet` and their
   `new` forms. `Buffer.byteLength` and `Array.isArray` are not allocations.
2. There is a size argument and it is not a numeric literal.
3. It is in the loop's **body**, not its init.

Genuine unbounded allocation in a loop still reports —
`while (c) { new Array(dynamicCount); }` — as does the `new` spelling, which
previously needed its own duplicate heuristic. Filling a pre-sized container
(`buffers[i] = Buffer.alloc(n)`) stays exempt.

Measured: **43 findings → 6.**
