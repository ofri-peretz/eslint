# eslint-plugin-import-next

All notable changes to `eslint-plugin-import-next` are documented here.

Entries below `## <version>` are generated from [changesets](https://github.com/changesets/changesets);
the format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [SemVer](https://semver.org/spec/v2.0.0.html).

## 2.8.9

### Patch Changes

- **🐛 Fix** — `no-unused-modules` and `unambiguous` recognise TypeScript `export =`.

  A `.cts` file whose only export is `export = { … }` was reported by
  `no-unused-modules` as "Module has no exports", and by `unambiguous` as a file
  that could be parsed as a script. `export =` compiles to `module.exports =`,
  which `no-unused-modules` already counts, and it is a syntax error in a script.
  Both rules now treat `TSExportAssignment` as module/export syntax.

- **🐛 Fix** — implement the overlap half of no-redos-vulnerable-regex, and stop a config pair from erasing no-cycle findings

  `no-redos-vulnerable-regex` documented "Identical — **or overlapping** —
  alternatives" but only ever implemented the identical half, by matching the
  source text. It now decides on the parsed pattern: for `(A|B)+` where the
  branches are single character classes, it intersects their character sets with
  `refa`, so `(\w|\d)+` (1,927 ms, `\d ⊆ \w`) and a six-way `\p{...}` alternation
  (9,395 ms) are reported, while disjoint branches such as `(a|b)+` and
  `(?:\p{Nd}|\p{Lu})+` stay silent. It declines rather than guesses on anything
  it cannot decide.

  `import-next`'s `strict` and `typescript` configs ran `no-cycle` at `error`
  alongside `consistent-type-specifier-style` at its `prefer-inline` default,
  whose autofix rewrites the import spelling `no-cycle` reports into the one it
  treats as erased — so `--fix` could silence a detected cycle. Both configs now
  pin `prefer-top-level`, locked by a test.

## 2.8.8

### Patch Changes

- **🐛 Fix** — extensions stops breaking ESM builds, and no-cycle stops reporting inline type-only edges.

  `extensions` no longer strips an extension the module resolver proves is
  load-bearing. Under `moduleResolution: NodeNext` its `--fix` turned a clean
  `tsc` into 207 `TS2835` errors and `ERR_MODULE_NOT_FOUND` at runtime. The rule
  now resolves both spellings and withholds report and fix unless they name the
  same file; an extension that is pure decoration is still reported and fixed.

  `extensions` also now honours the options it declares. Its `defaultOptions`
  (`svg`/`png`/`jpg` set to `always`) never reached the rule, because `create`
  did not declare the merged-options parameter the devkit passes — so a stale
  local fallback map won and `./logo.svg` was stripped with no configuration at
  all. Relatedly, `{ default: 'always' }` was a no-op: `pattern` was taken as a
  whole object, so a user who set only `default` got the built-in map. Precedence
  is now user `pattern` → user `default` → declared `pattern` → declared
  `default`.

  `no-cycle` no longer reports a cycle through an inline type-only import. The
  dependency graph's type-edge test matched only top-level `import type`, so
  `import { type Foo } from './a'` kept its edge while the rule's own report site
  correctly treated it as erased — the same edge got two verdicts depending on
  which file you linted. An import with any value binding still keeps its edge.
  With the rule's `verbatimModuleSyntax` option set, the graph now keeps the
  inline edge too (the devkit records it as `inlineTypeOnly` and its graph walkers
  take the same flag), so that option reports the cycle from both ends instead of
  being overruled by a graph that had already erased the edge.

- **🔗 Dependencies** — updated workspace dependencies: `@interlace/eslint-devkit@1.19.7`

## 2.8.7

### Patch Changes

- **🐛 Fix** — `no-internal-modules` rewrote relative deep imports to the importing file's own directory

  For any `./a/b…` specifier the fixer wrote `'.'` — not the target's owner, but the directory of the file doing the importing. On a real file:

  ```ts
  import { Command } from './commander/command.js';
  import { Option } from './commander/option.js';
  export { Help } from './commander/help.js';
  ```

  `eslint --fix` collapsed three distinct modules to one specifier:

  ```ts
  import { Command } from '.';
  import { Option } from '.';
  export { Help } from '.';
  ```

  `'.'` resolves to `src/index.ts`, which exports none of those names, so the file no longer compiles — and under `"type": "module"` with NodeNext it does not resolve at all (`ERR_UNSUPPORTED_DIR_IMPORT`), because ESM has no directory-index resolution for relative specifiers. Zero reports remained afterwards, so the breakage was silent. The `suggest` strategy offered the same edit.

  The rule was already computing the right answer and discarding it: for the identical violation, `strategy: 'error'` reported `Import from "./commander"`. Both fixing strategies now write that computed path for `./`-rooted specifiers.

  `suggestedPath` rather than the immediate barrel, deliberately: `suggestedPath` sits exactly at `maxDepth`, so the rewritten specifier no longer reports and `--fix` converges in one pass. The immediate barrel re-reports on the next pass, and successive `--fix` passes would walk it back down to `'.'` — fixing nothing outside a single-pass `RuleTester`. A new `valid` fixture locks that fixpoint property.

  Packages and `../` traversal are untouched: `lodash/get` → `lodash`, `@company/ui/x/Button` → `@company/ui`, `../../a/b` → `../..`.

  **Two pre-existing fixtures encoded the defect and were corrected** — both asserted message/fixer _agreement_, a claim that survives intact; they had simply recorded that agreement at the wrong string, copied from the buggy fixer into a mandatory `output:` field. See the commit message for the detail.

  Where no safe relative rewrite exists, the fixing strategies now report without an edit. At `maxDepth: 0` every `./x` specifier is out of policy, and a forbid-only `./x` violation (within `maxDepth`, so its suggested path is the root) resolves to the root — in both cases the only in-policy spelling is `'.'`, the same own-directory swap. `autofix` leaves the specifier alone and `suggest` offers nothing, the way a `#` subpath import already degrades. The `error` message still names `"."` at `maxDepth: 0`; `maxDepth: 0` is an unsatisfiable policy for relative specifiers, which is a separate question from this fix.

- **🔗 Dependencies** — updated workspace dependencies: `@interlace/eslint-devkit@1.19.6`

## 2.8.6

### Patch Changes

- **🐛 Fix** — the extensions fixer no longer renames the module it is rewriting

  `extensions` ran `path.extname` over the raw specifier, so any final dot read as an extension. `./source.config` and `./schema.v2` were reported and stripped to `./source` and `./schema` — a different module, or none at all — and because the fix is `fixable: 'code'` rather than a suggestion, `--fix` applied it unattended. The strip also ran to a fixed point, so a compound name lost a segment per pass: `./types.d.ts` became `./types.d` and then `./types`, and `./a.min.js` became `./a`. Those two started with a real extension, so no "don't put dots in filenames" rule would have saved them. A token now counts as an extension only when the user's own `pattern` claims it or it is one the rule ships a default for, and a strip that would leave a second extension behind reports without a fix instead of guessing.

  The same fixer built its replacement as a fresh single-quoted string, `'${value}'`, which silently reflowed every double-quoted specifier and produced unparseable output for a path containing an apostrophe. It now rewrites the raw token and keeps the original quote character.

  Separately, the rule declared `defaultOptions` and then read `context.options`, which is the raw user options — `createRule` passes the merged options as `create`'s second argument. Its own defaults were therefore dead, and a hardcoded table inside `create` decided behaviour instead. The two disagreed on exactly svg, png and jpg, in the direction of a build-breaking fix: `import logo from './logo.svg'` was reported and stripped under the shipped `strict` and `typescript` configs. The same bug made a partial `pattern` replace the default table rather than merge into it, so `{ pattern: { vue: 'always' } }` quietly dropped json, css and scss down to `default`.

- **🐛 Fix** — no-internal-modules suggests a path that is actually on the import's path

  `getImportAtDepth` stripped only the first `../` from a specifier before slicing path segments, then re-prefixed a single `'../'`. Every additional `..` stayed in the segment list, where the slice consumed it as though it were a real directory name. At `maxDepth: 1`, `'../../a/b/c.js'` suggested `'../..'` and `'../../../a/b/c.js'` suggested `'../..'` as well — two different imports collapsing onto one answer, and that answer is not on either import's path. The rule states its own invariant on the autofix branch: a message that describes a different edit than the one applied is worse than no message. The full traversal prefix is now captured and re-applied. `maxDepth: 0` returns before this code and is unchanged, so the existing root-collapse behaviour is untouched.

## 2.8.5

### Patch Changes

- **🐛 Fix** — `no-nodejs-modules` — resolve builtins via `builtinModules`, and recognise subpaths.

  fix: `no-nodejs-modules` — resolve builtins through `builtinModules` and recognise
  subpaths. The set was a hand-written 31 of the 72 names in Node 24, with an
  exact-match lookup and no subpath step, so `node:fs/promises` stayed silent
  beside a reported `node:fs`, and `worker_threads` and `diagnostics_channel` were
  missed outright. Two sibling rules in this package already resolve builtins this
  way. `allow` now matches every spelling of one builtin, so `allow: ['fs']`
  covers `node:fs/promises`.

## 2.8.4

### Patch Changes

- **🐛 Fix** — two documented-contract violations found by the burgee FP/FN sweep

  - `node-security/no-arbitrary-file-access` now reports whole-value `process.argv`
    and `process.env` paths. `detect-non-literal-fs-filename`'s docs hand this shape
    here by name ("that is `no-arbitrary-file-access`'s question, not this rule's"),
    and neither rule was reporting it, so a documented handoff landed nowhere.

  - `import-next/no-cycle` gains a `verbatimModuleSyntax` option (default `false`).
    Under that TypeScript flag an inline `import { type Foo }` is emitted as
    `import {} from './foo.js'` rather than erased, so the target module is still
    evaluated and the cycle is real. The rule skipped those edges on the stated
    premise that `verbatimModuleSyntax` projects write statement-level `import type`;
    TS1484's own quick-fix offers the inline form instead.

- **🐛 Fix** — three false positives found by sweeping the plugins over a real corpus

  Each was minimized to a standalone snippet, reproduced mechanically, and then
  argued against by an independent reviewer that saw only the snippet and the
  rule's own docs. Two further candidates were rejected at that gate — one whose
  minimization would not reproduce, and one where the reviewer measured the
  proposed fix at 0 true positives out of 1 report and sent it back as a
  documentation defect instead. Neither is in this release.

  **`detect-object-injection` (secure-coding)** — the fix this rule's own docs
  prescribe drew CVSS 9.8 when it was bound to a name rather than used as an
  expression:

  ```ts
  const assigned = Object.assign(Object.create(null), src);
  assigned[key] = 1; // REPORTED
  ```

  `Object.assign` returns its first argument and never invokes `SetPrototypeOf`,
  so the binding holds the null-prototype target; a `__proto__` key in the source
  lands as an inert own data property. The rule already certified that expression
  as prototype-less when it was the assign _target_, then reported it one
  statement later as the indexed object. Plain `{}` targets, parameter targets and
  the two-step primitive `a[k1][k2] = 1` all still report.

  **`exports-last` (import-next)** — a file whose every statement is an export
  reported its own last-but-one line, telling `export default function a() {}` to
  "move this export to the end of the file" with nothing non-export after it.
  Declaration-exports were being reclassified as non-exports to exempt them from
  being reported, which also made each one a positional wall for the exports
  before it. Upstream `eslint-plugin-import`, which this rule links as its
  documentation, treats a declaration-export as an export unconditionally.

  **`cognitive-complexity` (maintainability)** — a factory whose own body is a
  single `return` was scored at its returned closure's complexity and reported
  alongside it, so one piece of code drew two HIGH findings and the one on the
  factory advised "Extract logic to helpers" about a body that was already
  nothing but a helper. The traversal descended into nested functions, charging
  their points to every enclosing function; since each nested function is already
  visited and reported independently, the descent only inflated ancestors. This
  matches SonarQube RSPEC-3776, which reports a function's own complexity and
  keeps the aggregate in a metrics sink.

## 2.8.3

### Patch Changes

- **🐛 Fix** — `no-barrel-file` was blind to a barrel spelled as imports plus an export clause

  `import { a } from './a'; … export { a, b, c, d };` is the same module graph as four `export … from` lines — the same requested-module edges, the same eager load, the same tree-shaking cost — but it was silent. A sourceless `export { … }` matched neither `isReexport` (which needs a `source`) nor `isLocalExport` (which needs a `declaration`), so it fell through both buckets and the file was classified as having no exports at all, bailing before any threshold was consulted. The rule's own comment above that line describes the intended behaviour as an OR and names `export { x }` explicitly; the code implemented an AND that excluded it.

  Sourceless clauses are now split per specifier: a name bound by an import contributes that import's module to the re-export source set, and a locally declared name counts as a local export. Resolving per specifier rather than per clause is what keeps `const x = 1; export { x, y, z }` silent — the false positive a naive "count the clause" fix would introduce, now pinned by a test. Type-only specifiers are skipped on both sides, since they are erased before any bundler sees them. A mixed file that forwards imports and also exports a local binding now correctly reports `considerDirectExports` rather than being told it adds "no local logic".

- **🐛 Fix** — `no-extraneous-dependencies` published three config options it did not honour

  `ignore` was in the schema and in the generated docs — "Specific package names to ignore (don't report as missing)" — but was never destructured in `create()`, so setting it did nothing at all. It is now an exact-name allowlist, the blunt sibling of `allowPatterns`. Surfaced by the burgee corpus, where seven workspace-root devDependencies are reported as missing and `ignore` is the documented escape hatch a consumer would reach for first.

  `customPackageJsonDetection` was declared on the exported `Options` interface but absent from the schema, which sets `additionalProperties: false`. A consumer typing against the exported interface and setting it got a fatal config error that aborts the entire lint run — the precise breaking direction the options audit exists to prevent. Removed from the type; nothing read it.

  `resolutionStrategy` keeps its behaviour and its enum, but the schema description now states what the values actually do. `workspace` and `monorepo` were byte-identical branches delegating to a predicate that recognises only the literal `@workspace/` and `@company/` scopes — no workspace-root manifest is read, no `workspaces` glob expanded, no sibling package consulted. The description promised "allow workspace packages" and "cross-package resolution" and delivered neither, which is worse than silence because the option accepts the value without error. Removing the enum members would have been a fatal config error for every existing opt-in user, so the honest repair is to describe the limitation and point at `allowPatterns`. Implementing real workspace resolution remains open.

- **🔗 Dependencies** — updated workspace dependencies: `@interlace/eslint-devkit@1.19.5`

## 2.8.2

### Patch Changes

- **🐛 Fix** — `extensions` now checks the specifier of a dynamic `import()`. The rule visited `ImportDeclaration`, `ExportNamedDeclaration` and `ExportAllDeclaration` but not `ImportExpression`, so the identical specifier string was reported on a static import and silent on an `await import(...)` in the same file — leaving the file less consistent after `--fix` than before it, the exact defect the export-from forms were added to remove. A non-literal specifier (template or variable) is still left alone. Surfaces 6 previously-missed findings in the burgee corpus.
- **🐛 Fix** — `consistent-type-specifier-style` no longer emits a `Fix:` instruction that drops `type` from every specifier but the first. The `type` marker sat outside the `{{name}}` interpolation while the data bound a comma-joined list, so an import of more than one name rendered as `import { type A, B }` — following it demotes every later specifier to a value import, which under `verbatimModuleSyntax` is emitted verbatim and throws at runtime. The autofix was already correct; only the emitted guidance disagreed with it.

## 2.8.1

### Patch Changes

- **🐛 Fix** — `extensions` checks `export … from` and `export * from`

  The rule registered only an `ImportDeclaration` visitor, so the same specifier string got
  opposite verdicts one line apart: `import { Argument } from './argument.js'` reported,
  `export { Argument } from './argument.js'` stayed silent. For a rule whose contract is
  "ensure consistent use of file extensions", `--fix` left the file less consistent than it
  found it.

  Both export-from forms now route through the same check. Sibling rules in this package
  (`no-unresolved`, `no-internal-modules`) already treated "imports" as meaning module
  specifiers rather than the `ImportDeclaration` node type.

- **🐛 Fix** — `no-unused-modules`'s `allowImportOnly` exempts only modules that import

  The option is documented — in its schema, its JSDoc, and the generated docs — as "Allow
  modules that only contain imports", but the implementation read it as a plain
  `if (!hasExports && !allowImportOnly)`. Every export-less module was exempted, imports or
  not, which made the option a rule-level off switch rather than the narrow exemption its
  name and description promise.

  Imports are now tracked, so the exemption needs one. A module with no imports at all does
  not "only contain imports" under any reading, and still reports.

- **🐛 Fix** — `consistent-type-specifier-style` stops rebuilding away parts of the import

  Two losses from the same whole-statement rebuild.

  A string-literal imported name was read through `imported.value`, which drops the quotes:
  `import type { 'a-b' as AB }` was rewritten to `import { type a-b as AB }`, output that no
  longer parses. The specifier's own source text is read instead.

  An import attribute is not a specifier, so rebuilding from `namedSpecifiers` deleted it —
  `with { type: 'json' }` silently gone, which is `TS1543` at compile time and
  `ERR_IMPORT_ATTRIBUTE_MISSING` at runtime. The preference still reports; only the rewrite
  stops, the same guard the default-binding case already had.

## 2.8.0

### Minor Changes

- **🐛 Fix** — `no-relative-parent-imports` sees a dynamic `import('../x')`

  `import x from '../y'` reported and `require('../y')` reported, but
  `import('../y')` — the same climb out of the directory — was silent. The
  `CallExpression` visitor carried a comment claiming otherwise:

  ```
  // Note: Dynamic imports (import()) are handled by ImportExpression visitor
  ```

  There was no such visitor. Sibling rules `no-relative-packages` and
  `no-absolute-path` both implement one, and upstream `eslint-plugin-import`,
  which this rule's messages link as documentation, registers `ImportExpression`
  through `moduleVisitor` and does report the dynamic form. Nothing in the docs
  scopes the rule to static declarations, and `commonjs` is on by default, so
  "static ESM only" was never the design.

  **This rule now reports where it did not before.** A lazily loaded parent
  module is a finding, at the same message and severity as its static twin.
  Computed specifiers — `import(name)` — stay silent, as they already do for
  `require`.

### Patch Changes

- **🐛 Fix** — `no-extraneous-dependencies` no longer reports `<scheme>:` specifiers as missing packages

  The package name was derived by splitting the specifier on `/` alone, so
  `fumadocs-mdx:collections/server` yielded the "package" `fumadocs-mdx:collections`
  — a name npm's grammar forbids, since `:` is outside `[a-z0-9-._~]`. The rule
  reported it as missing at HIGH and suggested `npm install fumadocs-mdx:collections`,
  a command that cannot succeed, while the package actually backing it
  (`fumadocs-mdx`) was declared all along.

  Specifiers carrying a URI scheme are now skipped, the same as the existing `#`
  and `node:` carve-outs. This covers spec-defined URL specifiers (`data:`,
  `https:`) and build-tool virtual modules (`virtual:`, `astro:`). They are
  skipped rather than prefix-mapped: `virtual:pwa-register` belongs to no package,
  and `astro:content` does not belong to one named `astro`.

## 2.7.8

### Patch Changes

- **🐛 Fix** — `consistent-type-specifier-style` no longer deletes a default import

  Under `prefer-top-level`, `import yargs, { type Argv } from 'yargs'` was fixed
  to `import type { Argv } from 'yargs'` — dropping the default binding and
  leaving `TS2304: Cannot find name 'yargs'` behind a clean lint run.

  The report is gated on the named specifiers alone, all of which are inline
  types, so the preference genuinely applies; the fixer then rebuilt the statement
  from those same named specifiers, and a default binding is not among them.
  Nothing reported afterwards, so `--fix` left a broken file and said nothing.

  The report stays. The rewrite is withheld when the declaration carries a binding
  the rebuild would not carry over. (Upstream emits two statements instead; that
  is the fuller fix and a larger change than this defect needs.)

- **🐛 Fix** — `enforce-import-order`'s fixer no longer moves `@ts-nocheck` below an import

  TypeScript honours `@ts-nocheck`, `@ts-check` and `/// <reference />` only before the first
  statement. The fixer treated them as leading comments of the first import and carried them
  down with it. The result still parses and still lints clean, so nothing surfaces — type
  checking is just silently switched back on, or, for `@ts-check` on a `.js` file, silently
  switched off.

  These directives are now pinned the same way a hashbang already was. Only the directives:
  an explanatory comment written for a specific import still travels with that import.

- **🐛 Fix** — `default` no longer reports default imports of `export =` / CJS-interop modules

  The rule mapped the import specifier to the TypeScript `ImportClause` container, for which
  `getSymbolAtLocation` returns `undefined` unconditionally — so the symbol check never did
  anything and the rule fell back to a `Default`-key lookup that `export =` modules never
  satisfy. It fired on every default import of a CJS-interop or JSON module, `node:process`
  included.

  The symbol is now resolved from the specifier's own identifier and unwrapped through
  `getAliasedSymbol`, matching the sibling `named` rule. Default imports from modules that
  genuinely have no default export still report.

- **🐛 Fix** — `no-internal-modules` keeps parent traversal, and no longer crashes on a template-literal `require`

  The autofix collapsed every relative specifier to `'.'`, so `../content/docs/x` was
  repointed at the current file's own directory index — a different module — with no report
  left behind to show it. The traversal prefix is now preserved (`../..` for `../../a/b`);
  `./a/b/c` still resolves to `'.'` as before.

  The detector accepts a no-substitution template literal via `staticString`, but all three
  fixers narrowed on `Literal` and otherwise reached for `.source`, which is `undefined` on a
  template literal. `fixer.replaceText` then threw and aborted the lint for the entire file —
  at report time, so `--fix` was not even required.

## 2.7.7

### Patch Changes

- **🐛 Fix** — `order` / `enforce-import-order` no longer writes imports over a hashbang

  ESLint models `#!/usr/bin/env node` as a comment, so it came back from `getCommentsBefore` for the first import of an executable script and the autofix replaced from byte 0 — emitting the sorted imports above the hashbang and producing `'#!' can only be used at the start of a file`.

  The file then stops parsing, which silences every other rule on it too, and `--fix` is exactly what people run without reading the diff. A hashbang is not a statement and is now never part of an import's range.

## 2.7.6

### Patch Changes

- **🐛 Fix** — `no-cross-domain-imports` and `enforce-dependency-direction` no longer crash on a non-string dynamic import

  Both rules cast a dynamic import's `Literal` source `as string` and called `.startsWith` on it. `import(42)` and `import(null)` are valid syntax whose Literal value is a number or null, so both rules threw `TypeError: importPath.startsWith is not a function` — an ESLint crash that takes down linting for the whole file, not a lint error on one line.

  Any file reaching either rule with a non-string dynamic import was affected. The `as string` assertion is why the compiler could not see it; both now check the type and skip.

## 2.7.5

### Patch Changes

- **🐛 Fix** — `node:` builtins are never dependencies

  `import process from 'node:process'` was reported as a missing dependency.
  The rule skipped builtins from a hand-written list of 29 names frozen at
  roughly Node 8 — no `process`, `module`, `worker_threads`, `perf_hooks`,
  `async_hooks` or `test` — so the spelling `unicorn/prefer-node-protocol`
  demands was the one this rule rejected.

  A `node:`-prefixed specifier is a builtin by definition and is now skipped
  outright; the bare names come from `builtinModules` in `node:module`, so the
  list is whatever the running Node says it is rather than one that rots.

## 2.7.4

### Patch Changes

- **🐛 Fix** — The README logo now links to the plugin's own documentation.

  Every plugin README opens with the Interlace logo, and it linked to the
  site root — so the most obvious thing to click on the npm page dropped
  the reader on a landing page and left them looking for the plugin they
  were already reading about. Both the header and footer logos now point
  at that plugin's docs page.

  The oxlint and ESLint logos still link to oxc.rs and eslint.org, which
  is where those belong.

  No rule behaviour changes.

## 2.7.3

### Patch Changes

- **🐛 Fix** — `obj['deprecatedProp']` reads the same deprecated export

  `no-deprecated` resolved member reads on `property.name`, so the subscripted
  spelling of a deprecated export was not reported.

- **🔗 Dependencies** — updated workspace dependencies: `@interlace/eslint-devkit@1.19.2`

## 2.7.2

### Patch Changes

- **🐛 Fix** — import gates resolve a subscripted member

  A member spelled `o['k']` reaches exactly what `o.k` reaches, and these gates
  compared `property.name` before asking what the property was. They now resolve
  through the devkit's `propertyName`, which still abstains on the one shape that
  genuinely cannot be resolved: a key chosen at runtime, whose name is not
  statically known.

- **🔗 Dependencies** — updated workspace dependencies: `@interlace/eslint-devkit@1.19.0`

## 2.7.1

### Patch Changes

- **🐛 Fix** — Add an install-size badge to the README prelude, linking to each package's packagephobia page. npm renders the README from the last publish, so a badge only appears on npmjs.com after a release.

  Install size rather than bundle size: bundlephobia measures a browser bundle,
  and nobody bundles an ESLint plugin into one, so the number would describe no
  real cost. It was also returning `429` for every package, `react` included.

- **🔗 Dependencies** — updated workspace dependencies: `@interlace/eslint-devkit@1.18.2`

## 2.7.0

### Minor Changes

- **✨ Feature** — **🐛 Fix** — a template literal is a string, in 82 rules that disagreed

  A rule that matched `require('child_process')` did not match
  ``require(`child_process`)``. A rule that matched `res.headers['x-api-key']`
  did not match ``res.headers[`x-api-key`]``. Nothing about the two spellings
  differs at runtime, and no consumer chose one on purpose — which is exactly
  why the miss was invisible: the rule looked correct in its own tests, because
  its tests were written in the same spelling as its implementation.

  Rules across these plugins now read a static string wherever the value is
  statically known: a plain literal, a template literal with no substitutions,
  and a concatenation of either. The same pass fixed computed member access, so
  `o['foo']` is read wherever `o.foo` was.

  **These rules now report on code they previously stayed quiet on.** That is
  the point — the missed spelling was a false negative, not an exemption — but
  a codebase written with backticks may see new findings on upgrade.

### Patch Changes

- **🐛 Fix** — `no-mutable-exports` resolves bindings instead of grepping the file text

  The `export { x }` path built a regex from the declarator's name and tested it
  against the whole source. That reported on the characters appearing in a
  comment or a string, reported a local `let x` when the file re-exported some
  other module's `x`, reported a function-scoped `let` colliding with an
  exported name, and missed every export it could not spell: a multi-specifier
  list, a rename, and a destructured declarator. It now resolves the specifier
  through the scope chain to the declaration it actually names.

  `no-env-injection` gains `requestRootNames`, which REPLACES the request-root
  list that `extraRequestRoots` could only grow.

- **🔗 Dependencies** — updated workspace dependencies: `@interlace/eslint-devkit@1.18.0`

## 2.6.0

### Minor Changes

- **🐛 Fix** — `no-cycle` no longer reports a cycle whose edge is erased before emit

  A stratified sample of this rule's findings on the pinned corpus (n=24, four
  repos) came back **16 type-only against 8 runtime — two thirds of what it
  reported could not happen.** All sixteen were plain
  `import { SomeInterface } from './x'` where every binding is an
  `export interface` or `export type`. TypeScript erases those, so the bundle
  bloat and initialization hazard this rule's own message describes cannot occur
  through that edge.

  The rule already conceded the principle — it skipped `import type` under the
  comment "erased at compile time — no runtime cycle risk". It could not see an
  _implicitly_ type-only named import, and on real TypeScript that was most of
  what it found.

  **Biased to report.** This rule is `error` in `recommended`, so a missed runtime
  cycle is a shipped initialization bug. Every ambiguity resolves to "runtime":
  declaration merging (`export interface Foo` beside `export const Foo`), a
  re-export, a default or namespace import, or a target that cannot be read.

  Measured against that sample: **8/8 runtime cycles still reported, 16/16
  type-only silenced.**

  ### Compiler settings

  Under `verbatimModuleSyntax`, a plain named import of a type is already a
  compile error, so such projects write `import type` and are unaffected.

  **One exception, stated rather than handled.** With
  `importsNotUsedAsValues: "preserve"` (TypeScript 4.8–5.4) the import statement
  is kept, so the target module _is_ executed and the runtime edge genuinely
  exists — this change will not report it. A lint rule cannot see that setting
  without reading `tsconfig.json`, which this one does not do. The exception is
  narrow and shrinking: the flag is deprecated in TypeScript 5.0 and removed in
  5.5, superseded by `verbatimModuleSyntax`. If you are on `preserve` and rely on
  this rule, pin to the previous minor until you migrate.

### Patch Changes

- **🔗 Dependencies** — updated workspace dependencies: `@interlace/eslint-devkit@1.17.3`

## 2.5.1

### Patch Changes

- **🐛 Fix** — point `meta.docs.url` at documentation that exists ([#683](https://github.com/ofri-peretz/eslint/pull/683))

  `meta.docs.url` is what ESLint hands to editors, CLI output and SARIF, so a wrong
  value is a dead "see docs" link in every consumer's IDE. It was wrong for 319 of
  478 rules, all pointing at `packages/eslint-plugin/` — a package that does not
  exist in this repo.

  `withCanonicalDocsUrls` already existed to fix this, but `docsUrlFor` hardcoded
  the `/docs/security/` path segment, so it could not express the nine quality
  plugins and rollout had stalled at three of twenty-six. The category is now
  derived per plugin, and every documented plugin stamps its rules on export.

- **🔗 Dependencies** — updated workspace dependencies: `@interlace/eslint-devkit@1.17.2`

## 2.5.0

### Minor Changes

- **✨ Feature** — `no-cycle` no longer reports inside generated files. ([#686](https://github.com/ofri-peretz/eslint/pull/686))

  It is the second-largest source of findings on the pinned corpus — 1337 — and
  the triage ledger already recorded what they are: real circular imports,
  concentrated in generated SDK class hierarchies (twilio `Page`/`Version`/
  `AccountsBase`, okta idx remediators). Correct, and unactionable: you do not
  refactor a file your codegen rewrites, and this rule's own remedy — split the
  module — is not available to the consumer.

  This is a narrow opt-out, not a policy. A security rule finding a hardcoded
  secret in a generated file still reports, because that file ships. The line is
  whether the finding is actionable where it is raised.

  `allowGeneratedFiles` is not needed to restore the old behaviour: a project
  that genuinely wants cycles reported in generated output can point the rule at
  those paths, since the opt-out keys on the file's own `@generated` /
  `Code generated by …` banner rather than on a path convention.

## 2.4.0

### Minor Changes

- [#634](https://github.com/ofri-peretz/eslint/pull/634) [`01b02ae`](https://github.com/ofri-peretz/eslint/commit/01b02ae962021acc2e41888c011589bbc53eae74) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - `recommended` no longer enables `order`, `first` or `newline-after-import`.

  All three are pure formatting, fully auto-fixable, and together produced
  **5,071** of this plugin's findings on the pinned 8-repository corpus —
  `order` 3,597, `newline-after-import` 835, `first` 639.

  A consumer who installs a security-positioned ecosystem and is met by four
  thousand import-ordering warnings does not read them and does not keep the
  plugin. The README's own FP/FN section makes the argument: an ignored tool has
  zero recall regardless of what it detects.

  This is parity with upstream rather than a novel opinion.
  `eslint-plugin-import`'s `recommended` is eight rules and excludes all three
  deliberately, and ESLint core deprecated its own formatting rules in 8.53 on
  the same reasoning — formatting belongs to a formatter.

  **Nothing is removed from the plugin.** `import-style` and `strict` already
  carry all three, so opting back in is one config line:

  ```js
  import importNext from 'eslint-plugin-import-next';

  export default [
    importNext.configs.recommended,
    importNext.configs['import-style'], // ← restores order / first / newline-after-import
  ];
  ```

### Patch Changes

- [#611](https://github.com/ofri-peretz/eslint/pull/611) [`d81469f`](https://github.com/ofri-peretz/eslint/commit/d81469fa2921043b44b1f042e23cb9148ae72c04) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - `no-cycle` cites CWE-1047, and CWE-407 gets its real name back.

  `CWE_MAPPING` carried **CWE-407** under the name "Circular Dependencies".
  CWE-407 is **"Inefficient Algorithmic Complexity"** — quadratic blowup, a hash
  table degrading to a list, a regex that backtracks. `import-next/no-cycle` was
  pointed at it on the strength of that name.

  The correct identifier is **CWE-1047, "Modules with Circular Dependencies"**,
  which sits in the Software Development view as a quality weakness. It was
  already referenced by `no-relative-packages` and was **not in the table at
  all**, so that rule silently received no enrichment.

  `no-cycle` also rendered a line that argued with itself:

  ```
  🏗️ CWE-407 OWASP:A06-Insecure CVSS:5.3 | Circular dependency detected | CRITICAL
  ```

  CVSS 5.3 is the MEDIUM band, and `meta.docs.cvss` said 9.5 — the band reserved
  for remote code execution, for a circular import. Now all three agree:

  ```
  🏗️ CWE-1047 OWASP:A06-Insecure CVSS:5.3 | Circular dependency detected | MEDIUM
  ```

  New gate `npm run lint:severity-consistency`. Across the built plugins, 432
  messages render both a CVSS score and a severity label and **165 of them —
  38.2% — disagree**. Which value is right is a per-rule judgment, so the gate
  does not pick: it records the existing set and fails on a new one, or on a
  registry entry whose rule no longer disagrees.

- [#622](https://github.com/ofri-peretz/eslint/pull/622) [`1b836b2`](https://github.com/ofri-peretz/eslint/commit/1b836b2d8222d374898142b5b0bcc053bb64b715) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - `export`: a namespace member is not a module export.

  `export type T` inside `export namespace A` exports `A.T`, not `T`. The rule
  keyed its duplicate-detection maps on the bare name, so Stripe's `.d.ts` files
  reported this as a duplicate:

  ```ts
  export namespace PaymentIntent {
    export type SetupFutureUsage = 'off_session' | 'on_session';
  }
  export namespace PaymentIntentConfirmParams {
    export type SetupFutureUsage = 'off_session' | 'on_session';
  }
  ```

  Two distinct types that share a member name — which is what a namespace is for.
  All 3 findings this rule produced on the pinned corpus were that shape, and the
  corpus now reads 0.

  The key is **prefixed** with the enclosing namespace path rather than the
  declaration being skipped, so a genuine duplicate inside one namespace still
  reports. All three forms of a module id are handled: `namespace A`,
  `namespace A.B`, and `declare module 'x'`.

- [#636](https://github.com/ofri-peretz/eslint/pull/636) [`4466e2e`](https://github.com/ofri-peretz/eslint/commit/4466e2e42e4882b1e2be556b96e454d60ddfd0a6) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - `no-extraneous-dependencies`: `.`, `..` and `#subpath` are not packages.

  Three things were being reported as undeclared dependencies that cannot be
  dependencies at all:

  ```js
  require('..'); // the package root — how a package's own tests import it
  import a from '.'; // likewise
  import a from '#dep'; // a Node subpath import
  ```

  The relative guard tested only the `./` and `../` **prefixes**, so the bare
  forms fell through and were reported as packages literally named `.` and `..`.
  `require('..')` was four of the ten findings on
  auth0/express-openid-connect — the first repository this rule was ever measured
  against, because it had been excluded from the corpus gate on the false premise
  that it needed an installed dependency tree.

  A `#`-prefixed specifier resolves through the package's own `imports` field in
  package.json. It is internal by specification and can never name an external
  dependency.

  The guard requires a `/` or end-of-string after the dots, so a package name
  that legitimately begins with dots still reports — pinned as an invalid fixture.

  Corpus: 3,147 → 3,111. A correctness fix rather than a volume one; the large
  targets have genuinely undeclared imports, and those findings remain
  unadjudicated.

- [#620](https://github.com/ofri-peretz/eslint/pull/620) [`91ad2d3`](https://github.com/ofri-peretz/eslint/commit/91ad2d3fee8d1aace2bf9b9baf7f2fcf6b65c767) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - `no-duplicates`: a type-only import is not a duplicate of a value import.

  The rule grouped imports by module specifier alone, so

  ```ts
  import type { ActiveConfig } from '../project/active-config.js';
  import { selectActiveConfig } from '../project/active-config.js';
  ```

  was reported as a duplicate. It is not. The type-only form is erased at compile
  time, so folding it into the value import creates a runtime dependency that was
  not there — which is what `verbatimModuleSyntax` exists to prevent and what
  tree-shaking relies on. The two declarations are separate on purpose.

  Grouping is now keyed by specifier **and** `importKind`, matching ESLint core's
  `import/no-duplicates`. Two type-only imports from the same module are still
  duplicates of each other and still merge.

  On the pinned 8-repository corpus: **94 → 40 findings**.

- [#618](https://github.com/ofri-peretz/eslint/pull/618) [`3fded2f`](https://github.com/ofri-peretz/eslint/commit/3fded2fba4784db6b41e91907078a4f86b85493d) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - `no-self-import`: a suffix is not an extension.

  The rule stripped the last dotted suffix from both the current filename and the
  resolved specifier, then compared. Those were the only two findings it produced
  on the pinned 8-repository corpus, and both were wrong:

  ```
  main.jsx            importing './main.css'                  → both became `main`
  styleUtils.test.js  importing './styleUtils.test.constants' → both became `styleUtils.test`
  ```

  A stylesheet is not this module, and `.constants` is not an extension at all —
  it is part of the module's name. `\.[^/.]+$` cannot tell the difference.

  Now: a specifier whose last segment carries a dotted suffix that is not a JS/TS
  module extension names a different file, full stop. Otherwise only real module
  extensions (`.js .jsx .mjs .cjs .ts .tsx .mts .cts`) are stripped before
  comparing. Genuine self-imports — `./real` and `./real.ts` from `real.ts` — are
  unaffected, and both are pinned as `invalid` fixtures.

  `allowInTests` also moves to the devkit's `isTestFilePath`. It matched
  `filename.includes('__tests__')`, which is true of any path containing those
  characters anywhere, `~/my__tests__project/src/a.ts` included.

- Updated dependencies [[`3854526`](https://github.com/ofri-peretz/eslint/commit/38545268c6028267787a1cb7c0a7e065babad99c), [`16bae7b`](https://github.com/ofri-peretz/eslint/commit/16bae7ba0451ed19757231be60b8ed88abb35d9e), [`5e0e029`](https://github.com/ofri-peretz/eslint/commit/5e0e029acc7ad5877c915d56bea5f4f707983fe6), [`d81469f`](https://github.com/ofri-peretz/eslint/commit/d81469fa2921043b44b1f042e23cb9148ae72c04), [`a22fd9b`](https://github.com/ofri-peretz/eslint/commit/a22fd9b7755f3988739f9d67a7c209b77836612a), [`6f9124e`](https://github.com/ofri-peretz/eslint/commit/6f9124e5e29a7cf7c5e0dde3127bcf219c1538d7)]:
  - @interlace/eslint-devkit@1.17.0

## 2.3.19

### Patch Changes

- [#593](https://github.com/ofri-peretz/eslint/pull/593) [`0e53fb4`](https://github.com/ofri-peretz/eslint/commit/0e53fb45122faecc1d36fc2d7a3d747eaf2bba2c) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - `export` no longer reports a type and a value that share a name.

  TypeScript has two declaration spaces, and one name may occupy both:

  ```ts
  export type Twilio = ITwilio;
  export const Twilio = ITwilio; // legal, and the point of the pattern
  ```

  The rule kept a single map keyed by name, so every such pair was reported as
  `Multiple exports of name "Twilio"`. On the pinned corpus, twilio-node's
  `src/index.ts` alone produced **758** of them — **778 → 3** across all eight
  repositories.

  Still reported, because these really are conflicts:

  - `type X` twice
  - `type X` beside `interface X`, in either order
  - an `enum X` against either a value or a type — an enum occupies both spaces

  `interface X` twice is declaration **merging** and is now correctly silent.

## 2.3.18

### Patch Changes

- [#499](https://github.com/ofri-peretz/eslint/pull/499) [`47070de`](https://github.com/ofri-peretz/eslint/commit/47070de2ccb391252891c72633191709a9bdd03c) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Bound the TypeScript peer range and declare the React peer

  `maintainability`, `react-features` and `import-next` shipped
  `"typescript": ">=4.8.4"`, which claims support for every future major —
  including ones the repo has already pinned Dependabot away from. The range is
  now the majors actually tested: `^4.8.4 || ^5.0.0 || ^6.0.0`.

  `react-a11y` and `react-features` lint `JSXElement`, `JSXAttribute` and
  `JSXOpeningElement` and named no React peer, so nothing recorded which React
  majors their rules were written against. Both now declare
  `react: ^17 || ^18 || ^19`, optional, so no adopter is forced to install it.

## 2.3.17

### Patch Changes

- [#407](https://github.com/ofri-peretz/eslint/pull/407) [`5ecf4d1`](https://github.com/ofri-peretz/eslint/commit/5ecf4d1baa56135ed2029a4477e9c45d8a921e25) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Correct the declared ESLint floor: `^8.0.0` → `^8.40.0`.

  `context.sourceCode` landed in ESLint 8.40. The shared devkit reads it without a
  fallback and 20 plugins read it directly, so on ESLint 8.0–8.39 the install
  resolved cleanly and then every rule threw
  `Cannot read properties of undefined (reading 'ast')` at lint time — npm reported
  nothing, because the manifest claimed the version was supported.

  Measured on 8.0.0 / 8.39.0 (throw on load) versus 8.40.0 / 8.57.1 / 9.0.0 /
  9.39.2 / 10.8.0 (all produce the expected finding). No runtime behaviour
  changes; this only makes the manifest match what the code can actually run.

- [#423](https://github.com/ofri-peretz/eslint/pull/423) [`4794017`](https://github.com/ofri-peretz/eslint/commit/4794017c3e21db2aa0b0f64af2d1703ebca97211) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Correct the ESLint peer range shown in the README Compatibility table.

  The manifest floor moved to 8.40.0, but every package README still advertised
  `^8.0.0 || ^9.0.0 || ^10.0.0`. The README is what npm renders on the package
  page, so the requirement consumers actually read disagreed with the one npm
  enforced: an install on 8.39.x warns about a peer conflict while the README
  says that version is supported.

  The range was missed by the original sweep because a markdown table escapes
  the union as `\|\|`, so a grep for the plain shape matched none of the 29
  files.

  Also updates `.agent/rules/readme-structure.md` and
  `.agent/compatibility-matrix.md`, which template this table for new packages,
  and adds a README-vs-manifest assertion to
  `scripts/__tests__/eslint-peer-floor.test.ts` so the two cannot drift again.

- [#309](https://github.com/ofri-peretz/eslint/pull/309) [`237a6b0`](https://github.com/ofri-peretz/eslint/commit/237a6b03313e2ea935999ee84b2a6c8af33e50bc) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - `meta.hasSuggestions` now matches what each rule actually emits.

  ILB-Remediation measured 27 rules where the declaration and the implementation
  disagreed: 22 declared `hasSuggestions: true` without ever passing `suggest:`
  to `context.report()` (IDE quick-fix menus advertising remediation that never
  arrives), and 5 emitted `suggest:` without the declaration (latent — ESLint
  throws on that combination as soon as one of those suggestions carries a real
  fixer).

  `eslint-plugin-mongodb-security` gains four real suggestions where the rewrite
  is mechanical:

  - `require-lean-queries` — appends `.lean()`
  - `no-unbounded-find` — appends `.limit(100)`
  - `no-debug-mode-production` — rewrites the flag to `process.env.NODE_ENV !== 'production'`
  - `require-tls-connection` — adds (or flips) `tls: true` in the connection options

  Every other dead declaration was removed rather than faked. A workspace lock
  (`scripts/__tests__/suggestions-meta-lock.test.ts`) now fails CI on either
  direction of the drift.

- Updated dependencies [[`b59e984`](https://github.com/ofri-peretz/eslint/commit/b59e984f8f98dcb59e6bd5d4ef23a75376821d17), [`5ecf4d1`](https://github.com/ofri-peretz/eslint/commit/5ecf4d1baa56135ed2029a4477e9c45d8a921e25), [`4794017`](https://github.com/ofri-peretz/eslint/commit/4794017c3e21db2aa0b0f64af2d1703ebca97211)]:
  - @interlace/eslint-devkit@1.11.0

## 2.3.16

### Patch Changes

- [#411](https://github.com/ofri-peretz/eslint/pull/411) [`d0cc8b6`](https://github.com/ofri-peretz/eslint/commit/d0cc8b647a41c1a85950c87a60296ece0f3abc31) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Ship the JavaScript without tsc's layout.

  Every emitted `.js` is re-written through esbuild's `minifyWhitespace`, which
  removes indentation and line breaks. Across the ecosystem that is 3233 kB ->
  2023 kB of shipped JavaScript, a 37% cut; on disk a package install drops about
  28%. Indentation alone was ~32% of a compiled rule file.

  This is deliberately NOT minification. Identifiers keep their names, string
  contents are untouched, and the syntax tree is not rewritten — rule `meta`
  (messages, schema, docs URLs) stays byte-identical, which is what the docs site
  and `--print-config` read, and a stack trace from inside a rule still names
  the function it came from. Full mangling would have bought another 4 kB gzipped
  and cost both.

  Verified against the published artifact: identical lint findings including
  message IDs, identical rule names, and zero differences across every rule's
  meta, messages, schema and presets.

- Updated dependencies [[`7663cfd`](https://github.com/ofri-peretz/eslint/commit/7663cfda0d2c41b4c7dc0b4c680550cb74a27faa), [`d0cc8b6`](https://github.com/ofri-peretz/eslint/commit/d0cc8b647a41c1a85950c87a60296ece0f3abc31)]:
  - @interlace/eslint-devkit@1.10.0

## 2.3.15

### Patch Changes

- [#381](https://github.com/ofri-peretz/eslint/pull/381) [`74bbf60`](https://github.com/ofri-peretz/eslint/commit/74bbf60fe22feaed15df4330e73db1f72a8cee98) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Load rule modules on demand instead of at plugin load.

  Every plugin barrel used to `require` all of its rules the moment ESLint loaded
  the plugin, whether or not your config enabled them. `plugin.rules[id]` is only
  ever read for rules a config turns on, so the rest was parse-and-compile cost
  for code that never ran.

  The published entry now exposes each rule behind a getter, so a rule module is
  read the first time something asks for it. Measured on a 7-plugin config with 34
  rules enabled: 163 rule modules loaded and 251 ms of plugin load, against 34
  modules and 8.5 ms — total ESLint wall time 251 ms → 109 ms. On a preset that
  enables most of a plugin (`node-security/recommended`, 25 of 37) it is a wash,
  72 ms → 65 ms. It is never slower; the win scales with how many plugins you
  stack and how few of their rules you use.

  Nothing about the plugin API changes. `Object.keys(plugin.rules)` still lists
  every rule without loading any of them, repeated reads return the same object,
  and the `./oxlint` sub-export is the same plugin object it always was.

  `eslint-plugin-jwt` and `eslint-plugin-vercel-ai-security` also re-export their
  rule objects as named top-level exports, which cannot be deferred — those two
  keep loading eagerly.

- [#381](https://github.com/ofri-peretz/eslint/pull/381) [`74bbf60`](https://github.com/ofri-peretz/eslint/commit/74bbf60fe22feaed15df4330e73db1f72a8cee98) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Declare what we support, load only what we use

  **`tslib` is gone from every package.** It was a NON-optional peer of
  `@interlace/eslint-devkit`, so all 26 plugins declared it as a dependency to
  satisfy that peer — 124 kB every consumer installed so twelve
  `require("tslib")` calls could resolve. The shipped JavaScript now inlines
  the TypeScript helpers instead (`--importHelpers false` on the emit pass that
  already re-writes it), costing ~9.5 kB in devkit. Zero `tslib` requires remain
  anywhere; verified by installing every plugin with no `tslib` in the tree and
  loading all 26 with every rule intact.

  **`eslint-plugin-import-next` had a phantom dependency.** Its rules
  `require("typescript")` at module load, but it was declared in neither
  `dependencies` nor `peerDependencies` — it worked only because something else
  in the tree happened to install it. A clean install crashed the whole plugin,
  not just the type-aware rules. `typescript` is now a required peer, which is
  what the code actually needs.

  **23 "technologies we support" declarations did nothing.** Seven plugins
  listed their target libraries in `peerDependenciesMeta` with no matching
  `peerDependencies` entry, and npm ignores meta for a package that is not
  declared a peer — verified by installing `eslint-plugin-express-security` and
  watching nothing install and nothing warn. `eslint-plugin-jwt` appeared to
  support six JWT libraries and formally supported none. All 23 are now real
  optional peers, matching the convention `pg`, `mongodb`, `prisma` and the
  other nine already followed:

  | plugin                                                          | technologies now actually declared                                                                    |
  | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
  | `eslint-plugin-jwt`                                             | jsonwebtoken, @nestjs/jwt, express-jwt, jose, jwks-rsa, jwt-decode                                    |
  | `eslint-plugin-lambda-security`                                 | @aws-sdk/client-lambda, @middy/core, @middy/http-cors, @middy/http-security-headers, @middy/validator |
  | `eslint-plugin-express-security`                                | express, helmet, cors, csurf, express-rate-limit                                                      |
  | `eslint-plugin-nestjs-security`                                 | @nestjs/common, @nestjs/throttler, class-validator, class-transformer                                 |
  | `eslint-plugin-vercel-ai-security`                              | ai                                                                                                    |
  | `eslint-plugin-maintainability`, `eslint-plugin-react-features` | typescript                                                                                            |

  All optional, so nothing is installed on the consumer’s behalf — the
  declaration is the supported-technology signal, which is exactly what it was
  meant to be.

  **A new gate compares declared dependencies against what the emitted
  JavaScript actually loads**, in both directions: a `require` with no
  declaration (works until someone installs cleanly) and a declaration nothing
  requires (weight every consumer pays). It understands that a dependency may
  exist to satisfy an optional peer of another dependency, which is why
  `eslint-plugin-import-next` legitimately declares `oxc-resolver` that devkit
  lazily loads.

- [#335](https://github.com/ofri-peretz/eslint/pull/335) [`47cde07`](https://github.com/ofri-peretz/eslint/commit/47cde07f13fb128e973a46f2a66a68c3419cdef3) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Fix the `./oxlint` subpath export, which pointed at `src/oxlint.js` — a file no build produces. `require('<package>/oxlint')` threw MODULE_NOT_FOUND on every published package, while every README documented that exact wiring for oxlint's `jsPlugins`. The export now points at the build output, `dist/src/oxlint.js`.

  The path was hardcoded in `scripts/generate-oxlint-shims.ts`, so the generator rewrote any manual correction back to the broken value on the next drift check — fixed there rather than per package.

  This release also carries npm provenance: the affected packages were last published from a workstation, which has no OIDC token to attest with, so the published tarballs had no attestation. Publishing through the release workflow signs them.

- Updated dependencies [[`85e57a7`](https://github.com/ofri-peretz/eslint/commit/85e57a7c2facace33cae73749f6385fb8c7da41b), [`74bbf60`](https://github.com/ofri-peretz/eslint/commit/74bbf60fe22feaed15df4330e73db1f72a8cee98), [`e5d31ab`](https://github.com/ofri-peretz/eslint/commit/e5d31abb924de8473ba64093d6d514f3c44049ae), [`1fb1cad`](https://github.com/ofri-peretz/eslint/commit/1fb1caddf8e5c20d43de9cede5d66565b297bee6), [`d1a3d8c`](https://github.com/ofri-peretz/eslint/commit/d1a3d8c62778ed027a8c522a3cf9b12a3b1c90b9)]:
  - @interlace/eslint-devkit@1.8.0

## 2.3.14

### Patch Changes

- [#364](https://github.com/ofri-peretz/eslint/pull/364) [`86baa02`](https://github.com/ofri-peretz/eslint/commit/86baa026485bf93d63f1523d6eb382e0a40cbb3f) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Add the ecosystem and oxlint marks to the README logo row. Each plugin now
  leads with Interlace -> its ecosystem (node, nestjs, express, react, mongodb,
  postgresql, mysql, sqlite, prisma, drizzle, knex, typeorm, sequelize, lambda,
  vercel, jwt) -> oxlint -> ESLint; the generic quality plugins carry the row
  without an ecosystem mark. README-only change - no rule behaviour is affected.
  The patch bump is what carries the new README onto npm, which only refreshes a
  package README on publish.

## 2.3.13

### Patch Changes

- [#344](https://github.com/ofri-peretz/eslint/pull/344) [`73fd38f`](https://github.com/ofri-peretz/eslint/commit/73fd38f02fb7a9d8545563aa5b029e8604010d05) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Don't require `typescript` at module load — the plugin threw on a clean install
  for anyone linting plain JavaScript.

  `named`, `namespace` and `default` imported `typescript` at top level for a
  handful of enum values (`SymbolFlags.Alias`, `SyntaxKind.NamespaceImport`,
  `InternalSymbolName.Default`). That put `require("typescript")` in the emitted
  output, while the package declares no dependency or peer on TypeScript at all —
  so `npm i -D eslint-plugin-import-next` produced a package that threw
  `Cannot find module 'typescript'` on require.

  Those values are only needed on a path that already holds a TypeScript `Symbol`,
  which means the checker ran, which means TypeScript is installed. Access is now
  lazy and memoised via `utils/typescript-peer.ts`, so the plugin imports cleanly
  without TypeScript and costs one `require` on the type-aware path.

  Found by the new clean-install smoke test on its first full run.

## 2.3.12

### Patch Changes

- [#338](https://github.com/ofri-peretz/eslint/pull/338) [`dc25c81`](https://github.com/ofri-peretz/eslint/commit/dc25c81ffda3c261c9f3d80a87931679cf8c059f) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Re-publish every package so npm carries the optimised artifact

  No source changed. This is a no-op patch whose entire purpose is to ship the
  artifact the current build already produces.

  **Manifests.** `scripts` and `devDependencies` are now stripped from every
  published `package.json`. Neither can do anything in a consumer’s
  node_modules — npm never runs one and never installs the other — but they
  shipped in all 27 manifests, cluttered the npm page, and were read by SCA
  tools scanning installed manifests. No package declares a lifecycle hook, so
  nothing observable changes. Every published package is bumped so this applies
  uniformly rather than to a subset.

  **Tarballs.** 20 packages were last published before the build pipeline
  changed and still ship `AGENTS.md`, `CHANGELOG.md`, JSDoc in the emitted
  `.js`, and the full generated `.d.ts` tree:

  | package                            | published | rebuilt | saving  |
  | ---------------------------------- | --------- | ------- | ------- |
  | `eslint-plugin-react-features`     | 547 kB    | 320 kB  | −227 kB |
  | `eslint-plugin-secure-coding`      | 653 kB    | 477 kB  | −176 kB |
  | `eslint-plugin-conventions`        | 241 kB    | 116 kB  | −125 kB |
  | `eslint-plugin-browser-security`   | 380 kB    | 291 kB  | −89 kB  |
  | `eslint-plugin-maintainability`    | 178 kB    | 116 kB  | −62 kB  |
  | `eslint-plugin-react-a11y`         | 232 kB    | 173 kB  | −59 kB  |
  | `eslint-plugin-reliability`        | 148 kB    | 90 kB   | −58 kB  |
  | `eslint-plugin-vercel-ai-security` | 187 kB    | 130 kB  | −57 kB  |
  | `eslint-plugin-operability`        | 90 kB     | 43 kB   | −47 kB  |
  | `eslint-plugin-jwt`                | 140 kB    | 95 kB   | −45 kB  |
  | `eslint-plugin-modularity`         | 98 kB     | 58 kB   | −40 kB  |
  | `eslint-plugin-nestjs-security`    | 122 kB    | 86 kB   | −36 kB  |
  | `eslint-plugin-sqlite-security`    | 54 kB     | 20 kB   | −34 kB  |
  | `eslint-plugin-sequelize-security` | 54 kB     | 21 kB   | −34 kB  |
  | `eslint-plugin-prisma-security`    | 52 kB     | 19 kB   | −33 kB  |
  | `eslint-plugin-mysql-security`     | 52 kB     | 19 kB   | −33 kB  |
  | `eslint-plugin-typeorm-security`   | 52 kB     | 19 kB   | −33 kB  |
  | `eslint-plugin-drizzle-security`   | 52 kB     | 19 kB   | −33 kB  |
  | `eslint-plugin-knex-security`      | 51 kB     | 19 kB   | −32 kB  |
  | `eslint-plugin-modernization`      | 45 kB     | 38 kB   | −7 kB   |

  Those 20 go from 3428 kB to 2169 kB — **−36.7%**. The remaining
  7 were released after the pipeline change and only gain the manifest strip.

  A new check in `scripts/check-published-artifacts.ts` fails the build if
  `scripts` or `devDependencies` ever reappear in a published manifest, so the
  strip cannot silently regress.

  The dependency ranges did **not** need updating: every plugin pins
  `@interlace/eslint-devkit` with a caret that 1.6.0 satisfies, verified by a
  clean install of an unchanged plugin resolving devkit 1.6.0 with zero
  dependencies and no `typescript` in the tree.

- Updated dependencies [[`dc25c81`](https://github.com/ofri-peretz/eslint/commit/dc25c81ffda3c261c9f3d80a87931679cf8c059f)]:
  - @interlace/eslint-devkit@1.6.1

## 2.3.11

### Patch Changes

- [#334](https://github.com/ofri-peretz/eslint/pull/334) [`a5fad9f`](https://github.com/ofri-peretz/eslint/commit/a5fad9f97a5ef5a64c091d5174fec74fbe1e96c3) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Zero runtime dependencies: install 7500 kB → 444 kB, load 242 ms → 13.6 ms

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
  ecosystem, 5539.4 kB → 3546 kB unpacked (−36.0%), with no consumer-visible
  change. `scripts/build-package.ts` owns all five exclusions:

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

  - **`CHANGELOG.md`** (225 kB, 6% of everything shipped). The one component
    that grows with every release forever, so its share only rises. npm does not
    render it on the package page — the history stays on GitHub, in npm's
    "Versions" tab, and in the changesets release notes. `README.md` is kept: it
    IS the npm package page.

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

  Marked `minor`, not `major`. The API is unchanged — no exported symbol was
  removed or retyped — and with npm 7+ the three ex-dependencies are auto-installed
  as peers wherever a real dependency exists. The honest caveat: a strict package
  manager (pnpm without hoisting, or `--legacy-peer-deps`) will now need them
  declared explicitly, which is the one respect in which this is a bigger change
  than the version implies. Dependents pin `^1.4.4`, which already satisfies
  1.5.0, so consumers pick up the slim infrastructure on their next install
  without a range rewrite.

- [#320](https://github.com/ofri-peretz/eslint/pull/320) [`4cc62d6`](https://github.com/ofri-peretz/eslint/commit/4cc62d63908f91a7c54addadf21678c46c2bcc19) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - **`no-cycle` no longer crashes on deep import chains.** Tarjan's SCC pass recursed once per graph node, so a chain deeper than the JS call stack threw `RangeError: Maximum call stack size exceeded` — and since the rule defaults to unlimited traversal depth, nothing capped the descent. ESLint exited 2 with no results at all: not a slow lint, no lint. Observed at file 4,974 of a 5,000-node chain on Node 24.

  The traversal now runs on an explicit frame stack. Traversal order and every write to the Tarjan state are unchanged, so the components produced are identical; depth is bounded by heap rather than by the call stack. `eslint-plugin-import` has the same defect in its own `lib/scc.js` and still crashes on the same input.

  Chains reach these depths through generated API clients, nested barrel files, and long `export … from` ladders — depth accumulates through re-export edges, which is exactly what the rule follows. Reproduce with `node benchmarks/scripts/repro-deep-chain.mjs 6000`.

- Updated dependencies [[`a5fad9f`](https://github.com/ofri-peretz/eslint/commit/a5fad9f97a5ef5a64c091d5174fec74fbe1e96c3), [`0231140`](https://github.com/ofri-peretz/eslint/commit/023114046b2844d3daab88f40293bddd75519fe3), [`4cc62d6`](https://github.com/ofri-peretz/eslint/commit/4cc62d63908f91a7c54addadf21678c46c2bcc19)]:
  - @interlace/eslint-devkit@1.6.0

## 2.3.10

### Patch Changes

- [#301](https://github.com/ofri-peretz/eslint/pull/301) [`b07b8a3`](https://github.com/ofri-peretz/eslint/commit/b07b8a3da59da34969bb26a2481541464a222c84) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Correct the unmeasured "up to 100x faster" claim in the 2.0.0 CHANGELOG entry.

  `CHANGELOG.md` ships in this package's `files` array, so the claim was published to npm. No benchmark measures 100x: the verified figures are **3.1x faster end-to-end** and **8x faster in pure rule execution** against `eslint-plugin-import` 2.32.0 on a 5,736-file / 455K-LoC React codebase. The entry now carries an inline correction rather than a silent rewrite of release history — see `CLAIMS.md` § Withdrawn claims.

  Docs-only. No rule behaviour changes.

- [#294](https://github.com/ofri-peretz/eslint/pull/294) [`659f6dc`](https://github.com/ofri-peretz/eslint/commit/659f6dc0181b03b675f72b5949fcf123dd066358) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Rewrite `description` and `keywords` on every published package for npm search discovery. npm ranks on name, description, and keywords, and the registry only picks up these fields at publish — so this is metadata-only and takes effect for each package on its next release.

  **Descriptions now lead with the search phrase.** Every one starts `ESLint plugin for <the thing you'd search>` instead of a brand-first or category-first framing, and names the concrete vulnerabilities the plugin actually detects. Three were corrected while doing so:

  - `eslint-plugin-import-next` claimed "100x faster no-cycle detection". No 100x measurement exists: `CLAIMS.md` records **3.1x end-to-end** (8x in pure rule execution) on a 5,483-file React codebase, and the highest number in any benchmark result is 54.9x on the synthetic corpus. The description now states the real-codebase figure.
  - `eslint-plugin-secure-coding` claimed SQL injection, XSS and CSRF coverage — none of which are its rules. It now names what it does detect: LDAP, XPath, XXE, GraphQL and template injection, unsafe deserialization, ReDoS, missing authentication, and PII in logs.
  - `eslint-plugin-secure-coding` ("89 rules") and `eslint-plugin-react-a11y` ("37 rules") hard-coded rule counts that had drifted from reality. Counts are generated into `interlace-numbers.json`; hand-typed copies are removed rather than corrected.

  **Keywords now match the vocabulary of the plugins that rank.** `eslint-plugin-security`, `eslint-plugin-jsx-a11y`, `eslint-plugin-n` and `eslint-plugin-import` all carry the `eslint` / `eslintplugin` / `eslint-plugin` trio — six of our packages were missing `eslintplugin`, and every one now carries all three plus `static-analysis`, `linting` and `code-quality`. Security plugins add `sast`, `appsec` and `vulnerability`; `node-security` and `secure-coding` also carry `nodesecurity`, the exact keyword `eslint-plugin-security` ranks on. Each plugin gained the CWE identifiers and attack names for what it detects (`cwe-78` command injection, `cwe-22` path traversal, `cwe-89` SQL injection, `cwe-79` XSS, `cwe-347` JWT algorithm confusion, `cwe-352` CSRF, `cwe-943` NoSQL injection), and `node-security` gained the crypto vocabulary it had been missing entirely despite absorbing the crypto rule set (`crypto`, `cryptography`, `weak-hash`, `md5`, `sha1`, `timing-attack`).

  No rule behavior, exports, or configuration changes.

- Updated dependencies [[`e1cdf83`](https://github.com/ofri-peretz/eslint/commit/e1cdf83e3db761907f0ab06f7fc6c1f1da7513a5), [`659f6dc`](https://github.com/ofri-peretz/eslint/commit/659f6dc0181b03b675f72b5949fcf123dd066358)]:
  - @interlace/eslint-devkit@1.4.3

## 2.3.9

### Patch Changes

- [#269](https://github.com/ofri-peretz/eslint/pull/269) [`7028fe2`](https://github.com/ofri-peretz/eslint/commit/7028fe2668a42266d831014184dcef70e73101ad) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - docs: dual-logo README header (Interlace mark + ESLint mark side by side) and closing Interlace footer — refreshes the README rendered on npmjs.com. No runtime changes.

- Updated dependencies [[`7028fe2`](https://github.com/ofri-peretz/eslint/commit/7028fe2668a42266d831014184dcef70e73101ad)]:
  - @interlace/eslint-devkit@1.4.2

## 2.3.8

### Patch Changes

- [#252](https://github.com/ofri-peretz/eslint/pull/252) [`d67e395`](https://github.com/ofri-peretz/eslint/commit/d67e3953c2748ad36e6aebe0f24b1d04e518b4d0) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Fix Codecov badge showing "unknown" — switch from flag to component URL format

## 2.3.7

### Patch Changes

- [#141](https://github.com/ofri-peretz/eslint/pull/141) [`38ab670`](https://github.com/ofri-peretz/eslint/commit/38ab670a0221684f4fd3d5dc3c05ddec7458ca2b) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - fix: remove false `meta.fixable: 'code'` declarations from 21 rules that had no `fix()` function

  Rules that declared `fixable: 'code'` in their ESLint meta without an actual `fix()` implementation would show the ⚡ auto-fix icon in editors and CI formatters but apply no change when `--fix` was run. This patch removes the misleading declaration from:
  - `browser-security/no-clickjacking`
  - `import-next/first`, `named`, `no-barrel-import`, `no-import-module-exports`, `no-namespace`
  - `node-security/no-buffer-overread`, `no-unsafe-dynamic-require`, `no-zip-slip`
  - `react-features/react-no-inline-functions`
  - `reliability/no-jsdoc-terminator-in-example` (uses `suggest`, not auto-fix; corrected to `hasSuggestions: true` only)
  - `secure-coding/no-directive-injection`, `no-electron-security-issues`, `no-graphql-injection`, `no-improper-sanitization`, `no-improper-type-validation`, `no-ldap-injection`, `no-unchecked-loop-condition`, `no-unlimited-resource-allocation`, `no-weak-password-recovery`, `no-xpath-injection`

- [#186](https://github.com/ofri-peretz/eslint/pull/186) [`edf208d`](https://github.com/ofri-peretz/eslint/commit/edf208d67ac2357312c97d8964fcf6a462e407eb) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Consolidation cleanup — no rule behavior change:
  - **react-features**: the README rules table now lists the 8 `componentApi`
    preset rules. The README generator (`sync-readme-rules.ts`) and the
    `plugin-rule-source-drift` validator now recurse into nested
    `docs/rules/<category>/` subfolders, so every documented rule is advertised
    consistently (previously the nested componentApi docs were silently dropped,
    which an earlier `readme` exception had papered over — that exception is now
    removed in favour of the real fix).
  - **node-security**: remove the orphaned `no-pii-in-logs` rule source — the rule
    was migrated to `eslint-plugin-secure-coding` and is no longer exported here;
    the dead source was still compiling into `dist`.
  - **import-next**: restore the `no-cycle` unit test after [#180](https://github.com/ofri-peretz/eslint/issues/180)'s SCC refactor
    (`computeSCCsFromFile` + `findShortestCyclePath` are now bridged in the mock).

  Also fixes `scripts/ilb-plugin-scope-audit.ts` to stop mis-reading config-preset
  keys (`'recommended-strict': {`) as rules.

- Updated dependencies [[`736a5fe`](https://github.com/ofri-peretz/eslint/commit/736a5fed47e673f6157ea900b29fe2a54e4bc7df)]:
  - @interlace/eslint-devkit@1.4.1

### Changed

- `no-cycle` rewritten to per-import targeted DFS (replaces upfront full-graph BFS+Tarjan SCC). The `nonCyclicFiles` cache provides O(1) rejection after first visit; only files along the actual DFS path are read. Detection parity with the previous algorithm is preserved.

## 2.3.6 — 2026-05-03

## 2.3.5 — 2026-02-09

This was a version bump only for eslint-plugin-import-next to align it with other projects, there were no code changes.

## 2.3.3 — 2026-02-08

### Bug Fixes

- align codecov component IDs with full package names ([2831b968](https://github.com/ofri-peretz/eslint/commit/2831b968))

### Documentation

- fix changelog header format across all packages ([c3a15082](https://github.com/ofri-peretz/eslint/commit/c3a15082))

### ❤️ Thank You

- Ofri Peretz

## 2.3.2 — 2026-02-06

### Bug Fixes

- align codecov component names and update docs components ([0a59a86c](https://github.com/ofri-peretz/eslint/commit/0a59a86c))

### ❤️ Thank You

- Ofri Peretz

## 2.3.1 — 2026-02-02

This was a version bump only for eslint-plugin-import-next to align it with other projects, there were no code changes.

### Documentation

- 📘 Launched new documentation site: [eslint.interlace.tools](https://eslint.interlace.tools/)

## 2.0.0 — 2025-12-30

### Changed

- **Architecture Overhaul**: Complete rewrite for performance and maintainability.
- **Rule Parity**: Achieved 100% feature parity with `eslint-plugin-import` (46 rules).
- **Performance**: `no-cycle` rule is now significantly faster using incremental graph analysis. _(Corrected 2026-08-02: this entry originally read "up to 100x faster". That number was never measured and has been withdrawn — see [CLAIMS.md](https://github.com/ofri-peretz/eslint/blob/main/CLAIMS.md). The verified figures are 3.1x faster end-to-end and 8x faster in pure rule time on a 5,736-file React codebase.)_
- **TypeScript Support**: First-class support for TypeScript (parsers and resolvers) out of the box.

### Added

- **New Rules**:
  - `prefer-node-protocol` - Enforce `node:` protocol for Node.js built-ins.
  - `no-named-as-default` - specialized check for named exports used as default.
  - `no-named-as-default-member` - Check for properties on default export that match named exports.
  - `no-relative-packages` - Enforce package boundaries.
  - `no-import-module-exports` - Disallow `module.exports` alongside imports.
  - `no-empty-named-blocks` - Disallow empty named import blocks.
  - `consistent-type-specifier-style` - Enforce type-only import style (inline vs top-level).
  - `no-dynamic-require` - Disallow dynamic require calls.
  - `no-self-import` - Detect self-referential imports.
  - `no-named-default` - Disallow named default exports.
  - `no-restricted-paths` - Enhanced path restriction rule.
  - `unambiguous` - Enforce unambiguous module type.
- **Enhanced Documentation**: All rules now feature AEO-compliant documentation with OWASP mappings.
- **Improved Testing**: Comprehensive test suite covering all rules, including edge cases and TypeScript integration.

## 1.0.0 — 2024-12-05

### Added

- Initial release with 30 LLM-optimized dependency rules
- **Module Resolution Rules** (7 rules):
  - `no-unresolved` - Ensure imports resolve to a module
  - `named` - Ensure named imports exist
  - `default` - Ensure default export exists
  - `namespace` - Ensure namespace imports are valid
  - `extensions` - Enforce file extension usage
  - `no-self-import` - Prevent module from importing itself
  - `no-duplicates` - Prevent duplicate imports
- **Module System Rules** (3 rules):
  - `no-amd` - Disallow AMD imports
  - `no-commonjs` - Disallow CommonJS imports
  - `no-nodejs-modules` - Disallow Node.js built-in modules
- **Dependency Boundaries Rules** (6 rules):
  - `no-cycle` - Detect circular dependency chains
  - `no-internal-modules` - Forbid deep/internal module imports
  - `no-cross-domain-imports` - Enforce domain boundaries
  - `enforce-dependency-direction` - Enforce layered architecture
  - `no-restricted-paths` - Restrict imports between paths
  - `no-relative-parent-imports` - Disallow `../` imports
- **Export Style Rules** (6 rules):
  - `no-default-export` - Disallow default exports
  - `no-named-export` - Disallow named exports
  - `prefer-default-export` - Prefer default for single exports
  - `no-anonymous-default-export` - Disallow anonymous default exports
  - `no-mutable-exports` - Disallow mutable exports
  - `no-deprecated` - Disallow deprecated exports
- **Import Style Rules** (4 rules):
  - `enforce-import-order` - Enforce import ordering
  - `first` - Ensure imports are at the top
  - `newline-after-import` - Require newline after imports
  - `no-unassigned-import` - Disallow side-effect imports
- **Dependency Management Rules** (4 rules):
  - `no-extraneous-dependencies` - Disallow unlisted dependencies
  - `no-unused-modules` - Detect unused exports/modules
  - `max-dependencies` - Limit number of dependencies
  - `prefer-node-protocol` - Prefer `node:` protocol for builtins
- Preset configurations: `recommended`, `strict`, `module-resolution`, `import-style`, `esm`, `architecture`
- Full ESLint 9 flat config support
- ESLint MCP integration for AI assistants
- TypeScript type exports for all rule options
