# FP/FN audit: eslint-plugin-sqlite-security (2026-10-12)

The audit ran against the published `latest`. It adds 5 `FP:` and 6 `FN:` cases, each written failing first. The real-code scan now shows only true positives, and every Quint oracle case agrees with the rule.

Most fixes live in the shared factories in `@interlace/eslint-devkit` (`src/rule-creation/`), which this plugin configures; the plugin's own change is its sink and evidence configuration. The plugin depends on the published devkit, so **its 1.0.0 needs the devkit release that ships them**.

**Design constraint.** Verdicts come from AST structure, the scope manager, bounded same-file value following and relative imports read from disk (cached; the rule abstains when a module cannot be read). The receiver of a sink is judged by where it is written (`driver-origin.ts`), never by its name, and every review case binds `foo`/`bar`/`baz` so the rename litmus is part of the suite. The SDK-evidence gates are unchanged (`benchmarks/__tests__/sdk-gate-coverage.lock.test.ts` passes).

**Value and fragment positions** (`sql-position.ts`). A hole in a VALUE position (after `=`/`<`/`LIKE`, inside `'…'`, in `IN (…)`/`VALUES (…)`, after `LIMIT`) has a bind parameter as its safe alternative, so any value the file cannot prove fixed is reported. A hole in a FRAGMENT position (an identifier, an `ORDER BY` target, a whole clause) has none: query builders and migration helpers compose those from their own callers. There a hole is reported once the file traces it to the inbound request. Fixed means: literals, constants, enum and `const`-object members, numbers, `?` placeholder lists, fixed-map lookups, anchored-regex or fixed-list allowlist guards and ternaries, local helpers every `return` of which is fixed, and the driver's own escapers and fragments (an escaper only outside a quoted token).

**Partition with `secure-coding/no-sql-injection`.** A file that reaches the driver only through a relative import is checked for this plugin's library-specific sinks; the generic `query`/`execute` call there is `secure-coding`'s, so the two plugins never report the same line. Test files (`isTestFilePath`) are skipped by every rule, per BENCHMARK-CRITERIA §B1.

**Missing detections the plugin's scope implies** (the brief asked to check hard): the published rule knew only better-sqlite3 and sqlite3 `run/all/get/exec/prepare`. It now covers sqlite3 `each`, better-sqlite3 `pragma` (a fragment sink), node:sqlite, bun:sqlite `query`, the `sqlite` promise wrapper and `@libsql/client` `execute` with its options form, and a database handle imported from a relative module. Each has an `FN:` case below.

## Method

- **Synthetic.** Snippets run against the published package in a scratch install: better-sqlite3 (`prepare().run/all/get/iterate`, `exec`, `pragma`), sqlite3 (`run/all/get/each/exec`), node:sqlite `DatabaseSync`, bun:sqlite `query`, the `sqlite` promise wrapper and `@libsql/client` `execute` with the `{ sql, args }` form; handles from relative modules; `Map.get('select-…')`, `RegExp.exec`, `child_process.exec` and GraphQL beside the driver. The synthetic suite ends at FP=0 FN=0.
- **Real code.** Every file that imports the library, linted with all of the plugin's rules.
- **Quint oracle.** Two models, sampled and locked by `benchmarks/__tests__/quint-oracle.lock.test.ts` (see below).

| Repository                                            | Files  |
| ----------------------------------------------------- | ------ |
| WiseLibs/better-sqlite3 (docs code blocks, extracted) | 26     |
| WiseLibs/better-sqlite3 (source)                      | 1      |
| actualbudget/actual                                   | 2      |
| louislam/uptime-kuma                                  | 1      |
| **Total**                                             | **30** |

## Real-code findings per rule

| Rule            | Published | Verdict                                                                                                 | After the fix | Verdict |
| --------------- | --------- | ------------------------------------------------------------------------------------------------------- | ------------- | ------- |
| no-unsafe-query | 1         | FP: uptime-kuma `server/database.js:1056` calls another library's `exec()` in a file that loads sqlite3 | 0             | —       |

No finding is duplicated by `secure-coding/no-sql-injection` or another plugin.

## Quint oracle

| Model                                                 | Distinct cases | Disagreements now |
| ----------------------------------------------------- | -------------- | ----------------- |
| `models/sqlite-security.no-unsafe-query.qnt`          | 2060           | 0                 |
| `models/sqlite-security.no-unsafe-query.plumbing.qnt` | 160            | 0                 |

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

| Finding                                                                                                   | FP/FN | Status | Test name                                                      |
| --------------------------------------------------------------------------------------------------------- | ----- | ------ | -------------------------------------------------------------- |
| `no-unsafe-query` — sqlite-security FP/FN review 2026-10-12, synthetic probe (constant table name)        | FP    | fixed  | FP: a constant table name and a ? placeholder list             |
| `no-unsafe-query` — sqlite-security FP/FN review 2026-10-12, synthetic probe (numeric limit)              | FP    | fixed  | FP: a limit forced to a number                                 |
| `no-unsafe-query` — sqlite-security FP/FN review 2026-10-12, synthetic probe (Map.get with a select- key) | FP    | fixed  | FP: a cache key that starts with a SQL word is not a statement |
| `no-unsafe-query` — louislam/uptime-kuma:server/database.js:1056                                          | FP    | fixed  | FP: another library's exec() in a file that loads sqlite3      |
| `no-unsafe-query` — sqlite-security FP/FN review 2026-10-12, synthetic probe (allowlist map)              | FP    | fixed  | FP: a lookup through a fixed map is an allowlist               |
| `no-unsafe-query` — sqlite-security FP/FN review 2026-10-12, synthetic probe (handle from a local module) | FN    | fixed  | FN: the database handle comes from a relative module           |
| `no-unsafe-query` — sqlite-security FP/FN review 2026-10-12, synthetic probe (better-sqlite3 pragma)      | FN    | fixed  | FN: better-sqlite3 pragma() with an interpolated operand       |
| `no-unsafe-query` — sqlite-security FP/FN review 2026-10-12, synthetic probe (sqlite3 each)               | FN    | fixed  | FN: sqlite3 Database#each()                                    |
| `no-unsafe-query` — sqlite-security FP/FN review 2026-10-12, synthetic probe (bun:sqlite query)           | FN    | fixed  | FN: bun:sqlite Database#query()                                |
| `no-unsafe-query` — sqlite-security FP/FN review 2026-10-12, synthetic probe (sqlite promise wrapper)     | FN    | fixed  | FN: the `sqlite` promise wrapper's get()                       |
| `no-unsafe-query` — sqlite-security FP/FN review 2026-10-12, synthetic probe (libsql execute)             | FN    | fixed  | FN: @libsql/client execute() with the { sql } options form     |

**Test-first.** Every case above was run against a `git archive HEAD` copy of the sources (or, for the Quint-found ones, the tree before the fix) and failed there.

**Existing tests.** None of the pre-existing cases changed verdict. No registry case, corpus fixture or changeset was added.

## Deferred

None.
