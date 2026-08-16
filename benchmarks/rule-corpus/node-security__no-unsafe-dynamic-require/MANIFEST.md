# Rule corpus — `node-security/no-unsafe-dynamic-require` (CWE-95)

Written from CWE-95 semantics and real Node idiom, **not** from the rule's own
test file. The point is independent evidence: a corpus derived from the tests
can only re-derive what the author already thought of.

Each fixture is one file, one shape, with the rationale in a header comment.
`vulnerable/` must be reported; `safe/` must stay quiet.

The sink family is "the module loader is handed a specifier an attacker can
name": `require(x)`, its aliases, and `import(x)`. The rule is deliberately
*taint*-based rather than *constancy*-based — it asks "can an attacker name this
module", not "can I prove this is constant" — so build tooling that resolves
paths inside its own repo must stay quiet, and does.

## Wave 1 — the shapes a maintainer would think of

| Fixture | Shape |
|---|---|
| `vulnerable/01-express-plugin-route.js` | `require(req.query.plugin)` |
| `vulnerable/02-template-driver-hop.js` | one `const` hop, then template interpolation |
| `vulnerable/03-cli-argv.js` | `require(process.argv[2])` in a CLI entry point |
| `vulnerable/04-lambda-handler-dispatch.js` | `'/opt/…' + event.pathParameters.name` |
| `vulnerable/05-aliased-require.js` | `const load = require; load(ctx.request.body.theme)` |
| `vulnerable/06-ts-cast-specifier.ts` | TypeScript `req.params.renderer as string` |
| `vulnerable/07-fake-traversal-filter.js` | partial mitigation — one `replace('../','')`, defeated by `....//` |
| `vulnerable/08-reassigned-specifier.js` | safe default overwritten from `req.headers` before the call |
| `safe/01-static-require.js` | written-out specifiers — the baseline that must never fire |
| `safe/02-allowlist-lookup.js` | the remediation: a table; the request picks a key |
| `safe/03-build-script-path-join.js` | `require(path.join(ROOT, name, 'package.json'))` in build tooling |
| `safe/04-const-specifier.js` | specifier hoisted to a module constant |
| `safe/05-static-template-specifier.js` | template literal with no substitutions |
| `safe/06-require-resolve-only.js` | `require.resolve` — resolution without evaluation |
| `safe/07-mentions-require-in-text.js` | `require(req.query.plugin)` only in a comment and a string |
| `safe/08-request-body-not-a-specifier.js` | request data everywhere, never at the sink |

Wave 1 scored **100% F1** (8 TP / 0 FP / 0 FN) — which is why wave 2 exists.

## Wave 2 — adversarial

Took the score from 100% to **78.3% F1** (9 TP / 2 FP / 3 FN).

| Fixture | Attack |
|---|---|
| `vulnerable/09-dynamic-import-esm.js` | `await import(req.params.name)` — the ESM spelling |
| `vulnerable/10-module-require.js` | `module.require(x)` — the loader through the module object |
| `vulnerable/11-create-require-esm.js` | `createRequire(import.meta.url)` bound to a local |
| `vulnerable/12-identity-sanitizer.js` | a local helper named `sanitizeModuleName` that only trims and lower-cases (positive control: a wrapper must not launder taint) |
| `safe/09-webpack-request-const.js` | `const request = './loaders/babel-loader.js'` — a taint-root NAME bound to a literal |
| `safe/10-unresolved-parameter.js` | `function resolveLoader(request) { require(request) }` — a bare parameter |
| `safe/11-let-all-literal-writes.js` | a `let` whose every write is a literal |
| `safe/12-config-driven-adapter.js` | specifier out of the program's own config file (unresolved → silent by contract) |

## What this corpus proved

Three false negatives and two false positives, all fixed in
`packages/eslint-plugin-node-security/src/rules/no-unsafe-dynamic-require/index.ts`,
each locked by a regression case that fails on the unfixed rule:

1. **`allowDynamicImport` was a dead option.** It was declared in `Options`,
   present in the JSON schema with `default: false`, listed in
   `defaultOptions` — and never read, with no `ImportExpression` visitor
   anywhere in the rule. `import(req.params.name)` was silent in *every*
   configuration, while the option's documentation promised the opposite. The
   option is now honoured, and the ESM sink is judged by the same evidence as
   `require`, under its own `unsafeDynamicImport` message.
2. **`module.require(x)` was not the loader.** The visitor returned early for
   any non-`Identifier` callee.
3. **`createRequire` was not tracked.** The rule already resolved
   `const load = require`; `createRequire(import.meta.url)` is the same binding
   one call deeper, and it is the only way to reach the CJS loader from ESM.
4. **A `const` bound to a literal was reported because of its NAME.** The taint
   roots (`req`, `request`, `ctx`, `event`, `process`) are matched by
   identifier name, and webpack's resolver vocabulary calls a module specifier a
   `request` — so `const request = './loaders/babel-loader.js'` was a critical
   finding on a hard-coded path. Constant resolution now runs first.
5. **A bare parameter was reported because of its NAME.** The rule's own header
   documents bare parameters as silent ("a caller-side decision this rule cannot
   see", restorable with `reportUnresolvedSpecifiers`), and its suite contains
   `function readMock(filePath) { return require(filePath); }` as valid. The
   identical `function resolveLoader(request)` was reported — same evidence,
   opposite verdict, decided by the spelling of a parameter.

Reported, not changed: the taint ROOTS themselves are a name match living in
the shared `src/utils/provenance.ts`. Fixes 4 and 5 neutralise the two shapes
this corpus could reach without touching the shared module, but any local named
`req`/`ctx`/`event` whose value is neither a literal nor a parameter is still
tainted by spelling alone.
