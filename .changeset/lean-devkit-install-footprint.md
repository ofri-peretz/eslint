---
'@interlace/eslint-devkit': major
'eslint-plugin-import-next': patch
---

Zero runtime dependencies: install 7500 kB → 444 kB, load 242 ms → 13.6 ms

`@interlace/eslint-devkit` is the infrastructure package every plugin in this
ecosystem depends on, so its dependency tree was every plugin's dependency
tree — 2 dependencies pulling 22 packages, 5.42 MB as reported by
packagephobia, and 433 modules evaluated on every `require`.

It now declares **no dependencies at all**. A bare install is one package;
the tarball is 65.9 kB packed; a cold `require` of the barrel loads 29
modules in 13.6 ms instead of 433 in 242 ms — roughly a quarter-second off
every ESLint process start, per plugin.

End to end, on the same fixture and min-of-10 warm: **ESLint 288 → 216 ms
(−25%)** and **oxlint 320 → 145 ms (−55%)**. oxlint benefits because it loads
these plugins through the JS-plugin shims in `tools/oxlint-plugins/`; against
its 68 ms pure-Rust floor, the JS-plugin overhead fell **252 → 77 ms (−69%)**.

The compiled output only ever made five external `require()` calls. Four were
avoidable:

- **`typescript` (24 MB)** — imported only for `ts.TypeFlags` bitflag
  constants in `type-utils.ts`. Those values are now inlined, and `typescript`
  is an optional peer. `src/types/type-flags.test.ts` asserts the inlined
  table against the real compiler so it cannot silently drift.
- **`@typescript-eslint/utils` (~4.5 MB with its tree)** — used at runtime
  only for `ESLintUtils.RuleCreator` and `AST_NODE_TYPES`. `RuleCreator` is
  ported in-tree with its full generic signature;
  `src/rule-creation/rule-creator.parity.test.ts` diffs the port against
  upstream on every run. Crucially, `utils` declares a _non-optional_
  `typescript` peer — dropping it as a hard dependency is what actually
  releases the 24 MB above.
- **`@typescript-eslint/types` (144 KB)** — 168 self-mapped strings behind a
  144 KB package. `AST_NODE_TYPES` is now inlined in `src/ast-node-types.ts`
  (12 KB), cast to the upstream enum type so the _exported type is unchanged_:
  a plain `as const` object would break consumers, because TypeScript rejects
  a string literal where a string-enum member is expected.
  `src/ast-node-types.test.ts` compares the table to the real enum in both
  directions, so an upstream addition or rename fails the build instead of
  silently shipping a node type our rules can never match.
- **`oxc-resolver` (~1.5 MB native binary)** — exactly one plugin
  (`eslint-plugin-import-next`) resolves imports, but all 21 consumers
  downloaded the binary. It is now an optional peer, loaded lazily on first
  use rather than at module load; `eslint-plugin-import-next` declares it
  directly. A missing binary raises `MissingResolverPeerError` with install
  instructions rather than being swallowed into "this import doesn't resolve".

Type-only imports from `@typescript-eslint/utils` remain and cost nothing at
runtime, so the public type surface is unchanged. No exported symbol was
removed or retyped; `turbo build` across all 22 workspace packages, 43/43 test
tasks, and the oxlint-parity benchmark (100%) all pass unchanged, and a
packed plugin lints correctly in a project with no `@typescript-eslint`
scope, no `typescript`, and no `oxc-resolver` installed.

Two further reductions were measured and rejected as bad trades: lazy-loading
the resolver and ARIA subtrees (~8 ms of the 13.6 ms load, but it moves cost
onto `eslint-plugin-import-next`'s per-import hot path), and dropping `tslib`
via `importHelpers: false` (+8 KB of emitted JS to shed a peer every plugin
declares anyway).

**Every package also stops shipping dead bytes** — 1.5 MB across the
ecosystem, 5539.4 kB → 3761 kB unpacked (−32.1%), with no consumer-visible
change. `scripts/build-package.ts` owns all four exclusions:

- **Source maps** (322 kB, 93 files). `tsconfig.base.json` sets
  `sourceMap: true` and only eslint-devkit opted out. Every published map was
  dead on arrival: `.npmignore` strips `*.ts`, so each pointed at a source
  file absent from the tarball. They are now deleted outright rather than
  filtered at pack time — a map is only useful beside the source it maps to,
  and the comment-strip pass below rewrites the `.js` anyway, so a retained
  map would be stale as well as unpublishable.
- **`AGENTS.md`** (48 kB, 12 packages). Contributor docs — "context for AI
  coding agents _working on_ \<pkg\>", with monorepo-root install steps and
  `nx` commands this repo no longer uses.
- **JSDoc in emitted `.js`** (571 kB, 17% of all shipped JavaScript). Nobody
  reads comments in `node_modules/**/dist/*.js`; the `.d.ts` comments, which
  editors _do_ surface on hover, are untouched. `removeComments` can't just be
  switched on — it strips `.d.ts` docs too (devkit's declarations drop
  98 kB → 31 kB and every hover doc vanishes), and a second in-place pass is
  rejected on composite projects and clobbers the good `.d.ts`. So the build
  re-emits to a scratch dir and copies back only the `.js`. Same compiler,
  same input, output identical apart from comments. Costs ~1.5 s per package
  on a cold build (turbo caches it) and does **not** change load time — V8
  skips comments cheaply (measured 16.15 → 16.01 ms); this is a size win only. Per-file MIT headers go
  with the comments; `LICENSE` still ships at every package root.

- **Generated declarations for the plugins** (595 kB). A plugin is consumed by
  ESLint at runtime, not imported as a typed library, but tsc still inlined
  every inferred rule-option type into the entry declaration —
  `eslint-plugin-import-next` shipped a 166 kB `index.d.ts`. They can't just
  be deleted: a TypeScript flat config does
  `import plugin from 'eslint-plugin-foo'`, which is TS7016 with no
  declaration (verified). So the entry declarations are replaced by a ~350-byte
  hand-written one typing the plugin object shape — all a config file touches.
  `src/types/**` is preserved verbatim, because 14 plugins expose it as a
  public `./types` subpath that consumers really do import. Only
  `eslint-plugin-*` is pruned; `@interlace/eslint-devkit` is a real library
  whose declarations are the product.

`scripts/check-published-artifacts.ts` (new, wired into `pre-push`,
`npm run quality`, and the release workflow's pre-publish stage) fails the
build if any of these comes back, and also locks the discoverability metadata
npm search and quality scorers read. It runs on the exact artifact the release
job publishes — locally, any `tsc --build` over the solution (e.g.
`npm run typecheck`) re-emits into `dist/` and undoes the post-processing; a
rebuild restores it, and the gate catches it either way.

`scripts/check-artifact-size.ts` (new) reports per-package size against a
committed baseline (`.agent/artifact-size-baseline.json`). It is **advisory —
it never blocks**, because bundles legitimately grow and a hard cap would just
get raised until it meant nothing. The point is that growth becomes a noticed
decision rather than a surprise found later on npm. `--update` refreshes the
baseline; `--strict` exits non-zero for a deliberate audit.

Every before/after pair above was measured on the SAME codebase — `origin/main`
at 8172db04 built in one worktree, this branch in another — min-of-10 warm runs
on Node 24. Earlier figures in this changeset came from a stale branch and were
restated on 2026-08-03.

**Migration.** With npm 7+ these are auto-installed as peers where a real
dependency exists, so most consumers need no change. If you use a strict
package manager (pnpm without hoisting, or `--legacy-peer-deps`) and hit a
missing module, install it explicitly:

- type-aware rules → `typescript`
- `eslint-plugin-import-next` → `oxc-resolver` (now declared for you)

Marked `major` because it changes the install contract, not the API.
