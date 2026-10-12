# FP/FN audit: eslint-plugin-knex-security (2026-10-12)

The audit ran against the published `latest`. It adds 18 `FP:` and 20 `FN:` cases, each written failing first. The real-code scan now shows only true positives, and every Quint oracle case agrees with the rule.

Most fixes live in the shared factories in `@interlace/eslint-devkit` (`src/rule-creation/`), which this plugin configures; the plugin's own change is its sink and evidence configuration. The plugin depends on the published devkit, so **its 1.0.0 needs the devkit release that ships them**.

**Design constraint.** Verdicts come from AST structure, the scope manager, bounded same-file value following and relative imports read from disk (cached; the rule abstains when a module cannot be read). The receiver of a sink is judged by where it is written (`driver-origin.ts`), never by its name, and every review case binds `foo`/`bar`/`baz` so the rename litmus is part of the suite. The SDK-evidence gates are unchanged (`benchmarks/__tests__/sdk-gate-coverage.lock.test.ts` passes).

**Value and fragment positions** (`sql-position.ts`). A hole in a VALUE position (after `=`/`<`/`LIKE`, inside `'…'`, in `IN (…)`/`VALUES (…)`, after `LIMIT`) has a bind parameter as its safe alternative, so any value the file cannot prove fixed is reported. A hole in a FRAGMENT position (an identifier, an `ORDER BY` target, a whole clause) has none: query builders and migration helpers compose those from their own callers. There a hole is reported once the file traces it to the inbound request. Fixed means: literals, constants, enum and `const`-object members, numbers, `?` placeholder lists, fixed-map lookups, anchored-regex or fixed-list allowlist guards and ternaries, local helpers every `return` of which is fixed, and the driver's own escapers and fragments (an escaper only outside a quoted token).

**Partition with `secure-coding/no-sql-injection`.** A file that reaches the driver only through a relative import is checked for this plugin's library-specific sinks; the generic `query`/`execute` call there is `secure-coding`'s, so the two plugins never report the same line. Test files (`isTestFilePath`) are skipped by every rule, per BENCHMARK-CRITERIA §B1.

## Method

- **Synthetic.** Snippets run against the published package in a scratch install: knex `raw` with `?`/`??` bindings and named bindings, `whereRaw`/`havingRaw`/`orderByRaw`/`groupByRaw`/`joinRaw`/`fromRaw`, `knex.ref`, `Knex.Raw` values, knexfiles (`{ client, connection }`), migrations and seeds exporting `up`/`down`/`seed`, `insert(req.body)`/`update(req.body)`/`merge`, `del()` and `update()` without `where`. The synthetic suite ends at FP=0 FN=0.
- **Real code.** Every file that imports the library, linted with all of the plugin's rules.
- **Quint oracle.** Two models, sampled and locked by `benchmarks/__tests__/quint-oracle.lock.test.ts` (see below).

| Repository                 | Files   |
| -------------------------- | ------- |
| directus/directus (api)    | 242     |
| laurent22/joplin (server)  | 7       |
| Budibase/budibase (server) | 6       |
| louislam/uptime-kuma       | 3       |
| knex/knex (examples)       | 2       |
| a Next.js + knex example   | 1       |
| **Total**                  | **261** |

## Real-code findings per rule

| Rule                     | Published | Verdict                                                                                                                                                                                                                                          | After the fix | Verdict                                                                                                                          |
| ------------------------ | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| no-unsafe-query          | 66        | FP: directus dialect helpers (`helpers/fn/dialects/*.ts`, `helpers/schema/dialects/*.ts`, `run-ast/utils/get-column.ts`) and joplin `BaseModel.ts`/`db.ts` compose identifiers and clauses from their own callers; budibase's are test utilities | 2             | TP: directus `helpers/fn/dialects/oracle.ts:82` and `:88` splice `jsonPath` inside a quoted SQL string literal, a value position |
| no-unscoped-mutation     | 11        | FP: directus migrations (`up`/`down`) and a schema helper rewrite whole tables on purpose                                                                                                                                                        | 0             | —                                                                                                                                |
| no-hardcoded-credentials | 3         | FP: budibase test utilities                                                                                                                                                                                                                      | 0             | —                                                                                                                                |
| require-tls              | 2         | FP: budibase `tests/utils/postgres.ts` test database                                                                                                                                                                                             | 0             | —                                                                                                                                |
| no-mass-assignment       | 0         | —                                                                                                                                                                                                                                                | 0             | —                                                                                                                                |

No finding is duplicated by `secure-coding/no-sql-injection` or another plugin.

## Quint oracle

| Model                                               | Distinct cases | Disagreements now |
| --------------------------------------------------- | -------------- | ----------------- |
| `models/knex-security.no-unsafe-query.qnt`          | 2060           | 0                 |
| `models/knex-security.no-unsafe-query.plumbing.qnt` | 160            | 0                 |

The values model crosses source {literal, number, request field, parameter, env var} × transform {none, `trim()`, `Number()`, another library's `escape` (`validator.escape`), `join(',')`, allowlist ternary, fixed-map lookup} × position {`= ${v}`, `'${v}'`, `IN (${v})`, `ORDER BY ${v}`, `'…' + v`} × binding {inline, `const`, `let` reassigned, same-file helper} × sink. The plumbing model crosses import style {default, named, namespace, `require`, aliased} × call {plain, computed `db['m']`, optional `db?.m`, cast `(db as any).m`} × receiver {the driver, another library's client with the same method} × value × position. Renderers share `renderers/_sql.mjs`.

Disagreements, all resolved by reading the rendered case:

| Disagreement                                                                                                                                                                                                                        | Cases                            | Defect in             | Resolution                                                                                                                                                                                                                              |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| An allowlist ternary written inline in the template (`${['a','b'].includes(x) ? x : 'a'}`) reported: `sqlHoles` split the ternary into arms and judged the guarded arm alone                                                        | 37 on mysql, the first model run | rule (shared factory) | `sqlHoles` walks a ternary or `\|\|` only when an arm builds SQL text; a value-choosing ternary is judged whole, guard attached. Locked by `FP: an allowlist ternary written inline in the template` (mysql) and `sql-position.test.ts` |
| An escaped value inside `'…'` or an identifier quote stayed silent. The escaper's output brings its own quotes, which close the author's token: `name = '${mysql.escape(x)}'` with `x = "OR 1=1 OR"` reads `name = '' OR 1=1 OR ''` | 36 on mysql                      | rule (shared factory) | `isQuoted(preceding)` turns escapers off for that hole: an escaped value there is only as safe as what it escaped. Locked by the two `FN:` cases in the mysql `quint oracle 2026-10` block and `sql-safety.test.ts`                     |
| An escaped **constant** inside quotes expected reported                                                                                                                                                                             | 24 on mysql                      | model                 | The model's first draft ignored that `escape('admin')` is fixed text. Corrected: `Escape => p != Quoted or s == Literal or s == NumberConst`, with a comment. Pinned by `FP: an escaped constant inside quotes is still a constant`     |
| Another library's function of a constant (`validator.escape('admin')`) expected silent                                                                                                                                              | see the mysql audit; 93 here     | model                 | The rule cannot see what a foreign function returns, so its result is unproven in a value position (the documented contract). Corrected: `Lookalike => false`, with a comment                                                           |

Making request tracing follow any call (needed so `validator.escape(req.body.x)` and a same-file helper count as request-derived in a fragment position) briefly reported a map lookup keyed by a parameter field (`adapter.tableNameMap.get(…adapter.payload…)`, payload `getTableColumnFromPath.ts:801`) on the real-code re-scan. A method of the file's own data (`map.get`, `rows.find`) now carries only its receiver, not its arguments. Locked by `FP: a map lookup keyed by a parameter field returns what the map holds` (drizzle) and `sql-position.test.ts`.

The other six plugins' models were generated after those shared fixes landed. Their only disagreements were the look-alike model defect above; after it, every model of every plugin agrees with its rule.

## Findings

| Finding                                                                                                               | FP/FN | Status | Test name                                                         |
| --------------------------------------------------------------------------------------------------------------------- | ----- | ------ | ----------------------------------------------------------------- |
| `no-hardcoded-credentials` — Budibase/budibase:packages/server/src/integrations/tests/utils/mysql.ts:54               | FP    | fixed  | FP: a test utility pointing at a throwaway container              |
| `no-hardcoded-credentials` — knex-security FP/FN review 2026-10-12, synthetic probe (knexfile)                        | FN    | fixed  | FN: a knexfile — knex config with no knex import                  |
| `no-hardcoded-credentials` — knex-security FP/FN review 2026-10-12, synthetic probe (literal fallback)                | FN    | fixed  | FN: a literal fallback behind the environment variable            |
| `no-mass-assignment` — knex-security FP/FN review 2026-10-12, synthetic probe (a Map named like a handle)             | FP    | fixed  | FP: a Map named like a database handle                            |
| `no-mass-assignment` — knex-security FP/FN review 2026-10-12, synthetic probe (renamed handle)                        | FN    | fixed  | FN: a handle named anything at all, request named anything at all |
| `no-mass-assignment` — knex-security FP/FN review 2026-10-12, synthetic probe (transaction handle)                    | FN    | fixed  | FN: the transaction handle knex passes to its callback            |
| `no-mass-assignment` — knex-security FP/FN review 2026-10-12, synthetic probe (rest of the payload)                   | FN    | fixed  | FN: the rest of a destructured payload                            |
| `no-mass-assignment` — knex-security FP/FN review 2026-10-12, synthetic probe (upsert merge)                          | FN    | fixed  | FN: an upsert's merge() half                                      |
| `no-mass-assignment` — knex-security FP/FN review 2026-10-12, synthetic probe (handle from a local module)            | FN    | fixed  | FN: the handle comes from a relative module                       |
| `no-unsafe-query` — directus/directus:api/src/database/helpers/schema/dialects/postgres.ts:73                         | FP    | fixed  | FP: a ternary between two SQL keywords                            |
| `no-unsafe-query` — directus/directus:api/src/database/helpers/schema/dialects/mysql.ts:28                            | FP    | fixed  | FP: a ?? identifier-placeholder list                              |
| `no-unsafe-query` — directus/directus:api/src/database/helpers/fn/dialects/postgres.ts:17                             | FP    | fixed  | FP: a local helper that only returns fixed fragments              |
| `no-unsafe-query` — directus/directus:api/src/database/helpers/fn/types.ts:105                                        | FP    | fixed  | FP: a sub-statement a caller composed, wrapped in parentheses     |
| `no-unsafe-query` — directus/directus:api/src/database/run-ast/lib/get-db-query.ts:206                                | FP    | fixed  | FP: an ORDER BY list a caller composed from ?? placeholders       |
| `no-unsafe-query` — directus/directus:api/src/database/run-ast/utils/get-column.ts:86                                 | FP    | fixed  | FP: a value the program types as knex's own Raw                   |
| `no-unsafe-query` — laurent22/joplin:packages/server/src/models/BaseModel.ts:376                                      | FP    | fixed  | FP: a savepoint name the class generates                          |
| `no-unsafe-query` — laurent22/joplin:packages/server/src/db.ts:165                                                    | FP    | fixed  | FP: a migration helper composing the table and column it is given |
| `no-unsafe-query` — knex-security FP/FN review 2026-10-12, synthetic probe (fixed column list)                        | FP    | fixed  | FP: a fixed column list joined into the select list               |
| `no-unsafe-query` — knex-security FP/FN review 2026-10-12, synthetic probe (allowlisted sort column)                  | FP    | fixed  | FP: a sort column chosen through an allowlist ternary             |
| `no-unsafe-query` — Budibase/budibase:packages/server/src/integrations/tests/utils/mysql.ts:61                        | FP    | fixed  | FP: a test utility creating a scratch database                    |
| `no-unsafe-query` — knex-security FP/FN review 2026-10-12, synthetic probe (whereRaw)                                 | FN    | fixed  | FN: whereRaw with an interpolated value                           |
| `no-unsafe-query` — knex-security FP/FN review 2026-10-12, synthetic probe (orderByRaw)                               | FN    | fixed  | FN: orderByRaw with a sort column from the request                |
| `no-unsafe-query` — knex-security FP/FN review 2026-10-12, synthetic probe (havingRaw)                                | FN    | fixed  | FN: havingRaw with a value after a comparison                     |
| `no-unsafe-query` — knex-security FP/FN review 2026-10-12, synthetic probe (joinRaw / fromRaw)                        | FN    | fixed  | FN: joinRaw and fromRaw                                           |
| `no-unsafe-query` — knex-security FP/FN review 2026-10-12, synthetic probe (handle from a local module)               | FN    | fixed  | FN: the knex handle comes from a relative module                  |
| `no-unsafe-query` — knex-security FP/FN review 2026-10-12, synthetic probe (objection raw)                            | FN    | fixed  | FN: objection's standalone raw()                                  |
| `no-unscoped-mutation` — directus/directus:api/src/database/migrations/20211118A-add-notifications.ts:23              | FP    | fixed  | FP: a backfill inside a knex migration's up()                     |
| `no-unscoped-mutation` — knex-security FP/FN review 2026-10-12, synthetic probe (seed contract)                       | FP    | fixed  | FP: the del() that starts a knex seed                             |
| `no-unscoped-mutation` — knex-security FP/FN review 2026-10-12, synthetic probe (builder scoped in another statement) | FP    | fixed  | FP: a builder scoped by another statement before the delete       |
| `no-unscoped-mutation` — knex-security FP/FN review 2026-10-12, synthetic probe (builder handed to a scoping helper)  | FP    | fixed  | FP: a builder handed to a helper that may scope it                |
| `no-unscoped-mutation` — knex-security FP/FN review 2026-10-12, synthetic probe (renamed handle)                      | FN    | fixed  | FN: a handle named anything at all                                |
| `no-unscoped-mutation` — knex-security FP/FN review 2026-10-12, synthetic probe (from() chain)                        | FN    | fixed  | FN: a chain that names its table with from()                      |
| `no-unscoped-mutation` — knex-security FP/FN review 2026-10-12, synthetic probe (transaction handle)                  | FN    | fixed  | FN: the transaction handle knex passes to its callback            |
| `no-unscoped-mutation` — knex-security FP/FN review 2026-10-12, synthetic probe (typed parameter)                     | FN    | fixed  | FN: a parameter typed as a knex handle                            |
| `no-unscoped-mutation` — knex-security FP/FN review 2026-10-12, synthetic probe (handle from a local module)          | FN    | fixed  | FN: the handle comes from a relative module                       |
| `require-tls` — Budibase/budibase:packages/server/src/integrations/tests/utils/postgres.ts:42                         | FP    | fixed  | FP: a test utility pointing at a local container                  |
| `require-tls` — knex-security FP/FN review 2026-10-12, synthetic probe (knexfile)                                     | FN    | fixed  | FN: a knexfile — knex config with no knex import                  |
| `require-tls` — knex-security FP/FN review 2026-10-12, synthetic probe (ssl bound first)                              | FN    | fixed  | FN: the TLS options are bound to a constant first                 |

**Test-first.** Every case above was run against a `git archive HEAD` copy of the sources (or, for the Quint-found ones, the tree before the fix) and failed there.

**Existing tests.** Moved, with a comment beside each: the credentials and TLS cases that asserted "silent without a knex import" now report, because a knexfile shape (`{ client: 'pg', connection }`) is the driver's own config-file contract; each keeps a valid twin without that shape. The mass-assignment fixtures now bind their receiver to a knex instance (`const db = knex(…)`), since an unbound `db` is no longer assumed to be knex. No registry case, corpus fixture or changeset was added.

## Deferred

None.
