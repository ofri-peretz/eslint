# Rule corpus — `node-security/no-dynamic-dependency-loading` (CWE-1104)

Written from the vulnerability's semantics and real Node idiom, **not** from
the rule's own test file. The point is independent evidence: a corpus derived
from the tests can only re-derive what the author already thought of.

Each fixture is one file, one shape, with the rationale in a header comment.
`vulnerable/` must be reported; `safe/` must stay quiet.

The sink family is **the module loader** — `require(x)` and `import(x)`. The
rule's own header states the question it means to answer: not "is this argument
a literal" but "can an attacker steer it", judged with `isStaticExpression`.
The corpus is built to that reading, so a provably-constant specifier written
in a non-literal way belongs in `safe/`.

## Fixtures

### `vulnerable/` — 11

Wave 1 — the specifier is genuinely steerable:

| File | Shape |
|---|---|
| `01-require-argv.js` | `require(process.argv[2])` in a CLI |
| `02-import-request-query.js` | `await import(req.query.plugin)` in an Express route |
| `03-require-parameter.js` | the specifier is a function parameter (a plugin loader) |
| `04-require-env-template.js` | `` require(`./adapters/${process.env.DB_DRIVER}`) `` |
| `05-require-let-reassigned.js` | a `let` initialised to a literal, then overwritten from the env |
| `06-import-config-member.js` | `await import(config.storage.adapter)` from a file on disk |
| `07-require-ts-cast.ts` | `require(chain as string)` over a request header |
| `08-require-path-join-env.js` | `path.join(DIR, process.env.SITE_THEME, …)` |

Wave 2 — adversarial, written after wave 1 scored 100%:

| File | Attack |
|---|---|
| `09-create-require-tainted.js` | `module.createRequire()` — callee is never spelled `require` |
| `10-module-require-member.js` | `module.require(x)` and `require.main.require(x)` |
| `11-indirect-require-comma.js` | `(0, require)(x)` — the bundler-evasion idiom |

### `safe/` — 10

| File | Shape |
|---|---|
| `01-static-specifiers.js` | literal specifiers in all four loader forms |
| `02-const-folded-template.js` | `` require(`${SCOPE}/${METHOD}`) `` with both bound to literals |
| `03-dirname-and-path-join.js` | `__dirname`, `path.join`, `require.resolve` |
| `04-conditional-constants.js` | `require(isProd ? './a.js' : './b.js')` |
| `05-static-lazy-imports.js` | a `switch` of four static `await import()`s |
| `06-const-let-never-reassigned.js` | a `let` written exactly once (the mirror of vulnerable/05) |
| `07-ts-typed-constants.ts` | `as const`, a type annotation, a non-null assertion |
| `08-allowlist-lookup.js` | `require(ADAPTERS[name])` over a frozen object, `Object.hasOwn`-guarded |
| `09-const-chain-and-concat.js` | concatenation, a `const` chain, the same constant used twice |
| `10-loader-vocabulary-in-text.js` | `require`/`import` only as strings, comments and property names |

## Scores

| Wave | TP | FP | FN | Precision | Recall | F1 |
|---|---:|---:|---:|---:|---:|---:|
| Wave 1 only (8 vuln / 7 safe) | 8 | 0 | 0 | 100.0% | 100.0% | **100.0%** |
| + adversarial wave, before fix | 8 | 1 | 3 | 88.9% | 72.7% | **80.0%** |
| after fix | 11 | 1 | 0 | 91.7% | 100.0% | **95.7%** |

## What this corpus proved

**Three false negatives, all fixed** (`src/rules/no-dynamic-dependency-loading/index.ts`).
The rule tested `callee.type === Identifier && callee.name === 'require'` and
nothing else, so three loaders Node itself documents were invisible to it — each
carrying an attacker-supplied specifier the rule would have reported had it been
passed to the one spelling it knew:

1. `module.require(x)` and `require.main.require(x)` — real entry points that
   resolve against another module's paths, which is exactly why plugin hosts
   reach for them.
2. A binding from `module.createRequire()` — the sanctioned ESM→CJS loader, so
   the spelling a modern codebase actually uses.
3. `(0, require)(x)` — the standard idiom for hiding a specifier from a
   bundler's static analysis, reached for *because* it defeats precisely the
   analysis this rule performs.

The fix matches AST shape and resolves bindings through `resolveModuleBinding`;
the receiver of a `.require` member is checked structurally, so
`bundler.require(x)` on an unrelated object stays quiet (locked by nine valid
cases in the coverage suite).

**One false positive, NOT fixed — reported instead.** `safe/08` is the correct
remediation for `vulnerable/03`: a frozen object literal of four static
specifiers, an `Object.hasOwn` guard, and a throw on the failure path.
`ADAPTERS[name]` evaluates to one of exactly four literals whatever `name` is,
so nothing is steerable — but `isStaticExpression` returns `false` for every
computed member access, and the rule reports.

Not fixed here, and deliberately: the gap is in
`@interlace/eslint-devkit`'s `isStaticExpression`, which **every** security rule
in the ecosystem consumes. A local patch in this one rule would make it disagree
with its siblings on identical code.

> **Recommended devkit change** (`packages/eslint-devkit/src/ast/static-expression.ts`,
> `MemberExpression` case, currently `if (node.computed) return false`): a
> computed member access is static when the object resolves to a `const`
> `ObjectExpression` (or `Object.freeze(…)` of one) whose every property is
> non-computed, non-spread, and has a static value — the result is then one of a
> closed set of statics regardless of the key. This is the single most common
> shape of the remediation these rules ask users to write, so today the
> ecosystem reports the fix it recommends.
