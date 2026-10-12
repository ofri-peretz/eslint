# FP/FN audit: eslint-plugin-sequelize-security (2026-10-12)

The audit ran against the published `latest`. It adds 6 `FP:` and 11 `FN:` cases, each written failing first. The real-code scan now shows only true positives, and every Quint oracle case agrees with the rule.

Most fixes live in the shared factories in `@interlace/eslint-devkit` (`src/rule-creation/`), which this plugin configures; the plugin's own change is its sink and evidence configuration. The plugin depends on the published devkit, so **its 1.0.0 needs the devkit release that ships them**.

**Design constraint.** Verdicts come from AST structure, the scope manager, bounded same-file value following and relative imports read from disk (cached; the rule abstains when a module cannot be read). The receiver of a sink is judged by where it is written (`driver-origin.ts`), never by its name, and every review case binds `foo`/`bar`/`baz` so the rename litmus is part of the suite. The SDK-evidence gates are unchanged (`benchmarks/__tests__/sdk-gate-coverage.lock.test.ts` passes).

**Value and fragment positions** (`sql-position.ts`). A hole in a VALUE position (after `=`/`<`/`LIKE`, inside `'…'`, in `IN (…)`/`VALUES (…)`, after `LIMIT`) has a bind parameter as its safe alternative, so any value the file cannot prove fixed is reported. A hole in a FRAGMENT position (an identifier, an `ORDER BY` target, a whole clause) has none: query builders and migration helpers compose those from their own callers. There a hole is reported once the file traces it to the inbound request. Fixed means: literals, constants, enum and `const`-object members, numbers, `?` placeholder lists, fixed-map lookups, anchored-regex or fixed-list allowlist guards and ternaries, local helpers every `return` of which is fixed, and the driver's own escapers and fragments (an escaper only outside a quoted token).

**Partition with `secure-coding/no-sql-injection`.** A file that reaches the driver only through a relative import is checked for this plugin's library-specific sinks; the generic `query`/`execute` call there is `secure-coding`'s, so the two plugins never report the same line. Test files (`isTestFilePath`) are skipped by every rule, per BENCHMARK-CRITERIA §B1.

## Method

- **Synthetic.** Snippets run against the published package in a scratch install: sequelize v6 `query` with `replacements` and `bind`, `Sequelize.literal`/`sequelize.literal`, `where` with `Op`, `sequelize.escape`, `Model.create/build/update(req.body)` with and without `fields`, `new Sequelize(…)` with positional and options passwords, sequelize-cli `config.js` shapes and `@nestjs/sequelize` `forRoot` options. The synthetic suite ends at FP=0 FN=0.
- **Real code.** Every file that imports the library, linted with all of the plugin's rules.
- **Quint oracle.** Two models, sampled and locked by `benchmarks/__tests__/quint-oracle.lock.test.ts` (see below).

| Repository                         | Files  |
| ---------------------------------- | ------ |
| nestjs/nest (sample/07-sequelize)  | 6      |
| a sequelize + express REST example | 4      |
| **Total**                          | **10** |

## Real-code findings per rule

| Rule                     | Published | Verdict | After the fix | Verdict                                                                                                                                                           |
| ------------------------ | --------- | ------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| no-hardcoded-credentials | 0         | —       | 1             | TP: nest `sample/07-sequelize/src/app.module.ts:12` commits `password: 'root'` in `SequelizeModule.forRoot` (the published rule did not know `@nestjs/sequelize`) |
| no-unsafe-query          | 0         | —       | 0             | —                                                                                                                                                                 |
| no-mass-assignment       | 0         | —       | 0             | —                                                                                                                                                                 |
| require-tls              | 0         | —       | 0             | —                                                                                                                                                                 |

No finding is duplicated by `secure-coding/no-sql-injection` or another plugin.

## Quint oracle

| Model                                                    | Distinct cases | Disagreements now |
| -------------------------------------------------------- | -------------- | ----------------- |
| `models/sequelize-security.no-unsafe-query.qnt`          | 1593           | 0                 |
| `models/sequelize-security.no-unsafe-query.plumbing.qnt` | 160            | 0                 |

The values model crosses source {literal, number, request field, parameter, env var} × transform {none, `trim()`, `Number()`, another library's `escape` (`validator.escape`), `join(',')`, allowlist ternary, fixed-map lookup, `sequelize.escape(v)`} × position {`= ${v}`, `'${v}'`, `IN (${v})`, `ORDER BY ${v}`, `'…' + v`} × binding {inline, `const`, `let` reassigned, same-file helper} × sink. The plumbing model crosses import style {default, named, namespace, `require`, aliased} × call {plain, computed `db['m']`, optional `db?.m`, cast `(db as any).m`} × receiver {the driver, another library's client with the same method} × value × position. Renderers share `renderers/_sql.mjs`.

Disagreements, all resolved by reading the rendered case:

| Disagreement                                                                                                                                                                                                                        | Cases                            | Defect in             | Resolution                                                                                                                                                                                                                              |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| An allowlist ternary written inline in the template (`${['a','b'].includes(x) ? x : 'a'}`) reported: `sqlHoles` split the ternary into arms and judged the guarded arm alone                                                        | 37 on mysql, the first model run | rule (shared factory) | `sqlHoles` walks a ternary or `\|\|` only when an arm builds SQL text; a value-choosing ternary is judged whole, guard attached. Locked by `FP: an allowlist ternary written inline in the template` (mysql) and `sql-position.test.ts` |
| An escaped value inside `'…'` or an identifier quote stayed silent. The escaper's output brings its own quotes, which close the author's token: `name = '${mysql.escape(x)}'` with `x = "OR 1=1 OR"` reads `name = '' OR 1=1 OR ''` | 36 on mysql                      | rule (shared factory) | `isQuoted(preceding)` turns escapers off for that hole: an escaped value there is only as safe as what it escaped. Locked by the two `FN:` cases in the mysql `quint oracle 2026-10` block and `sql-safety.test.ts`                     |
| An escaped **constant** inside quotes expected reported                                                                                                                                                                             | 24 on mysql                      | model                 | The model's first draft ignored that `escape('admin')` is fixed text. Corrected: `Escape => p != Quoted or s == Literal or s == NumberConst`, with a comment. Pinned by `FP: an escaped constant inside quotes is still a constant`     |
| Another library's function of a constant (`validator.escape('admin')`) expected silent                                                                                                                                              | see the mysql audit; 64 here     | model                 | The rule cannot see what a foreign function returns, so its result is unproven in a value position (the documented contract). Corrected: `Lookalike => false`, with a comment                                                           |

Making request tracing follow any call (needed so `validator.escape(req.body.x)` and a same-file helper count as request-derived in a fragment position) briefly reported a map lookup keyed by a parameter field (`adapter.tableNameMap.get(…adapter.payload…)`, payload `getTableColumnFromPath.ts:801`) on the real-code re-scan. A method of the file's own data (`map.get`, `rows.find`) now carries only its receiver, not its arguments. Locked by `FP: a map lookup keyed by a parameter field returns what the map holds` (drizzle) and `sql-position.test.ts`.

The other six plugins' models were generated after those shared fixes landed. Their only disagreements were the look-alike model defect above; after it, every model of every plugin agrees with its rule.

## Findings

| Finding                                                                                                             | FP/FN | Status | Test name                                                       |
| ------------------------------------------------------------------------------------------------------------------- | ----- | ------ | --------------------------------------------------------------- |
| `no-hardcoded-credentials` — sequelize-security FP/FN review 2026-10-12, synthetic probe (BENCHMARK-CRITERIA B1)    | FP    | fixed  | FP: a test file pointing at a throwaway database                |
| `no-hardcoded-credentials` — sequelize-security FP/FN review 2026-10-12, synthetic probe (config without import)    | FN    | fixed  | FN: a Sequelize config with no sequelize import                 |
| `no-hardcoded-credentials` — sequelize-security FP/FN review 2026-10-12, synthetic probe (sequelize-cli config.js)  | FN    | fixed  | FN: a sequelize-cli config.js                                   |
| `no-hardcoded-credentials` — sequelize-security FP/FN review 2026-10-12, synthetic probe (positional password)      | FN    | fixed  | FN: the positional password argument                            |
| `no-hardcoded-credentials` — nestjs/nest:sample/07-sequelize/src/app.module.ts:12                                   | FN    | fixed  | FN: SequelizeModule.forRoot in a NestJS module                  |
| `no-mass-assignment` — sequelize-security FP/FN review 2026-10-12, synthetic probe (fields allowlist)               | FP    | fixed  | FP: Sequelize's own `fields` allowlist                          |
| `no-mass-assignment` — sequelize-security FP/FN review 2026-10-12, synthetic probe (URLSearchParams.set)            | FP    | fixed  | FP: URLSearchParams.set with a request value                    |
| `no-mass-assignment` — sequelize-security FP/FN review 2026-10-12, synthetic probe (class extends Model)            | FN    | fixed  | FN: a model class that extends Model, named anything            |
| `no-mass-assignment` — sequelize-security FP/FN review 2026-10-12, synthetic probe (instance update / set)          | FN    | fixed  | FN: an instance found through the model                         |
| `no-mass-assignment` — sequelize-security FP/FN review 2026-10-12, synthetic probe (bulkCreate / build)             | FN    | fixed  | FN: bulkCreate and build                                        |
| `no-mass-assignment` — sequelize-security FP/FN review 2026-10-12, synthetic probe (Object.assign onto an instance) | FN    | fixed  | FN: the request copied onto a model instance before save()      |
| `no-mass-assignment` — sequelize-security FP/FN review 2026-10-12, synthetic probe (sequelize-cli models)           | FN    | fixed  | FN: a model read off sequelize-cli's models/index.js            |
| `no-unsafe-query` — sequelize-security FP/FN review 2026-10-12, synthetic probe (constant table name)               | FP    | fixed  | FP: a constant table name beside bound replacements             |
| `no-unsafe-query` — sequelize-security FP/FN review 2026-10-12, synthetic probe (sequelize.escape)                  | FP    | fixed  | FP: Sequelize's own escape()                                    |
| `no-unsafe-query` — sequelize-security FP/FN review 2026-10-12, synthetic probe (another client's query)            | FP    | fixed  | FP: a GraphQL client's query() in a file that imports Sequelize |
| `require-tls` — sequelize-security FP/FN review 2026-10-12, synthetic probe (config without import)                 | FN    | fixed  | FN: a Sequelize config with no sequelize import                 |
| `require-tls` — sequelize-security FP/FN review 2026-10-12, synthetic probe (sequelize-cli config.js)               | FN    | fixed  | FN: a sequelize-cli production config with verification off     |

**Test-first.** Every case above was run against a `git archive HEAD` copy of the sources (or, for the Quint-found ones, the tree before the fix) and failed there.

**Existing tests.** Moved, with a comment beside each: three `literal()` fixtures that interpolated a function parameter into an `ORDER BY` fragment now read `req.query.sortColumn` (a fragment is reported once traced to the request); the original fixtures are kept together as one valid case. The "silent without a sequelize import" credentials and TLS cases now report on a sequelize-cli config shape, each with a valid twin without it. Mass-assignment fixtures bind their receiver to a model. No registry case, corpus fixture or changeset was added.

## Deferred

None.
