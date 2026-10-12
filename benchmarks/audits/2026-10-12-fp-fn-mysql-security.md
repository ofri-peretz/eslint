# FP/FN audit: eslint-plugin-mysql-security (2026-10-12)

The audit ran against the published `latest`. It adds 17 `FP:` and 12 `FN:` cases, each written failing first. The real-code scan now shows only true positives, and every Quint oracle case agrees with the rule.

Most fixes live in the shared factories in `@interlace/eslint-devkit` (`src/rule-creation/`), which this plugin configures; the plugin's own change is its sink and evidence configuration. The plugin depends on the published devkit, so **its 1.0.0 needs the devkit release that ships them**.

**Design constraint.** Verdicts come from AST structure, the scope manager, bounded same-file value following and relative imports read from disk (cached; the rule abstains when a module cannot be read). The receiver of a sink is judged by where it is written (`driver-origin.ts`), never by its name, and every review case binds `foo`/`bar`/`baz` so the rename litmus is part of the suite. The SDK-evidence gates are unchanged (`benchmarks/__tests__/sdk-gate-coverage.lock.test.ts` passes).

**Value and fragment positions** (`sql-position.ts`). A hole in a VALUE position (after `=`/`<`/`LIKE`, inside `'…'`, in `IN (…)`/`VALUES (…)`, after `LIMIT`) has a bind parameter as its safe alternative, so any value the file cannot prove fixed is reported. A hole in a FRAGMENT position (an identifier, an `ORDER BY` target, a whole clause) has none: query builders and migration helpers compose those from their own callers. There a hole is reported once the file traces it to the inbound request. Fixed means: literals, constants, enum and `const`-object members, numbers, `?` placeholder lists, fixed-map lookups, anchored-regex or fixed-list allowlist guards and ternaries, local helpers every `return` of which is fixed, and the driver's own escapers and fragments (an escaper only outside a quoted token).

**Partition with `secure-coding/no-sql-injection`.** A file that reaches the driver only through a relative import is checked for this plugin's library-specific sinks; the generic `query`/`execute` call there is `secure-coding`'s, so the two plugins never report the same line. Test files (`isTestFilePath`) are skipped by every rule, per BENCHMARK-CRITERIA §B1.

## Method

- **Synthetic.** Snippets run against the published package in a scratch install: mysql2 and mysql2/promise: `query`/`execute` with `?`/`??` placeholders, `namedPlaceholders`, the `{ sql, values }` options form, pools and pool clusters, `format`/`escape`/`escapeId` and `sqlstring`; connection options and DSNs held in constants, ternaries and `process.env` fallbacks; GraphQL `client.query`, React Query, `RegExp.exec` and `child_process.exec` beside the driver. The synthetic suite ends at FP=0 FN=0.
- **Real code.** Every file that imports the library, linted with all of the plugin's rules.
- **Quint oracle.** Two models, sampled and locked by `benchmarks/__tests__/quint-oracle.lock.test.ts` (see below).

| Repository                                                  | Files   |
| ----------------------------------------------------------- | ------- |
| sidorares/node-mysql2 (website/docs code blocks, extracted) | 149     |
| n8n-io/n8n (MySQL node)                                     | 12      |
| bezkoder/nodejs-express-mysql                               | 1       |
| Budibase/budibase (MySQL integration)                       | 1       |
| **Total**                                                   | **163** |

## Real-code findings per rule

| Rule                     | Published | Verdict                                                                                                                                        | After the fix | Verdict                                                                                                                                                                                                                    |
| ------------------------ | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| no-hardcoded-credentials | 14        | TP (literal passwords and DSNs in the published docs examples)                                                                                 | 20            | all TP: the 14, plus 6 the published rule missed — DSNs bound to a constant, pool-cluster members, template DSNs, and bezkoder `app/models/db.js:7`, whose literal password sits in the config module the connection reads |
| no-unsafe-query          | 2         | FP: n8n `MySqlV1.node.ts:416` and `:448` compose the `INSERT` verb and column identifiers from node parameters, where no bind parameter exists | 0             | —                                                                                                                                                                                                                          |
| require-tls              | 0         | —                                                                                                                                              | 0             | —                                                                                                                                                                                                                          |

No finding is duplicated by `secure-coding/no-sql-injection` or another plugin.

## Quint oracle

| Model                                                | Distinct cases | Disagreements now |
| ---------------------------------------------------- | -------------- | ----------------- |
| `models/mysql-security.no-unsafe-query.qnt`          | 2320           | 0                 |
| `models/mysql-security.no-unsafe-query.plumbing.qnt` | 160            | 0                 |

The values model crosses source {literal, number, request field, parameter, env var} × transform {none, `trim()`, `Number()`, another library's `escape` (`validator.escape`), `join(',')`, allowlist ternary, fixed-map lookup, `mysql.escape(v)`} × position {`= ${v}`, `'${v}'`, `IN (${v})`, `ORDER BY ${v}`, `'…' + v`} × binding {inline, `const`, `let` reassigned, same-file helper} × sink. The plumbing model crosses import style {default, named, namespace, `require`, aliased} × call {plain, computed `db['m']`, optional `db?.m`, cast `(db as any).m`} × receiver {the driver, another library's client with the same method} × value × position. Renderers share `renderers/_sql.mjs`.

Disagreements, all resolved by reading the rendered case:

| Disagreement                                                                                                                                                                                                                        | Cases                                                                        | Defect in             | Resolution                                                                                                                                                                                                                              |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| An allowlist ternary written inline in the template (`${['a','b'].includes(x) ? x : 'a'}`) reported: `sqlHoles` split the ternary into arms and judged the guarded arm alone                                                        | 37 on mysql, the first model run                                             | rule (shared factory) | `sqlHoles` walks a ternary or `\|\|` only when an arm builds SQL text; a value-choosing ternary is judged whole, guard attached. Locked by `FP: an allowlist ternary written inline in the template` (mysql) and `sql-position.test.ts` |
| An escaped value inside `'…'` or an identifier quote stayed silent. The escaper's output brings its own quotes, which close the author's token: `name = '${mysql.escape(x)}'` with `x = "OR 1=1 OR"` reads `name = '' OR 1=1 OR ''` | 36 on mysql                                                                  | rule (shared factory) | `isQuoted(preceding)` turns escapers off for that hole: an escaped value there is only as safe as what it escaped. Locked by the two `FN:` cases in the mysql `quint oracle 2026-10` block and `sql-safety.test.ts`                     |
| An escaped **constant** inside quotes expected reported                                                                                                                                                                             | 24 on mysql                                                                  | model                 | The model's first draft ignored that `escape('admin')` is fixed text. Corrected: `Escape => p != Quoted or s == Literal or s == NumberConst`, with a comment. Pinned by `FP: an escaped constant inside quotes is still a constant`     |
| Another library's function of a constant (`validator.escape('admin')`) expected silent                                                                                                                                              | 93 on every values model except sequelize (64), prisma (62) and drizzle (63) | model                 | The rule cannot see what a foreign function returns, so its result is unproven in a value position (the documented contract). Corrected: `Lookalike => false`, with a comment                                                           |

Making request tracing follow any call (needed so `validator.escape(req.body.x)` and a same-file helper count as request-derived in a fragment position) briefly reported a map lookup keyed by a parameter field (`adapter.tableNameMap.get(…adapter.payload…)`, payload `getTableColumnFromPath.ts:801`) on the real-code re-scan. A method of the file's own data (`map.get`, `rows.find`) now carries only its receiver, not its arguments. Locked by `FP: a map lookup keyed by a parameter field returns what the map holds` (drizzle) and `sql-position.test.ts`.

The other six plugins' models were generated after those shared fixes landed. Their only disagreements were the look-alike model defect above; after it, every model of every plugin agrees with its rule.

## Findings

| Finding                                                                                                         | FP/FN | Status | Test name                                                                              |
| --------------------------------------------------------------------------------------------------------------- | ----- | ------ | -------------------------------------------------------------------------------------- |
| `no-hardcoded-credentials` — mysql-security FP/FN review 2026-10-12, synthetic probe (BENCHMARK-CRITERIA B1)    | FP    | fixed  | FP: a test file pointing at a throwaway local database                                 |
| `no-hardcoded-credentials` — mysql-security FP/FN review 2026-10-12, synthetic probe (literal fallback)         | FN    | fixed  | FN: a literal fallback behind the environment variable                                 |
| `no-hardcoded-credentials` — mysql-security FP/FN review 2026-10-12, synthetic probe (template DSN)             | FN    | fixed  | FN: a DSN template whose static head carries the password                              |
| `no-hardcoded-credentials` — mysql-security FP/FN review 2026-10-12, synthetic probe (DSN bound first)          | FN    | fixed  | FN: a DSN bound to a constant, then handed to the driver                               |
| `no-hardcoded-credentials` — sidorares/node-mysql2:website/docs/examples/connections/createPoolCluster.mdx:31   | FN    | fixed  | FN: a DSN handed to a pool cluster member                                              |
| `no-hardcoded-credentials` — bezkoder/nodejs-express-mysql:app/models/db.js:7                                   | FN    | fixed  | FN: the password is a literal in the config module the connection reads                |
| `no-unsafe-query` — mysql-security FP/FN review 2026-10-12, synthetic probe (constant table name)               | FP    | fixed  | FP: a constant interpolated as the table name                                          |
| `no-unsafe-query` — mysql-security FP/FN review 2026-10-12, synthetic probe (placeholder list)                  | FP    | fixed  | FP: a ? placeholder list built from the ids it binds                                   |
| `no-unsafe-query` — mysql-security FP/FN review 2026-10-12, synthetic probe (fixed column list)                 | FP    | fixed  | FP: a fixed column list joined into the select list                                    |
| `no-unsafe-query` — mysql-security FP/FN review 2026-10-12, synthetic probe (numeric pagination)                | FP    | fixed  | FP: a value forced to a number                                                         |
| `no-unsafe-query` — mysql-security FP/FN review 2026-10-12, synthetic probe (driver escapers)                   | FP    | fixed  | FP: the driver's own escapers                                                          |
| `no-unsafe-query` — mysql-security FP/FN review 2026-10-12, synthetic probe (closed choices)                    | FP    | fixed  | FP: a ternary between two keywords, an enum member, a const-object member              |
| `no-unsafe-query` — mysql-security FP/FN review 2026-10-12, synthetic probe (local helper returning fixed text) | FP    | fixed  | FP: a local helper every return of which is fixed text                                 |
| `no-unsafe-query` — mysql-security FP/FN review 2026-10-12, synthetic probe (taint was keyed by name)           | FP    | fixed  | FP: another function's tainted `sql` is not this parameter                             |
| `no-unsafe-query` — mysql-security FP/FN review 2026-10-12, synthetic probe (another driver in the same file)   | FP    | fixed  | FP: another driver's client is that driver's plugin's to judge                         |
| `no-unsafe-query` — n8n-io/n8n:packages/nodes-base/nodes/MySql/v1/MySqlV1.node.ts:448                           | FP    | fixed  | FP: identifiers composed from a caller-supplied value — no bind parameter exists there |
| `no-unsafe-query` — n8n-io/n8n:packages/nodes-base/nodes/MySql/v1/MySqlV1.node.ts:416                           | FP    | fixed  | FP: a keyword option composed into an INSERT verb                                      |
| `no-unsafe-query` — mysql-security FP/FN review 2026-10-12, synthetic probe (BENCHMARK-CRITERIA B1)             | FP    | fixed  | FP: a test file is not the shipped attack surface                                      |
| `no-unsafe-query` — mysql-security FP/FN review 2026-10-12, synthetic probe (options-object form)               | FN    | fixed  | FN: the statement passed as { sql } in the options form                                |
| `no-unsafe-query` — mysql-security FP/FN review 2026-10-12, synthetic probe (request text as the statement)     | FN    | fixed  | FN: request data handed over as the statement itself                                   |
| `no-unsafe-query` — quint mysql-security.no-unsafe-query: ReqBody/Allowlist/Eq/Inline/PoolQuery                 | FP    | fixed  | FP: an allowlist ternary written inline in the template                                |
| `no-unsafe-query` — quint mysql-security.no-unsafe-query: Literal/Escape/Quoted/Inline/PoolQuery                | FP    | fixed  | FP: an escaped constant inside quotes is still a constant                              |
| `no-unsafe-query` — quint mysql-security.no-unsafe-query: Param/Escape/Quoted/ViaLet/PoolQuery                  | FN    | fixed  | FN: an escaped value inside '…' — the escaper's own quotes close the string            |
| `no-unsafe-query` — quint mysql-security.no-unsafe-query: ReqBody/Escape/Quoted/Inline/QueryOptions             | FN    | fixed  | FN: escapeId inside backticks — its backticks close the identifier                     |
| `require-tls` — mysql-security FP/FN review 2026-10-12, synthetic probe (an HTTPS agent beside the pool)        | FP    | fixed  | FP: another library's TLS options in a file that also imports mysql2                   |
| `require-tls` — mysql-security FP/FN review 2026-10-12, synthetic probe (BENCHMARK-CRITERIA B1)                 | FP    | fixed  | FP: a test file pointing at a local database                                           |
| `require-tls` — mysql-security FP/FN review 2026-10-12, synthetic probe (conditional ssl)                       | FN    | fixed  | FN: verification switched off in one arm of a ternary                                  |
| `require-tls` — mysql-security FP/FN review 2026-10-12, synthetic probe (ssl options bound first)               | FN    | fixed  | FN: the TLS options are bound to a constant first                                      |
| `require-tls` — mysql-security FP/FN review 2026-10-12, synthetic probe (ssl flag bound first)                  | FN    | fixed  | FN: TLS turned off through a constant                                                  |

**Test-first.** Every case above was run against a `git archive HEAD` copy of the sources (or, for the Quint-found ones, the tree before the fix) and failed there.

**Existing tests.** None of the pre-existing cases changed verdict. No registry case, corpus fixture or changeset was added.

## Deferred

None.
