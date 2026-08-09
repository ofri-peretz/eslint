---
'eslint-plugin-secure-coding': minor
---

Drop `no-unchecked-loop-condition` from the `recommended` preset

Measured over `express` + `axios` + `sequelize`, the rule fired 39 times and
**38 of them were bounded loops**:

| pattern | count |
|---|---|
| `for (const x of collection)` | 24 |
| `for (i = 0; i < len; i++)` | 7 |
| `for (const key in obj)` | 6 |
| `for (;;)` | 1 |

The single structurally-unbounded hit (`for (;;)` in axios `trackStream`)
breaks out on stream end, so it is not a denial-of-service either.

Iterating a collection is not a CWE-400 finding. The rule cannot distinguish a
bounded loop from an unbounded one, which is the entire job it exists to do. A
precise version would flag only `while (true)` / `for (;;)` with no reachable
exit — that is an unreachable-code correctness check rather than a security
rule, and core plus `unicorn` already cover it.

The rule is unchanged, still exported, still documented, and still `error` in
`strict`. Teams that want to sweep for runaway loops can enable it explicitly
and triage the output. It is no longer part of what a new consumer gets by
default.

No rule behaviour changes; this only affects the presets.
