---
slug: our-code-owns-the-tree
opened: 2026-11-03
packages:
  - eslint-devkit
  - eslint-plugin-secure-coding
  - eslint-plugin-import-next
  - eslint-plugin-express-security
  - eslint-plugin-lambda-security
  - eslint-plugin-mcp-sdk-security
  - eslint-plugin-supabase-security
cases: []
---

# Intent — what a consumer installs is our code, ESLint and oxlint

> Stage 1 artifact. It was opened after the supply-chain floor stayed red on
> `minimatch`/`glob`. Tracing it showed how much of that tree arrives through
> packages we chose and could own.

**Status:** draft · **Opened:** 2026-11-03 · **Owner:** @ofri-peretz

---

## What is wanted

Installing any `eslint-plugin-*` or `oxlint-plugin-*` from this repo brings in
only these:

1. `@interlace/*` and sibling packages from this repo.
2. The host linter: `eslint` (and what `eslint` itself ships) or `oxlint`.
3. A short, named allowlist of exceptions. Each one carries a reason and an exit
   condition, and a lock test enforces the list.

The same holds for published **types**: no `.d.ts` we ship names a package
outside that set.

Inside the repo, the same rule applies to dev tooling. We keep only **core
technology**: the host linters and their parsers, the TypeScript toolchain,
Vitest (our only test runner), the build and release tooling, the docs
framework, and real algorithms that would be projects of their own. Everything
else that a short module can replace moves into this repo or onto the Node
standard library. A ledger that the build enforces records each dependency
that stays, and why it stays.

## Why now

We are already most of the way there. The work left is small and countable
(measured 2026-11-03 on `main`):

| surface                                                           | what still leaks                                                                                            |                       count |
| :---------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------- | --------------------------: |
| runtime `dependencies` of the 32 eslint plugins                   | only `@interlace/eslint-devkit`                                                                             | 0 third-party, except below |
| third-party runtime deps                                          | `refa`, `scslre`, `@eslint-community/regexpp` (secure-coding, 1 file); `oxc-resolver` (import-next, 1 file) |                           4 |
| `@typescript-eslint/*` runtime `require`                          | `fallbackParser()` in `devkit/src/rule-creation/value-follow.ts` loads `@typescript-eslint/parser` from cwd |                           1 |
| `@typescript-eslint/*` peer deps                                  | devkit `peerDependencies['@typescript-eslint/utils']` (optional)                                            |                           1 |
| published `.d.ts` naming `@typescript-eslint/utils`               | devkit 32 files, secure-coding 2                                                                            |                          34 |
| source imports (all `import type`)                                | `TSESTree`, `TSESLint`, `ParserServices`, `JSONSchema4`                                                     |                    37 files |
| test files importing `@typescript-eslint/parser` or `rule-tester` |                                                                                                             |                       1,027 |
| root `devDependencies`                                            | includes `typescript-eslint`, jest, ts-jest, glob, Stryker, and the competitor plugins we benchmark         |                         106 |

`RuleCreator`/`ESLintUtils` and `AST_NODE_TYPES` are already our own
(`rule-creator.ts`, `ast-node-types.ts`). The pattern works; this finishes it.

The supply-chain reason: `@typescript-eslint/typescript-estree` brings in
`minimatch` 9/10. `jest` and `ts-jest` bring in `glob` 10/13. Neither does
anything for our consumers.

## Affected users and systems

- **Consumers:** the install tree and published types of every plugin. No rule
  behaviour changes.
- **`@interlace/eslint-devkit`:** gains its own AST and rule types, and loses a
  peer dependency.
- **Tests:** the 1,027 files using typescript-eslint's `RuleTester` and parser.
- **CI:** a new lock test (`runtime-deps.lock`) and a shrinking root
  `devDependencies`.

## Constraints

- **Rule behaviour is frozen:**
  - every existing valid and invalid case passes unchanged
  - precision, mutation and computed-key baselines do not regress
- **Consumers keep choosing their parser.** Rules must still run under
  `@typescript-eslint/parser`, espree, hermes and oxlint's JS plugin host. We
  stop _depending_ on typescript-eslint; we do not stop _supporting_ it.
- **Type compatibility:** a consumer who passes our rule objects to
  `typescript-eslint`'s `config()` or `tseslint.configs` still type-checks.
- **No new dependency** is added to replace one we remove.
- **Each step ships on its own**, as a green PR. No long-lived branch.

## Success criteria

1. `node scripts/check-runtime-deps.ts` lists, for each published package, its
   installed tree minus the allowlist, and every list is empty.
   `runtime-deps.lock.test.ts` fails when a new entry appears.
2. `grep -rl '@typescript-eslint' packages/*/dist --include='*.d.ts' --include='*.js' | wc -l`
   prints `0`.
3. `node -p "require('./packages/eslint-devkit/package.json').peerDependencies"`
   no longer names `@typescript-eslint/utils`.
4. `git grep -l "@typescript-eslint/rule-tester" | wc -l` prints `0`.
5. The root `package.json` `devDependencies` no longer contains `glob`,
   `jest`, `ts-jest` or `@stryker-mutator/*`.
6. The supply-chain floor passes with no `minimatch`/`glob` exception that
   comes from our own choices.

## Open questions

- Does the `fallbackParser` path ever fire in the wild, or only under espree?
  It decides how `value-follow` parses a sibling module when the consumer's
  parser has no `parseForESLint`. espree has none, so plain-JS projects take
  this path today.
- Is `oxc-resolver` "oxlint" for the purposes of this intent? It is the same
  project, but a native binary.
- Are `refa` and `scslre` (ReDoS analysis) worth owning? They are real
  algorithms, not glue code.
- Which TypeScript parser should tests use once the typescript-eslint parser
  is not a dependency?
