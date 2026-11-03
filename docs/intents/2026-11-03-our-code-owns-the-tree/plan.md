# Plan — our code owns the tree

Intent: [`intent.md`](./intent.md). **Status:** draft.

The plan has six phases, and each one is a separate PR that can be merged on its
own. They are ordered by value to consumers per line changed. Phases 1–3 change
what consumers install; phases 4–6 are internal hygiene.

Each step names the command whose output shows it is done.

---

## Phase 0: the gate first

Build the instrument before cutting anything, so every later phase moves a
number instead of making a claim.

**0.1 `scripts/check-runtime-deps.ts`**

- For each publishable package, read `dependencies`, `peerDependencies` and
  `optionalDependencies`.
- Walk `node_modules` with `--omit=dev` semantics.
- Print every package outside the allowlist.

The allowlist is `.agent/runtime-deps-allowlist.json`. Each entry is
`{ name, reason, exit }`. It starts as today's state, so the first run passes,
and it may only shrink.

```bash
npx tsx scripts/check-runtime-deps.ts --json | jq '[.[] | .outside] | add | length'
# → today's count; each later phase lowers it
```

**0.2 `scripts/__tests__/runtime-deps.lock.test.ts`**

The lock test fails when:

- a package is outside the allowlist,
- an allowlist entry has no `reason` or `exit`, or
- the allowlist grew compared with `origin/main`.

Add a published-types probe to the same test: no file in `dist/**/*.d.ts` or
`dist/**/*.js` may contain `@typescript-eslint`. Start it as a baseline count
(today 34 `.d.ts` files and 1 `.js` file) and require that it only goes down.

```bash
npx vitest run --config vitest.root.config.ts scripts/__tests__/runtime-deps.lock.test.ts
```

## Phase 1: devkit owns its AST and rule types

The largest gap consumers see is that 34 published `.d.ts` files reference
`@typescript-eslint/utils`, and devkit declares that package as a peer
dependency.

**1.1 Vendor the types.**

- Add `packages/eslint-devkit/src/types/estree/`, a generated, type-only
  snapshot of `TSESTree`, `TSESLint` (`RuleContext`, `RuleModule`,
  `RuleListener`, `SourceCode`, `Scope`, `ReportDescriptor`, `RuleFixer`),
  `ParserServices` and `JSONSchema4`.
- `scripts/vendor-estree-types.ts` produces the snapshot from the pinned
  `@typescript-eslint/types` devDependency. Keep the MIT header.
- A drift check fails when the snapshot and the pin disagree, so a parser
  upgrade still reaches us. It is just no longer a dependency.

```bash
npx tsx scripts/vendor-estree-types.ts --check   # exit 0 = snapshot matches pin
```

**1.2 Re-point the imports.**

- The 37 `import type … from '@typescript-eslint/utils'` sites in source (32 in
  devkit and 5 in plugins) change to `@interlace/eslint-devkit` or the local
  path. This is a mechanical codemod.
- `JSONSchema4` in the express and lambda plugins moves the same way.

```bash
git grep -l "from '@typescript-eslint/utils" -- 'packages/*/src/**' ':!**/*.test.ts' ':!**/*.spec.ts' | wc -l   # → 0
```

**1.3 Type-compatibility proof.**

- Add a `.test-d.ts` that assigns one rule from each plugin to
  `TSESLint.RuleModule` from the real `@typescript-eslint/utils`, and passes a
  plugin config to `tseslint.config()`.
- This is the constraint "consumers using typescript-eslint still type-check",
  turned into a test.

```bash
npx tsc -p packages/eslint-devkit/tsconfig.typecheck.json --noEmit
```

**1.4 Drop the peer dependency.**

Remove `@typescript-eslint/utils` from devkit's `peerDependencies` and
`peerDependenciesMeta`, and remove `typescript-eslint` from its keywords.
Add a changeset (minor).

```bash
grep -rl '@typescript-eslint' packages/*/dist --include='*.d.ts' | wc -l   # → 0 after build
node -p "Object.keys(require('./packages/eslint-devkit/package.json').peerDependencies)"
```

## Phase 2: no runtime `require` of typescript-eslint

**2.1 `value-follow.ts` `fallbackParser()`**

- Today, when the consumer's parser has no `parseForESLint` (espree, the
  default), devkit `require`s `@typescript-eslint/parser` from the consumer's
  cwd. That means it uses it whenever it happens to be installed and silently
  skips it otherwise.
- The replacement: parse with ESLint's own `espree` and `eslint-scope`,
  resolved via `createRequire(require.resolve('eslint'))`. Both are already in
  every consumer's tree because ESLint ships them.
- For `.ts` sibling files, keep using the consumer's configured parser, which
  is the first candidate today.
- Before cutting it, add a test that pins the espree path: a JS project with
  no typescript-eslint installed still follows `module.exports` across files.

```bash
grep -c '@typescript-eslint/parser' packages/eslint-devkit/dist/src/rule-creation/value-follow.js   # → 0
npx vitest run packages/eslint-devkit/src/rule-creation/value-follow   # new espree case green
```

**2.2 The error string in `type-utils.ts` `getParserServices`**

The message names `@typescript-eslint/parser`. That is guidance text, not a
dependency, so keep it. The phase 0 probe excludes string literals in
diagnostics. That one exception is written into the probe's allowlist with a
reason.

## Phase 3: third-party runtime dependencies

These are the four entries in the allowlist. Each one gets a decision, not a
default rewrite.

| dep                         | used in                                   | proposal                                                                                                                               | proof                                                                             |
| :-------------------------- | :---------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------- |
| `@eslint-community/regexpp` | secure-coding, 1 file                     | **Allow**: ESLint itself depends on it, so it is "what ESLint ships". Resolve it through `eslint` and drop it from our `dependencies`. | `npm ls @eslint-community/regexpp --omit=dev` shows a single copy, under `eslint` |
| `refa`, `scslre`            | secure-coding, 1 file (ReDoS)             | **Allow, time-boxed**: real automata algorithms. Revisit only if our ReDoS rule needs behaviour they don't give.                       | Allowlist entries carry `exit: "own ReDoS engine if rule needs diverge"`          |
| `oxc-resolver`              | import-next, 1 file; devkit optional peer | **Allow**: the oxc project, the same family as oxlint.                                                                                 | Allowlist entry                                                                   |

Phase 3 removes 1 of the 4 dependencies. The remaining 3 stay, named and
reasoned.

## Phase 4: tests run on ESLint's own `RuleTester`

There are 1,027 test files. This is a mechanical change, but a large one, so it
goes in batches by plugin, one PR per batch of about 5 plugins.

**4.1 Inventory the RuleTester features in use.** typescript-eslint's
`RuleTester` adds three things ESLint's does not have:

- `dependencyConstraints`,
- automatic `afterAll`/`describe`/`it` wiring, and
- typed `RunTests`.

Count each one before choosing the shim:

```bash
git grep -l "dependencyConstraints" -- 'packages/**/*.test.ts' | wc -l
git grep -l "RuleTester.afterAll\|RuleTester.describe\|RuleTester.it " -- 'packages/**' | wc -l
```

**4.2 Add a devkit `RuleTester`.**

- A thin subclass of `eslint`'s `RuleTester` that adds the wiring found in 4.1,
  exported from `@interlace/eslint-devkit/testing`.
- It stays in devkit's `devDependencies` scope only if it imports test-only
  code.

**4.3 Codemod by plugin.**

- Change the import in each file.
- Run that plugin's suite.
- Check that the case counts are unchanged.

```bash
npx vitest run packages/<plugin> --reporter=json | jq '.numTotalTests'   # equal before/after
git grep -l "@typescript-eslint/rule-tester" | wc -l                     # → 0 at the end
```

**4.4 The TypeScript parser in tests.** This one stays.

- ESLint ships no TypeScript parser, and our TS cases need one.
- Keep `@typescript-eslint/parser` as a **devDependency only**: never
  published, and named in a short `dev-allowlist`.
- See the open decisions below for the oxc-parser alternative.

## Phase 5: root dev tooling

| step | change                                                                                                                                                                                                                                                                                                                                                                        | proof                                                                              |
| :--- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------- |
| 5.1  | 11 `glob` imports → `node:fs` `globSync` / `fs.promises.glob` (Node 24); remove `glob`                                                                                                                                                                                                                                                                                        | `git grep -l "from 'glob'" \| wc -l` → 0                                           |
| 5.2  | **Done in this PR.** Vitest is the only test runner. `jest`, `ts-jest`, `@types/jest`, `jest-environment-node` and `jest-util` had no importer, no config and no script. (`ilb-arena/configs/jest.config.js` configures the competitor `eslint-plugin-jest`; it does not run Jest.) Removed 227 lock entries, the vulnerable `glob` 10/13 with them, and changed no versions. | `npm ls jest ts-jest` → `(empty)`; `npm ls glob` → only `glob@14.0.3`              |
| 5.3  | Stryker out, after the oxmutate switch (already planned)                                                                                                                                                                                                                                                                                                                      | `npm ls @stryker-mutator/core` → empty                                             |
| 5.4  | Competitor plugins (`sonarjs`, `security-node`, `no-unsanitized`, `@microsoft/eslint-plugin-sdl`, …) move into `benchmarks/package.json`, which only the benchmark jobs install                                                                                                                                                                                               | root `devDependencies` count falls from 106; the benchmark workflow is still green |

## Phase 5b: the dependency ledger

The rule: **we depend only on core technology. Anything else that a short
module in our repo can replace, we own.** "Core" means one of these:

- the host linters and their parsers,
- the language toolchain,
- the build and test runners,
- the release tooling,
- the docs framework,
- or a real algorithm (a parser, an automata engine) where writing our own
  would be a project of its own.

These counts come from a single pass over 7,224 tracked source files on
2026-11-04. "imports" means top-level `import`/`require` lines; code strings
inside rule test cases are excluded.

### Core: keep

| group                        | packages                                                                                                                                                                                                                                                                                                    |
| :--------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| host linters and parsers     | `eslint`, `@eslint/js`, `@eslint/compat`, `oxlint`, `espree`, `@eslint-community/regexpp` (both ship with ESLint), `hermes-eslint` and `jsonc-eslint-parser` (parser-compat tests), `@typescript-eslint/parser` (**dev only**, see phase 4.4)                                                               |
| language                     | `typescript`, `@typescript/native-preview`, `@types/node`                                                                                                                                                                                                                                                   |
| build / test / release       | `vitest`, `@vitest/coverage-v8`, `turbo`, `esbuild`, `@changesets/cli` (and `@changesets/parse`, which it already ships), `@evilmartians/lefthook`, `@commitlint/*`, `prettier`, `markdownlint-cli2`, `verdaccio` (publish rehearsal)                                                                       |
| docs site (`apps/docs` only) | `next`, `react`, `react-dom`, `fumadocs-*`, `tailwindcss`, `@tailwindcss/postcss`, `shiki`, `mermaid`, `@playwright/test`, `axe-core`                                                                                                                                                                       |
| real algorithms              | `refa`, `scslre` (ReDoS, secure-coding runtime), `recheck` (ReDoS oracle in tests), `oxc-resolver` (module resolution, the oxc family), `yaml` (a YAML parser)                                                                                                                                              |
| subjects of our rules        | the frameworks the rules lint, such as `express`, `pg`, `jsonwebtoken`, `@nestjs/*`, ORMs and AI SDKs. They are real when a test or peer-range check installs them. **Each needs a check** (5b.4) that it is imported by a type-aware test or the peer-support matrix, not only named inside a test string. |

### Replace with our own code or the standard library

| package                                              | used by                                                      | replacement                                                                        | proof                                                       |
| :--------------------------------------------------- | :----------------------------------------------------------- | :--------------------------------------------------------------------------------- | :---------------------------------------------------------- |
| `glob`                                               | 11 files (`apps/docs` tests, 4 scripts, 1 benchmark)         | `node:fs` `globSync` / `fs.promises.glob` (Node 24)                                | `git grep -l "from 'glob'" \| wc -l` → 0                    |
| `fs-extra` (+`@types/fs-extra`)                      | benchmarks rule-corpus (2), `tools/cwe-analytics-engine` (1) | `node:fs` (`cp`, `mkdir {recursive}`, `rm {force}`)                                | `git grep -l "from 'fs-extra'"` → only corpus text          |
| `dotenv`                                             | 1 benchmark file                                             | `process.loadEnvFile()` / `node --env-file`                                        | grep → 0                                                    |
| `js-yaml`                                            | `scripts/lint-workflows.ts` and 1 test                       | `yaml`, which we already keep. One YAML parser, not two.                           | `npm ls js-yaml` → not a direct dep                         |
| `unified`, `remark-parse`, `remark-gfm`              | `scripts/validate-doc-tables.ts`, plus 1 docs file           | ~40-line GFM pipe-table reader in `scripts/lib/`                                   | the script's test still catches a malformed table           |
| `acorn`                                              | `scripts/check-stale-build-artifacts.ts`                     | `espree`, which ships with ESLint                                                  | grep → 0                                                    |
| `fast-check`                                         | 1 test                                                       | a seeded generator loop in the test                                                | grep → 0                                                    |
| `semver`                                             | 3 files                                                      | `scripts/lib/semver.ts` covering only the operations we use (compare, caret/tilde) | grep → 0                                                    |
| `clsx`, `tailwind-merge`, `class-variance-authority` | `@interlace/ui`                                              | one `cn()` and one `variants()` helper in `packages/ui/src/lib/`                   | `npm ls clsx cva tailwind-merge` from `packages/ui` → empty |
| `@types/jest`, `jest*`, `ts-jest`                    | nothing                                                      | deleted (**done**)                                                                 | see 5.2                                                     |

### Declared but never imported: verify, then delete

`ts-node`, `@swc-node/register`, `@swc/core`, `@swc/helpers`, `tslib`, `jiti`,
`get-tsconfig`, `enhanced-resolve`, `baseline-browser-mapping`,
`gpt-tokenizer` (devkit), `@aws-sdk/client-lambda`, `reflect-metadata`.

None has a top-level import. Each is named only in a `package.json`. For each
one:

1. Remove it.
2. Run `npm run build && npm test`.
3. Keep it removed if both stay green. If something breaks, keep the package
   and add a one-line comment in the ledger saying who needs it.

The root `dependencies` block (`fumadocs-*`, `recharts`, `axios`, `date-fns`,
`@tanstack/react-query`, …) duplicates what `apps/docs` declares. Some of those
names, such as `axios`, `lodash` and `date-fns`, appear only as text inside the
corpora we lint, which are never executed. **Move the root block to the
workspace that imports each package, or delete it.**

```bash
node -p "Object.keys(require('./package.json').dependencies||{}).length"   # → 0
```

### 5b.4 The ledger becomes a lock

Extend `runtime-deps.lock.test.ts`: every name in any `package.json` must
appear in `.agent/dependency-ledger.json` with `kind: core | subject | owned-soon`
and a `reason`. A new dependency without a ledger line fails the build. This is
the same shape as the mutation baseline: `owned-soon` entries may only leave.

## Phase 6: close the loop

- Delete the allowlist entries that phases 1–5 emptied.
- Turn the `.d.ts`/`.js` probe from a baseline into a hard `0`.
- Update the supply-chain floor's exceptions so the only `minimatch` left is
  the one ESLint itself brings, with ESLint's upgrade as the exit.

```bash
npx tsx scripts/check-runtime-deps.ts   # prints nothing outside the allowlist
npm run check:supply-chain              # green, with no exception owned by us
```

---

## Rejected alternatives

- **Write our own TypeScript parser or `typescript-estree`.** It is a
  multi-year project that tracks every TypeScript release. Consumers choose
  their parser anyway, so it would remove nothing from _their_ tree.
- **Hand-write the AST types.** `TSESTree` has about 170 node types. A
  hand-written copy drifts quietly. A generated snapshot with a `--check` drift
  gate gives the same independence and stays correct.
- **Bundle the dependencies (esbuild/rollup) into dist.** That hides the
  dependency without removing it. Audits stop seeing it, which is worse.

## Out of scope

- Rule behaviour changes of any kind.
- `minimatch` under `eslint` itself.
- The docs app's (`apps/docs`) dependency tree.

## Open decisions (with the default I'd take)

1. **AST types: generated snapshot or hand-written?** Default: **generated
   snapshot** plus a drift check (phase 1.1).
2. **`fallbackParser` replacement.** Default: **ESLint's own espree and
   eslint-scope**, resolved through `eslint`. The alternative is to drop the
   fallback and not follow modules under espree, which would be a behaviour
   change and a possible FN regression.
3. **Do `oxc-resolver` and `@eslint-community/regexpp` count as "oxlint/ESLint"?**
   Default: **yes for both**.
4. **`refa`/`scslre`.** Default: **keep, allowlisted**. Owning a ReDoS engine is
   not this intent.
5. **Test-time TypeScript parser.** Default: **`@typescript-eslint/parser` as a
   devDependency only**. `oxc-parser` is the in-family alternative, but it has
   no `scopeManager`, so TS cases would lose scope analysis. Revisit only if
   oxc ships one.
6. **Phase 4 at all?** `RuleTester` is dev-only, so it never reaches consumers.
   Default: **do it, last**, after phases 0–3 and 5 have landed. It is the
   largest diff for the smallest consumer-facing gain.
