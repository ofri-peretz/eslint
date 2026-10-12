# FP/FN audit: eslint-plugin-typeorm-security (2026-10-12)

The audit ran against the published `latest`. It adds 4 `FP:` and 15 `FN:` cases, each written failing first. The real-code scan now shows only true positives, and every Quint oracle case agrees with the rule.

Most fixes live in the shared factories in `@interlace/eslint-devkit` (`src/rule-creation/`), which this plugin configures; the plugin's own change is its sink and evidence configuration. The plugin depends on the published devkit, so **its 1.0.0 needs the devkit release that ships them**.

**Design constraint.** Verdicts come from AST structure, the scope manager, bounded same-file value following and relative imports read from disk (cached; the rule abstains when a module cannot be read). The receiver of a sink is judged by where it is written (`driver-origin.ts`), never by its name, and every review case binds `foo`/`bar`/`baz` so the rename litmus is part of the suite. The SDK-evidence gates are unchanged (`benchmarks/__tests__/sdk-gate-coverage.lock.test.ts` passes).

**Value and fragment positions** (`sql-position.ts`). A hole in a VALUE position (after `=`/`<`/`LIKE`, inside `'…'`, in `IN (…)`/`VALUES (…)`, after `LIMIT`) has a bind parameter as its safe alternative, so any value the file cannot prove fixed is reported. A hole in a FRAGMENT position (an identifier, an `ORDER BY` target, a whole clause) has none: query builders and migration helpers compose those from their own callers. There a hole is reported once the file traces it to the inbound request. Fixed means: literals, constants, enum and `const`-object members, numbers, `?` placeholder lists, fixed-map lookups, anchored-regex or fixed-list allowlist guards and ternaries, local helpers every `return` of which is fixed, and the driver's own escapers and fragments (an escaper only outside a quoted token).

**Partition with `secure-coding/no-sql-injection`.** A file that reaches the driver only through a relative import is checked for this plugin's library-specific sinks; the generic `query`/`execute` call there is `secure-coding`'s, so the two plugins never report the same line. Test files (`isTestFilePath`) are skipped by every rule, per BENCHMARK-CRITERIA §B1.

## Method

- **Synthetic.** Snippets run against the published package in a scratch install: `DataSource.query`, `manager.query`, `createQueryBuilder().where/andWhere/orWhere/having/orderBy/addOrderBy/groupBy/select/leftJoin…` with and without parameters, `Raw((alias) => …)`, `driver.escape`, `repository.save/create/insert/update/upsert(req.body)`, `ormconfig` shapes and `@nestjs/typeorm` `forRoot` options. The synthetic suite ends at FP=0 FN=0.
- **Real code.** Every file that imports the library, linted with all of the plugin's rules.
- **Quint oracle.** Two models, sampled and locked by `benchmarks/__tests__/quint-oracle.lock.test.ts` (see below).

| Repository                          | Files  |
| ----------------------------------- | ------ |
| nestjs/nest (sample/05-sql-typeorm) | 13     |
| typeorm/typescript-express-example  | 6      |
| **Total**                           | **19** |

## Real-code findings per rule

| Rule                     | Published | Verdict                                                                    | After the fix | Verdict                                                                                                     |
| ------------------------ | --------- | -------------------------------------------------------------------------- | ------------- | ----------------------------------------------------------------------------------------------------------- |
| no-hardcoded-credentials | 0         | —                                                                          | 1             | TP: nest `sample/05-sql-typeorm/src/app.module.ts:12` commits `password: 'root'` in `TypeOrmModule.forRoot` |
| no-mass-assignment       | 1         | TP: `PostSaveAction.ts:14` saves `request.body` straight into a repository | 1             | TP (same line)                                                                                              |
| no-unsafe-query          | 0         | —                                                                          | 0             | —                                                                                                           |
| require-tls              | 0         | —                                                                          | 0             | —                                                                                                           |

No finding is duplicated by `secure-coding/no-sql-injection` or another plugin.

## Quint oracle

| Model                                                  | Distinct cases | Disagreements now |
| ------------------------------------------------------ | -------------- | ----------------- |
| `models/typeorm-security.no-unsafe-query.qnt`          | 2320           | 0                 |
| `models/typeorm-security.no-unsafe-query.plumbing.qnt` | 160            | 0                 |

The values model crosses source {literal, number, request field, parameter, env var} × transform {none, `trim()`, `Number()`, another library's `escape` (`validator.escape`), `join(',')`, allowlist ternary, fixed-map lookup, `dataSource.driver.escape(v)`} × position {`= ${v}`, `'${v}'`, `IN (${v})`, `ORDER BY ${v}`, `'…' + v`} × binding {inline, `const`, `let` reassigned, same-file helper} × sink. The plumbing model crosses import style {default, named, namespace, `require`, aliased} × call {plain, computed `db['m']`, optional `db?.m`, cast `(db as any).m`} × receiver {the driver, another library's client with the same method} × value × position. Renderers share `renderers/_sql.mjs`.

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

| Finding                                                                                                                | FP/FN | Status | Test name                                                                         |
| ---------------------------------------------------------------------------------------------------------------------- | ----- | ------ | --------------------------------------------------------------------------------- |
| `no-hardcoded-credentials` — typeorm-security FP/FN review 2026-10-12, synthetic probe (BENCHMARK-CRITERIA B1)         | FP    | fixed  | FP: a test data source                                                            |
| `no-hardcoded-credentials` — nestjs/nest:sample/05-sql-typeorm/src/app.module.ts:12                                    | FN    | fixed  | FN: TypeOrmModule.forRoot in a NestJS module                                      |
| `no-hardcoded-credentials` — typeorm-security FP/FN review 2026-10-12, synthetic probe (ormconfig.js)                  | FN    | fixed  | FN: an ormconfig.js with no typeorm import                                        |
| `no-mass-assignment` — typeorm-security FP/FN review 2026-10-12, synthetic probe (a hash named like a repository)      | FP    | fixed  | FP: a crypto hash named like a repository                                         |
| `no-mass-assignment` — typeorm-security FP/FN review 2026-10-12, synthetic probe (injected repository, any name)       | FN    | fixed  | FN: an injected Repository&lt;T>, named anything                                  |
| `no-mass-assignment` — typeorm/typescript-express-example:src/controller/PostSaveAction.ts:14                          | FN    | fixed  | FN: a repository from the DataSource module, in a file that never imports typeorm |
| `no-mass-assignment` — typeorm-security FP/FN review 2026-10-12, synthetic probe (EntityManager.save(Entity, body))    | FN    | fixed  | FN: EntityManager.save(Entity, body) and a transaction manager                    |
| `no-mass-assignment` — typeorm-security FP/FN review 2026-10-12, synthetic probe (Object.assign then save)             | FN    | fixed  | FN: the request copied onto an entity, then saved                                 |
| `no-mass-assignment` — typeorm-security FP/FN review 2026-10-12, synthetic probe (Object.assign onto a created entity) | FN    | fixed  | FN: Object.assign onto an entity the repository created                           |
| `no-unsafe-query` — typeorm-security FP/FN review 2026-10-12, synthetic probe (fixed id list)                          | FP    | fixed  | FP: a fixed list joined into IN (…)                                               |
| `no-unsafe-query` — typeorm-security FP/FN review 2026-10-12, synthetic probe (another client's query)                 | FP    | fixed  | FP: a GraphQL client's query() in a file that imports TypeORM                     |
| `no-unsafe-query` — typeorm-security FP/FN review 2026-10-12, synthetic probe (QueryBuilder.where)                     | FN    | fixed  | FN: a value interpolated into QueryBuilder.where()                                |
| `no-unsafe-query` — typeorm-security FP/FN review 2026-10-12, synthetic probe (andWhere through a bound builder)       | FN    | fixed  | FN: andWhere() on a builder bound to a constant                                   |
| `no-unsafe-query` — typeorm-security FP/FN review 2026-10-12, synthetic probe (join condition)                         | FN    | fixed  | FN: the condition argument of leftJoinAndSelect()                                 |
| `no-unsafe-query` — typeorm-security FP/FN review 2026-10-12, synthetic probe (orderBy from the request)               | FN    | fixed  | FN: orderBy() with a column taken from the request                                |
| `no-unsafe-query` — typeorm-security FP/FN review 2026-10-12, synthetic probe (Raw operator)                           | FN    | fixed  | FN: a value spliced into a Raw() find operator                                    |
| `no-unsafe-query` — typeorm-security FP/FN review 2026-10-12, synthetic probe (renamed Raw import)                     | FN    | fixed  | FN: a renamed Raw import is still Raw                                             |
| `require-tls` — typeorm-security FP/FN review 2026-10-12, synthetic probe (NestJS forRoot)                             | FN    | fixed  | FN: TypeOrmModule.forRoot with verification off                                   |
| `require-tls` — typeorm-security FP/FN review 2026-10-12, synthetic probe (ormconfig.js)                               | FN    | fixed  | FN: an ormconfig.js with TLS off                                                  |

**Test-first.** Every case above was run against a `git archive HEAD` copy of the sources (or, for the Quint-found ones, the tree before the fix) and failed there.

**Existing tests.** Moved, with a comment beside each: the "silent without a typeorm import" credentials and TLS cases now report on an `ormconfig` shape, each with a valid twin without it; mass-assignment fixtures bind their receiver to a repository. No registry case, corpus fixture or changeset was added.

## Deferred

None.
