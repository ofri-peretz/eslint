# Design — our code owns the tree

Intent: [`intent.md`](./intent.md). Plan: [`plan.md`](./plan.md).
**Status:** draft (2026-11-07).

`plan.md` is the phase-by-phase design. This file records what has shipped, the
rulings that changed the plan, and what remains, so that the remaining work
can be picked up without re-reading the history.

---

## Requirements

- **R1 (C1).** The published runtime tree is measured against a declared
  allowlist. **Amended:** satisfied by the dependency ledger that shipped in
  phase 5b, `.agent/dependency-ledger.json`, locked by
  `scripts/__tests__/dependency-ledger.lock.test.ts`, plus the existing
  `scripts/verify-runtime-deps.ts` emitted-require gate. Phase 0's separate
  `check-runtime-deps.ts` and allowlist would be a second gate over the same
  facts, and ADR 0011 rules that an intent adds no gate to close itself.
- **R2 (C2).** No `@typescript-eslint` specifier in any published `dist/**`.
- **R3 (C3).** `@interlace/eslint-devkit` drops its `@typescript-eslint/utils`
  peer dependency.
- **R4 (C4).** No test imports `@typescript-eslint/rule-tester`.
- **R5 (C5).** Root devDependencies carry no glob, jest, ts-jest or stryker.
  **Met.**
- **R6 (C6).** No minimatch/glob audit exception exists because of a choice we
  made. **Partly met.** One exception remains, `minimatch <11.0.1` (expires
  2026-12-04), and it is reached through `typescript-estree`, which phase 1
  removes from the published graph.

## Design

| Phase                                       | State on 2026-11-07                                                                       | Delivered by                      |
| :------------------------------------------ | :---------------------------------------------------------------------------------------- | :-------------------------------- |
| 0 gate                                      | replaced by the dependency ledger (R1)                                                    | #1362                             |
| 1 devkit owns its AST and rule types        | **next.** 38 non-test `packages/*/src` files import `@typescript-eslint/utils`            | —                                 |
| 2 no runtime `require` of typescript-eslint | 2.1 shipped (espree fallback parser)                                                      | #1369                             |
| 3 third-party runtime deps                  | shipped                                                                                   | #1364                             |
| 4 tests on ESLint's `RuleTester`            | not started. Codemod over 947 files, about 6 batches; the owner's default is "do it last" | —                                 |
| 5 / 5b root tooling, dependency ledger      | shipped                                                                                   | #1359, #1363, #1366, #1367, #1362 |
| 6 close the loop                            | after 1 and 4                                                                             | —                                 |

Phase 1 is one PR per slice:

1. Generate a `TSESTree`/`TSESLint` type snapshot into
   `packages/eslint-devkit/src/types/`, with a drift check against the
   installed version (plan §1.1).
2. Re-point the 38 imports to `@interlace/eslint-devkit`, in batches per plugin.
3. Drop the peer dependency, then verify R2 on `dist` with
   `grep -rl @typescript-eslint packages/*/dist`.

## Verification

- R2: `grep -rl "@typescript-eslint" packages/*/dist --include=*.d.ts --include=*.js`
  returns nothing after a build.
- R3: `packages/eslint-devkit/package.json` has no `@typescript-eslint/*` peer.
- R4: `git grep -l "@typescript-eslint/rule-tester" -- packages` returns nothing.

## Rejected alternatives

See `plan.md` § Rejected alternatives: writing our own parser, hand-writing
the AST types, and bundling dependencies into `dist`. One more is added here:

- **A new runtime-deps allowlist gate (phase 0 as planned).** Rejected under
  ADR 0011. The dependency ledger already records each dependency with its
  reason and is lock-tested.

## Out of scope

The items in `plan.md` § Out of scope.
