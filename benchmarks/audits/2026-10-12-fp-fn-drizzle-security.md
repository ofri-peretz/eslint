# FP/FN audit: eslint-plugin-drizzle-security (2026-10-12)

The audit ran against the published `latest`. It adds 12 `FP:` and 9 `FN:` cases, each written failing first. The real-code scan now shows only true positives, and every Quint oracle case agrees with the rule.

Most fixes live in the shared factories in `@interlace/eslint-devkit` (`src/rule-creation/`), which this plugin configures; the plugin's own change is its sink and evidence configuration. The plugin depends on the published devkit, so **its 1.0.0 needs the devkit release that ships them**.

**Design constraint.** Verdicts come from AST structure, the scope manager, bounded same-file value following and relative imports read from disk (cached; the rule abstains when a module cannot be read). The receiver of a sink is judged by where it is written (`driver-origin.ts`), never by its name, and every review case binds `foo`/`bar`/`baz` so the rename litmus is part of the suite. The SDK-evidence gates are unchanged (`benchmarks/__tests__/sdk-gate-coverage.lock.test.ts` passes).

**Value and fragment positions** (`sql-position.ts`). A hole in a VALUE position (after `=`/`<`/`LIKE`, inside `'…'`, in `IN (…)`/`VALUES (…)`, after `LIMIT`) has a bind parameter as its safe alternative, so any value the file cannot prove fixed is reported. A hole in a FRAGMENT position (an identifier, an `ORDER BY` target, a whole clause) has none: query builders and migration helpers compose those from their own callers. There a hole is reported once the file traces it to the inbound request. Fixed means: literals, constants, enum and `const`-object members, numbers, `?` placeholder lists, fixed-map lookups, anchored-regex or fixed-list allowlist guards and ternaries, local helpers every `return` of which is fixed, and the driver's own escapers and fragments (an escaper only outside a quoted token).

**Partition with `secure-coding/no-sql-injection`.** A file that reaches the driver only through a relative import is checked for this plugin's library-specific sinks; the generic `query`/`execute` call there is `secure-coding`'s, so the two plugins never report the same line. Test files (`isTestFilePath`) are skipped by every rule, per BENCHMARK-CRITERIA §B1.

The values model has a third sink, `db.execute(sql`…`)`, whose holes are always bind parameters: it expects silence for every value and position, and the rule agrees.

## Method

- **Synthetic.** Snippets run against the published package in a scratch install: `sql` tagged templates, `sql.raw`, `sql.identifier`, `sql.join`, `sql.placeholder`, `db.execute/run/all/get/values` with SQL objects and strings, `insert().values(req.body)`, `update().set(req.body)`, `onConflictDoUpdate`/`onDuplicateKeyUpdate`, `delete(table)`/`update(table)` without `where`, across node-postgres, postgres-js, mysql2, better-sqlite3 and libsql drivers. The synthetic suite ends at FP=0 FN=0.
- **Real code.** Every file that imports the library, linted with all of the plugin's rules.
- **Quint oracle.** Two models, sampled and locked by `benchmarks/__tests__/quint-oracle.lock.test.ts` (see below).

| Repository                                                | Files   |
| --------------------------------------------------------- | ------- |
| payloadcms/payload (packages/drizzle, db-sqlite)          | 78      |
| drizzle-team/drizzle-orm (integration tests and examples) | 39      |
| **Total**                                                 | **117** |

## Real-code findings per rule

| Rule                            | Published | Verdict                                                                                                                                                     | After the fix | Verdict                                                                                                                                                                                                                                                       |
| ------------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| no-raw-identifier-interpolation | 532       | FP: drizzle-orm integration tests (now skipped as test files) and `sql` fragments over fixed table objects                                                  | 0             | —                                                                                                                                                                                                                                                             |
| no-unsafe-query                 | 40        | 30 FP (payload query builders composing identifiers in `buildPolymorphicJoinQuery.ts`, `traverseFields.ts`, `json.ts`, `migrateRelationships.ts`) and 10 TP | 10            | TP: payload's sqlite predefined migrations (`localize-status/index.ts:107/158/221/244/259`, `migrateMainGlobal.ts:37/45`, `migrateMainCollection.ts:33/41`, `db-sqlite/…/migrateLocalizeStatus.ts:80`) splice stored values inside quoted SQL string literals |
| no-unscoped-mutation            | 31        | FP: integration tests                                                                                                                                       | 0             | —                                                                                                                                                                                                                                                             |
| no-mass-assignment              | 0         | —                                                                                                                                                           | 0             | —                                                                                                                                                                                                                                                             |

No finding is duplicated by `secure-coding/no-sql-injection` or another plugin.

## Quint oracle

| Model                                                  | Distinct cases | Disagreements now |
| ------------------------------------------------------ | -------------- | ----------------- |
| `models/drizzle-security.no-unsafe-query.qnt`          | 2060           | 0                 |
| `models/drizzle-security.no-unsafe-query.plumbing.qnt` | 160            | 0                 |

The values model crosses source {literal, number, request field, parameter, env var} × transform {none, `trim()`, `Number()`, another library's `escape` (`validator.escape`), `join(',')`, allowlist ternary, fixed-map lookup} × position {`= ${v}`, `'${v}'`, `IN (${v})`, `ORDER BY ${v}`, `'…' + v`} × binding {inline, `const`, `let` reassigned, same-file helper} × sink. The plumbing model crosses import style {default, named, namespace, `require`, aliased} × call {plain, computed `db['m']`, optional `db?.m`, cast `(db as any).m`} × receiver {the driver, another library's client with the same method} × value × position. Renderers share `renderers/_sql.mjs`.

Disagreements, all resolved by reading the rendered case:

| Disagreement                                                                                                                                                                                                                        | Cases                            | Defect in             | Resolution                                                                                                                                                                                                                              |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| An allowlist ternary written inline in the template (`${['a','b'].includes(x) ? x : 'a'}`) reported: `sqlHoles` split the ternary into arms and judged the guarded arm alone                                                        | 37 on mysql, the first model run | rule (shared factory) | `sqlHoles` walks a ternary or `\|\|` only when an arm builds SQL text; a value-choosing ternary is judged whole, guard attached. Locked by `FP: an allowlist ternary written inline in the template` (mysql) and `sql-position.test.ts` |
| An escaped value inside `'…'` or an identifier quote stayed silent. The escaper's output brings its own quotes, which close the author's token: `name = '${mysql.escape(x)}'` with `x = "OR 1=1 OR"` reads `name = '' OR 1=1 OR ''` | 36 on mysql                      | rule (shared factory) | `isQuoted(preceding)` turns escapers off for that hole: an escaped value there is only as safe as what it escaped. Locked by the two `FN:` cases in the mysql `quint oracle 2026-10` block and `sql-safety.test.ts`                     |
| An escaped **constant** inside quotes expected reported                                                                                                                                                                             | 24 on mysql                      | model                 | The model's first draft ignored that `escape('admin')` is fixed text. Corrected: `Escape => p != Quoted or s == Literal or s == NumberConst`, with a comment. Pinned by `FP: an escaped constant inside quotes is still a constant`     |
| Another library's function of a constant (`validator.escape('admin')`) expected silent                                                                                                                                              | see the mysql audit; 63 here     | model                 | The rule cannot see what a foreign function returns, so its result is unproven in a value position (the documented contract). Corrected: `Lookalike => false`, with a comment                                                           |

Making request tracing follow any call (needed so `validator.escape(req.body.x)` and a same-file helper count as request-derived in a fragment position) briefly reported a map lookup keyed by a parameter field (`adapter.tableNameMap.get(…adapter.payload…)`, payload `getTableColumnFromPath.ts:801`) on the real-code re-scan. A method of the file's own data (`map.get`, `rows.find`) now carries only its receiver, not its arguments. Locked by `FP: a map lookup keyed by a parameter field returns what the map holds` (drizzle) and `sql-position.test.ts`.

The other six plugins' models were generated after those shared fixes landed. Their only disagreements were the look-alike model defect above; after it, every model of every plugin agrees with its rule.

## Findings

| Finding                                                                                                                                | FP/FN | Status | Test name                                                                   |
| -------------------------------------------------------------------------------------------------------------------------------------- | ----- | ------ | --------------------------------------------------------------------------- |
| `no-mass-assignment` — drizzle-security FP/FN review 2026-10-12, synthetic probe (db from a local module)                              | FN    | fixed  | FN: the instance from a relative module, the body from await request.json() |
| `no-mass-assignment` — drizzle-security FP/FN review 2026-10-12, synthetic probe (upsert set)                                          | FN    | fixed  | FN: an upsert's onConflictDoUpdate({ set })                                 |
| `no-mass-assignment` — drizzle-security FP/FN review 2026-10-12, synthetic probe (transaction handle)                                  | FN    | fixed  | FN: the transaction handle Drizzle passes to its callback                   |
| `no-raw-identifier-interpolation` — drizzle-security FP/FN review 2026-10-12, synthetic probe (table objects)                          | FP    | fixed  | FP: a table and its columns, built in this file                             |
| `no-raw-identifier-interpolation` — drizzle-security FP/FN review 2026-10-12, synthetic probe (schema module)                          | FP    | fixed  | FP: a table imported from the schema module                                 |
| `no-raw-identifier-interpolation` — payloadcms/payload:packages/drizzle/src/createGlobalVersion.ts:61                                  | FP    | fixed  | FP: a table read from a registry and used with columns                      |
| `no-raw-identifier-interpolation` — drizzle-security FP/FN review 2026-10-12, synthetic probe (direction fragments)                    | FP    | fixed  | FP: a direction chosen between two sql fragments                            |
| `no-raw-identifier-interpolation` — drizzle-security FP/FN review 2026-10-12, synthetic probe (subquery)                               | FP    | fixed  | FP: a named subquery                                                        |
| `no-raw-identifier-interpolation` — drizzle-security FP/FN review 2026-10-12, synthetic probe (renamed sql import)                     | FN    | fixed  | FN: the sql tag imported under another name                                 |
| `no-unsafe-query` — payload:packages/drizzle/src/queries/getTableColumnFromPath.ts:801                                                 | FP    | fixed  | FP: a map lookup keyed by a parameter field returns what the map holds      |
| `no-unsafe-query` — drizzle-security FP/FN review 2026-10-12, synthetic probe (constant in sql.raw)                                    | FP    | fixed  | FP: sql.raw over a constant                                                 |
| `no-unsafe-query` — payloadcms/payload:packages/drizzle/src/find/buildPolymorphicJoinQuery.ts:169                                      | FP    | fixed  | FP: quoted identifiers composed into sql.raw                                |
| `no-unsafe-query` — payloadcms/payload:packages/drizzle/src/utilities/json.ts:37                                                       | FP    | fixed  | FP: a key checked against an anchored allowlist pattern first               |
| `no-unsafe-query` — payloadcms/payload:packages/drizzle/src/postgres/predefinedMigrations/v2-v3/migrateRelationships.ts:75             | FP    | fixed  | FP: a whole statement a migration helper composed                           |
| `no-unsafe-query` — drizzle-security FP/FN review 2026-10-12, synthetic probe (plain-string execute)                                   | FN    | fixed  | FN: a plain string handed to execute()                                      |
| `no-unsafe-query` — drizzle-security FP/FN review 2026-10-12, synthetic probe (sql.raw of request data)                                | FN    | fixed  | FN: sql.raw over a value read from the request body                         |
| `no-unscoped-mutation` — drizzle-security FP/FN review 2026-10-12, synthetic probe (Map.delete named db)                               | FP    | fixed  | FP: a Map named like a database handle                                      |
| `no-unscoped-mutation` — drizzle-orm integration tests (drizzle-team/drizzle-orm:integration-tests/tests/sqlite/sqlite-common.ts:1899) | FP    | fixed  | FP: a test's full-table update                                              |
| `no-unscoped-mutation` — drizzle-security FP/FN review 2026-10-12, synthetic probe (db and table from local modules)                   | FN    | fixed  | FN: the instance and the table from relative modules                        |
| `no-unscoped-mutation` — drizzle-security FP/FN review 2026-10-12, synthetic probe (transaction handle)                                | FN    | fixed  | FN: the transaction handle Drizzle passes to its callback                   |
| `no-unscoped-mutation` — drizzle-security FP/FN review 2026-10-12, synthetic probe (untraceable handle, known table)                   | FN    | fixed  | FN: an untraceable handle deleting a table the file built                   |

**Test-first.** Every case above was run against a `git archive HEAD` copy of the sources (or, for the Quint-found ones, the tree before the fix) and failed there.

**Existing tests.** Moved, with a comment beside each: the mass-assignment and unscoped-mutation fixtures bind `db` to `drizzle(…)`; the module-gate lock's SDK import became `import { drizzle, sql } from 'drizzle-orm'`. No registry case, corpus fixture or changeset was added.

## Deferred

None.
