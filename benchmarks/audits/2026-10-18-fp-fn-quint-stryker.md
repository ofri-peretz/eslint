# FP/FN audit: Quint oracles and Stryker mutation testing (2026-10-11 → 2026-10-18)

Two methods were applied to four security plugins, and every finding was handled the same way:

1. The finding was reproduced on real code.
2. It was fixed with a test that fails on the old rule.
3. It shipped as a patch release.

The plugins: `postgresql-security`, `jwt-security`, `mongodb-security` and `node-security` (batch 1). Together they produced **37 distinct wrong verdicts: 15 false positives and 22 false negatives**, plus one crash. Every finding below is fixed, and every fix is published, or queued for the next release where noted.

## Method

- **Quint as an oracle.**
  - A Quint model states what a rule _should_ report, as path semantics over a generated set of code shapes.
  - Each shape is linted with the real rule, and the model checks that the rule and the spec agree.
  - `postgresql-security`'s release rules are covered this way by `spec/pg-release.qnt` and `src/rules/release-paths.test.ts`: 40 shapes at first, 80 after #1234.
  - The model is the source of each fixture's expected verdict; expectations never come from rule output.
- **Stryker mutation testing.** Stryker mutates rule source. A _surviving_ mutant is a branch that no test pins.
  - A survivor that weakens a guard means a valid case is missing, so a false positive can slip in unnoticed.
  - A survivor that weakens detection means an invalid case is missing, so a false negative can slip in.
  - Each high-value survivor was probed with real code. A wrong verdict was fixed; an equivalent mutant was documented, not tested.
  - Tooling, from #1217:
    - `npm run mutation -- --plugin <name> [--rules a,b] [--since <ref>] [--update-baseline]`.
    - A per-rule score ratchet in `.agent/mutation-baseline.json`, which fails CI when a score drops.
    - `.github/workflows/mutation.yml`, and the guide in [`docs/MUTATION_TESTING.md`](../../docs/MUTATION_TESTING.md).
- **Rule for every fix.** Restore the rule's old `index.ts` and confirm the new tests go red. A fix that can't be proven that way is not kept.

## Findings and releases

| Plugin                                               |     FP |     FN | PRs          | Released in                                         |
| :--------------------------------------------------- | -----: | -----: | :----------- | :-------------------------------------------------- |
| `eslint-plugin-postgresql-security` (Quint oracle)   |      2 |      0 | #1202        | 2.6.0                                               |
| `eslint-plugin-postgresql-security` (Stryker triage) |      4 |      4 | #1234, #1244 | next patch (changeset `postgresql-mutation-triage`) |
| `eslint-plugin-jwt-security`                         |      4 |      2 | #1217        | 3.5.1                                               |
| `eslint-plugin-mongodb-security`                     |      3 |      8 | #1221, #1225 | 9.1.4                                               |
| `eslint-plugin-node-security` (batch 1, 12 rules)    |      2 |      8 | #1235, #1239 | 5.6.10                                              |
| **Total**                                            | **15** | **22** |              |                                                     |

The table counts distinct fixes. Measured on the 80-shape release oracle, the old rules gave 15 wrong verdicts (8 false leaks, 7 false doubles); those collapse into the four `#1234` release fixes below.

### postgresql-security

| Rule                                              | Kind  | Wrong verdict on                                                                                                   | PR    |
| :------------------------------------------------ | :---- | :----------------------------------------------------------------------------------------------------------------- | :---- |
| no-missing-client-release, prevent-double-release | FP    | release in a rethrowing `catch` + release after the `try` (every path releases once)                               | #1202 |
| no-missing-client-release                         | FP    | swallowing `catch` + release after the `try`                                                                       | #1202 |
| no-missing-client-release                         | FP    | an early `return`/`break`/`continue` that releases first counted as a leak                                         | #1234 |
| prevent-double-release                            | FP    | a release followed by `return`/`throw` in its own block (in a loop, before a catch, inside an `if` branch's `try`) | #1234 |
| prevent-double-release                            | FP    | callback form `if (err) return done(err); … done()`                                                                | #1234 |
| prevent-double-release                            | FN    | release in an `else` branch + release after the `if`                                                               | #1234 |
| prevent-double-release                            | FN    | release in an `if` + `return client.release()`                                                                     | #1234 |
| no-unsafe-query                                   | FN    | statement behind leading SQL comments (`/* users#show */ SELECT … ${id}`, `-- c\nSELECT …`)                        | #1234 |
| no-unsafe-query                                   | FN    | `for…of` over a constant list that request data was pushed into, or whose element was overwritten                  | #1234 |
| no-unsafe-query                                   | FP    | same-file escaping helper with an argument (`(v) => format('%L', v)`, `escapeLiteral`)                             | #1234 |
| no-unsafe-query                                   | crash | `TypeError` aborting the file on a `var` helper declared 3+ blocks deep (found in review)                          | #1234 |

### jwt-security

| Rule                     | Kind | Wrong verdict on                                                                            |
| :----------------------- | :--- | :------------------------------------------------------------------------------------------ |
| no-decode-without-verify | FP   | a file's own helper named `jwtDecode`, with no JWT library imported                         |
| no-decode-without-verify | FP   | `const { exp } = jwt_decode(token)`, the client refresh check the rule documents as correct |
| no-decode-without-verify | FP   | the documented default `@decoded-header-only` annotation was ignored                        |
| require-expiration       | FP   | `{ ['exp']: now + 60 }` read as "no expiry"                                                 |
| require-issued-at        | FN   | `noTimestamp: runtimeFlag`, which makes jsonwebtoken delete `iat`                           |
| no-decode-without-verify | FN   | `.header.kid` exempted on a decoded **payload**; now exempt only with `{ complete: true }`  |

### mongodb-security

| Rule                                   | Kind | Wrong verdict on                                   |
| :------------------------------------- | :--- | :------------------------------------------------- |
| require-tls-connection                 | FP   | `mongodb+srv://…`, `?tls=true` / `?ssl=true`       |
| require-auth-mechanism                 | FP   | `authMechanism=` in the connection string          |
| no-unbounded-find                      | FP   | Mongoose `find(filter, null, { limit })`           |
| require-schema-validation              | FN   | `new mongoose.Schema({ name: { type: String } })`  |
| no-unsafe-query                        | FN   | `{ ...req.body, deleted: false }`                  |
| no-unsafe-where                        | FN   | `Model.$where(...)`, `query.$where(fn)`            |
| no-unsafe-query, no-unsafe-regex-query | FN   | injection nested in `$or` / `$and` / `$nor`        |
| no-unsafe-regex-query                  | FN   | `{ name: new RegExp(req.query.q) }`, `RegExp(...)` |
| 6 rules                                | FN   | computed method access `User['updateOne'](...)`    |
| no-debug-mode-production               | FN   | `mongoose.set({ debug: true })`                    |
| (file gate)                            | FN   | upper-case `MONGODB://` connection string          |

### node-security (batch 1)

| Rule                      | Kind | Wrong verdict on                                                                                                      |
| :------------------------ | :--- | :-------------------------------------------------------------------------------------------------------------------- |
| no-self-signed-certs      | FN   | `globalThis.process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'` (verified on Node 24.12 against a self-signed TLS server) |
| no-toctou-vulnerability   | FP   | `mkdirSync(d, { 'recursive': true })`                                                                                 |
| no-toctou-vulnerability   | FN   | awaited `fs/promises` `stat` → `isFile()` → `unlink`                                                                  |
| no-unsafe-dynamic-require | FN   | `module.createRequire(import.meta.url)(req.body.x)`                                                                   |
| detect-child-process      | FN   | quoted/computed `'shell': true`                                                                                       |
| detect-child-process      | FN   | quoted/computed `{ 'exec': run } = require('child_process')`                                                          |
| no-arbitrary-file-access  | FN   | `const { file } = req.query; fs.readFileSync(file)`                                                                   |
| no-arbitrary-file-access  | FN   | `path.join(ROOT, req.query.folder, basename(f))`, where one basename argument cleared the whole join                  |
| no-timing-unsafe-compare  | FN   | `this.#apiToken === req.query.t`                                                                                      |
| no-math-random-crypto     | FP   | `Math.random()` inside a block-bodied `setInterval` callback                                                          |

## Mutation-testing coverage

| Plugin              |           Rules banked |                                     Mean score |
| :------------------ | ---------------------: | ---------------------------------------------: |
| mongodb-security    |                16 / 16 |                                           90.2 |
| jwt-security        |                13 / 13 |                                           84.2 |
| postgresql-security |                13 / 13 | 83.0 (no-unsafe-query 75.6 → 86.0 after #1234) |
| node-security       | 12 / 43 (31 `pending`) |                                        batch 1 |

The remaining plugins are not opted in yet: browser-security, secure-coding, express, vercel-ai, mcp-sdk, lambda, nestjs and the per-SDK plugins. The rollout order is in [`docs/MUTATION_TESTING.md`](../../docs/MUTATION_TESTING.md).

## Open: owner decisions (not changed)

These are judgements about what a rule _should_ report, so none of them were changed:

- **mongodb-security**
  - `${req.body.x}` coercion is reported, while `String(...)` is quiet.
  - `no-operator-injection` matches on text.
  - `no-unsafe-regex-query` reports its own documented `escapeRegex` fix written inline.
  - `app.set('debug', true)` is reported on any receiver.
- **jwt-security**: documented options that no rule reads (`maxExpirationSeconds`, `trustedSanitizers`, `strictMode`, …).
- **node-security**
  - ~~`lock-file` searches up to `/`.~~ Resolved: the search stops at the repository root (nearest `.git`); the mislabelled `lock-file/safe/case-03.js` corpus fixture is now a genuine true negative.
  - ~~`no-shell-injection` stays silent on `exec(cmd + args)`, although its own message cites it.~~ Resolved: reported.
  - ~~`detect-child-process` guards are loose.~~ Resolved: a guard clears only the value it checks, on a constant allowlist; the `if` and early-exit forms agree; `cp[m]` with a const `m` is a sink; a literal `exec` is quiet under `reportUnresolvedCommands`.
  - ~~`no-zip-slip` still reports `resolve` followed by a `startsWith` check.~~ Resolved: the canonical guard is safe, a failure-branch join is reported, `@safe` is scoped to the next statement.
  - Also decided and resolved: `no-arbitrary-file-access` (`fs/promises` sinks, later assignments, a `safePath` parameter fed request input) and `no-weak-hash-algorithm` (a digest compared against a signature-named value; no `sha256(...)` suggestion where none is defined).
- **postgresql-security**
  - ~~Any `.length` is trusted as a placeholder index (a JSON body can send `{"length": …}`).~~ Resolved: only the length of an array the file builds.
  - ~~`??=` / `||=` assignments aren't tracked.~~ Resolved: tracked like `+=`.
  - ~~Numeric expressions outside `$N` are reported.~~ Resolved: provably numeric values are safe anywhere.
  - ~~`UNION`/`EXPLAIN`/`SET` statements aren't recognised.~~ Resolved, with `SHOW` and `VALUES` too.
  - Also decided and resolved: an allowlist lookup in a const object/Map literal of fixed strings is not reported.
- **Placement**: a postgres URL in a TypeORM `DataSource` is reported by two plugins.
