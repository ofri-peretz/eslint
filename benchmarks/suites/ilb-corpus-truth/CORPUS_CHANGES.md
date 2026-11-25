# ILB-Corpus-Truth — corpus changes

Every change to `repos.json` changes the denominator the per-rule ceilings in
`baseline.json` were recorded against. Each one is logged here with the
arithmetic that carried the baseline across it. A baseline is amended by
subtracting the removed repositories' own contributions, never by re-recording
the whole corpus, because a fresh full re-measure would silently absorb any
regression that landed since the last recording.

| Date       | Change                    | Repository                                                 | Pin                                        | Reason           |
| ---------- | ------------------------- | ---------------------------------------------------------- | ------------------------------------------ | ---------------- |
| 2026-10-19 | removed (107 → 106 repos) | `autobe` — `https://github.com/wrtnlabs/autobe`            | `f5de9927c8eee6805afa3aeafd204f4c45037e49` | upstream deleted |
| 2026-11-15 | removed (106 → 105 repos) | `reactpress` — `https://github.com/fecommunity/reactpress` | `39ea6e0ff5cc7a570ee7673da1c79d8228fe3f2a` | upstream deleted |

## 2026-10-19 — autobe removed

The upstream repository `wrtnlabs/autobe` was deleted: the GitHub API returns
404 and `git ls-remote` fails with "Repository not found". The pinned commit
can no longer be fetched, so the scheduled run from 2026-10-13 failed in both
corpus jobs (`ILB-Corpus-Truth` and `ILB-Preset-Budget`), and every later run
would fail the same way (#1228). The other 106 repositories and their pinned
commits were all re-checked on 2026-10-19, and every one is still fetchable.

autobe's contribution was measured on a clean checkout of the pinned commit
(tracked files only, which is what CI's depth-1 fetch sees), with the same file
walk, lint config and off-SDK classification as `run.ts`:

| Rules measured with                      | Rules | Files | Findings | Off-SDK |
| ---------------------------------------- | ----: | ----: | -------: | ------: |
| baseline commit `d4cbc1846` (2026-08-11) |   151 | 1,382 |       42 |       0 |
| `main` at removal                        |   162 | 1,382 |       28 |       0 |

Baseline arithmetic:

- Per-rule off-SDK ceilings: `ceiling − 0 = ceiling` for all 151 rules, so no
  rule's ceiling changed.
- `filesScanned`: 107,384 − 1,382 = **106,002**.
- `corpusHash`: `sha256:ff73f5f0…3740` (107 pins) became
  `sha256:c1702ff5…8a11` (106 pins). It is re-derived from `name@commit` of the
  remaining pins, the same way `corpusHash()` computes it, and the old value
  reproduces exactly from the old `repos.json`.

`benchmarks/corpus-index.json` still lists autobe. That file indexes the local
`oos/` clone set, which still holds it, and the gate does not read it.

## 2026-10-19 — off-SDK regression triage (no corpus change)

Not a `repos.json` change: the corpus is the same 106 pins. Logged here because
eight per-rule ceilings moved, and a ceiling may only move with its evidence.

Run [39338296858](https://github.com/ofri-peretz/eslint/actions/runs/39338296858)
(`main` at `fd9ac869f`) failed on eleven rules. Each off-SDK finding was
reproduced locally against the pinned clones with the same file walk, lint
config and probe as `run.ts`, read in its source file, and classified as a
wrong verdict (fixed in the rules, never absorbed) or a file that **does** use
the SDK through evidence the import probe cannot see (`sdk-map.ts` documents
that independence; `offSdk` is an upper bound).

Fixed — wrong verdicts, each with a fixture that fails on the old code:

| Rule(s)                                        | Shape                                                                                                                                                                                                               |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mongodb-security/require-schema-validation`   | `new Schema({...})` with `Schema` imported from `dynamoose` (aws-nestjs-starter, 6)                                                                                                                                 |
| `postgresql-security/no-hardcoded-credentials` | DSN fixtures in `*.test.ts` / `*.spec.ts` (teable, bookorbit, immich, nhost); `placeholder="postgresql://user:password@host…"` on a JSX input (teable)                                                              |
| `postgresql-security/*` (5 rules)              | TypeORM `repo.query()` / `queryRunner.release()` in files whose gate opened through an import graph reaching `pg` 2-3 hops away, or through a pg-owning service imported beside TypeORM (activepieces, laudspeaker) |
| `typeorm-security/no-hardcoded-credentials`    | `bullRedis: { host, port, password }` beside a TypeORM block in a config owned only by its shape (meimei-admin, 2)                                                                                                  |
| `prisma-security/no-unscoped-mutation`         | probe bug: `import { PrismaClient } from '.prisma/client'` read as a relative path (nestjs-jwts) — the finding is now on-SDK                                                                                        |

Off-SDK, CI run → after the fixes:

| Rule                                           |  CI | After |
| ---------------------------------------------- | --: | ----: |
| `postgresql-security/no-unsafe-query`          | 107 |   103 |
| `postgresql-security/no-hardcoded-credentials` |  78 |     1 |
| `postgresql-security/no-batch-insert-loop`     |  55 |    55 |
| `postgresql-security/no-select-all`            |  17 |    14 |
| `postgresql-security/no-floating-query`        |   1 |     0 |
| `postgresql-security/prevent-double-release`   |   1 |     0 |
| `mongodb-security/require-schema-validation`   |  21 |    15 |
| `typeorm-security/no-hardcoded-credentials`    |   5 |     3 |
| `sequelize-security/no-hardcoded-credentials`  |   1 |     1 |
| `knex-security/no-hardcoded-credentials`       |   1 |     1 |
| `prisma-security/no-unscoped-mutation`         |   1 |     0 |

Ceilings raised — the file uses the SDK; the probe cannot see how:

| Rule                                           | Ceiling | Files                                                                                                  | Evidence the gate reads                                                                                                                                                                                                                                                     |
| ---------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `postgresql-security/no-unsafe-query`          | 0 → 103 | worklenz (86, 46 files), teable (17, one spec)                                                         | worklenz routes `import db from "../config/db"`, and `config/db.ts` imports `pg` and exports `pool.query` (the node-postgres layout #1192 made the gate follow). teable's spec queries through `createPGliteDb` from a relative helper that imports `@electric-sql/pglite`. |
| `postgresql-security/no-batch-insert-loop`     | 0 → 55  | worklenz                                                                                               | same `../config/db` wrapper                                                                                                                                                                                                                                                 |
| `postgresql-security/no-select-all`            | 0 → 14  | worklenz                                                                                               | same `../config/db` wrapper                                                                                                                                                                                                                                                 |
| `postgresql-security/no-hardcoded-credentials` | 0 → 1   | bookorbit `server/drizzle.config.ts`                                                                   | a DSN with a password in the file: `process.env.DATABASE_URL ?? 'postgres://bookorbit:bookorbit@postgres:5432/bookorbit'`                                                                                                                                                   |
| `mongodb-security/require-schema-validation`   | 6 → 15  | geekyants-express `src/models/User.ts`                                                                 | `import mongoose from '../providers/Database'` then `new mongoose.Schema<IUserModel>({...})` — Mongoose through a local wrapper; checked since #1221 taught the rule the `new mongoose.Schema` form. The 6 the old ceiling held were the dynamoose file, now fixed.         |
| `typeorm-security/no-hardcoded-credentials`    | 0 → 3   | meimei-admin `config.{development,production}.ts` (2), project-structure `src/config/envs/test.ts` (1) | TypeORM config shape `{ type: 'mysql', …, synchronize }` (#1208). meimei-admin commits a real password behind an env fallback for a public IP.                                                                                                                              |
| `sequelize-security/no-hardcoded-credentials`  | 0 → 1   | node-best-practices `example-application/data-access/config/config.js`                                 | sequelize-cli config shape `{ username, password, dialect: 'postgres' }` (#1208)                                                                                                                                                                                            |
| `knex-security/no-hardcoded-credentials`       | 0 → 1   | squareboat-nestjs-boilerplate `knexfile.js`                                                            | knexfile shape `{ client: 'mysql2', connection: { password } }` (#1208)                                                                                                                                                                                                     |

Re-measured after the fixes on every repository that produced a regressed
finding (and every repository with a PostgreSQL import or DSN): each of the
eleven rules is at or below the ceiling above, and
`postgresql-security/no-floating-query`, `postgresql-security/prevent-double-release`
and `prisma-security/no-unscoped-mutation` are back to 0.

Eleven `mcp-sdk-security` rules added since the baseline was recorded (151 →
162 rules) had no ceiling. `run.ts` fails a rule absent from the baseline only
when it has off-SDK findings, so they passed silently; all eleven measured 0
off-SDK in this run and are now recorded at 0, so a first off-SDK finding reads
as a regression against a recorded number rather than as an unbaselined rule.

## 2026-11-03 — off-SDK ceiling raise (no corpus change)

Not a `repos.json` change: `filesScanned` in the failing run matches this
baseline's recorded `106002` exactly, and the run printed no corpus-drift
warning, so the corpus is the same 106 pins this baseline was last recorded
against.

Run [41677813913](https://github.com/ofri-peretz/eslint/actions/runs/41677813913)
(`main` at `d8e08c58f`, scheduled, issue #1358) failed on two rules:

| Rule                                        | Ceiling | Measured |
| ------------------------------------------- | ------: | -------: |
| `nestjs-security/no-exposed-private-fields` |      39 |      103 |
| `nestjs-security/no-unsafe-multer-filename` |       0 |        3 |

Both trace to detection fixes that landed on `main` between this baseline's
last recording and the run above — not to a new false positive:

- **`no-exposed-private-fields`** — [#1349](https://github.com/ofri-peretz/eslint/pull/1349)
  (`afb3c414`) taught `memberName` to resolve a computed string key
  (`['password']: string`) as the same field as `password: string`, closing a
  false-negative the computed-key probe found. The rule's file gate
  (`fileDefinesSerializedModel` in `utils/nestjs-evidence.ts`) already fires on
  `class-transformer`, `typeorm`, `mongoose` and `sequelize-typescript` with no
  `@nestjs/*` import present — deliberately, per that file's own comment, since
  gating on `@nestjs` alone silenced the rule on exactly the entity files it
  exists for. `sdk-map.ts`'s `nestjs-security` entry only recognises
  `@nestjs/*` as "has SDK", so every finding in one of those framework-free
  entity files already counted as off-SDK before this fix; the fix simply
  means more of them are now caught.
- **`no-unsafe-multer-filename`** — [#1335](https://github.com/ofri-peretz/eslint/pull/1335)
  rewrote the rule (182 lines) as part of resolving its Quint-model
  divergences, with its own new fixtures and tests. Its gate
  (`fileUsesNestjsOrMulter`) fires on a bare `multer` import with no
  `@nestjs/*` present by design — the rule's own ❌ example is a
  `diskStorage` module that imports only `multer` — and the same
  `@nestjs/*`-only `sdk-map.ts` entry counts that as off-SDK.

Both PRs shipped with their own tests, a changeset, and (for #1349) a
`.agent/computed-key-baseline.json` update; neither touched `sdk-map.ts` or
`baseline.json`, which is the gap this entry closes. The ceilings above are
taken directly from run 41677813913's own output against the pinned,
undrifted corpus, rather than re-derived in this environment: the sandbox this
fix shipped from has no outbound access to the hosts the full 106-repo clone
needs and ships Node 22, one major below this repo's pinned Node 24, so
re-running `ilb:corpus-truth` here was not practical. A human or a later CI
run can re-verify by re-running `npm run ilb:corpus-truth` and checking the
new counts do not exceed these.

## 2026-11-15 — reactpress removed

The upstream repository `fecommunity/reactpress` is gone, along with the whole
`fecommunity` account: the GitHub API returns 404 for the repository, the
pinned commit and the account. The scheduled run on 2026-11-10
([42857599724](https://github.com/ofri-peretz/eslint/actions/runs/42857599724),
issue #1514) failed in both corpus jobs with `Could not pin reactpress to
39ea6e0…`, and every later run would fail the same way. No fork or rename
carries the repository (a GitHub search for `reactpress` finds only unrelated
projects), so it is removed rather than re-pinned. The other 105 pins were
re-checked on 2026-11-15 through the commits API, and every one still resolves.

reactpress's contribution was measured on a clean clone of the pinned commit
(tracked files only, which is what CI's depth-1 fetch sees, taken from the
local `oos/` copy still at that commit), with `run.ts` itself on `main` at
`ae3107bf8`:

| Rules measured with   | Rules | Files | Findings | Off-SDK |
| --------------------- | ----: | ----: | -------: | ------: |
| `main` at `ae3107bf8` |   163 |   836 |       81 |       2 |

Both off-SDK findings are `express-security/no-missing-security-headers`.

Baseline arithmetic:

- `express-security/no-missing-security-headers`: `22 − 2 = 20`. Every other
  rule's ceiling is `ceiling − 0 = ceiling`.
- `filesScanned`: 106,002 − 836 = **105,166**.
- `corpusHash`: `sha256:c1702ff5…8a11` (106 pins) became
  `sha256:6f53d929…4675` (105 pins), re-derived from `name@commit` of the
  remaining pins the same way `corpusHash()` computes it. The old value
  reproduces exactly from the old `repos.json`.

`benchmarks/corpus-index.json` still lists reactpress, for the same reason it
still lists autobe: it indexes the local `oos/` clone set, and the gate does
not read it.

## 2026-11-25 — off-SDK regression triage (no corpus change)

Not a `repos.json` change: run
[45474907652](https://github.com/ofri-peretz/eslint/actions/runs/45474907652)
(`main` at `ce584f95f`, scheduled, issue #1728) scanned 105,166 files, which
matches this baseline's `filesScanned`, so the corpus is the same 105 pins. It
failed on five rules:

| Rule                                           | Ceiling | Measured |
| ---------------------------------------------- | ------: | -------: |
| `express-security/no-missing-csrf-protection`  |       9 |       34 |
| `express-security/no-missing-security-headers` |      20 |       22 |
| `mongodb-security/no-unbounded-find`           |       5 |       10 |
| `mongodb-security/require-projection`          |       7 |       11 |
| `mongodb-security/require-lean-queries`        |       2 |        7 |

The run's numbers were reproduced locally on depth-1 clones of all 105 pins,
with the same file walk, lint config and `sdk-map.ts` probe as `run.ts`:
exactly 34, 22, 10, 11 and 7. The same 14 repositories were then linted with
these rules as they were at `0760e1097` (the last green scheduled run,
2026-11-14), and every finding the old rules did not produce was read in its
source file. All of them come from the evidence-gate changes that taught both gates to recognise files using the framework without importing it (PRs 1616, 1620, 1623 and 1693).

Fixed, because the verdict was wrong (each fix has a fixture that fails on the
old code):

- **`express-security/no-missing-csrf-protection` (25) and
  `no-missing-security-headers` (1)**: activepieces' Fastify controllers
  (`FastifyPluginAsyncZod`, `app.post('/', schema, async (req, res) => …)`). The
  route-registration arm of `fileUsesExpress` took the Fastify route as Express
  evidence. The structural arms no longer count in a file that imports Fastify,
  Koa, Hono, hapi, h3 or Elysia and does not import Express. The same exclusion
  removes two older `no-missing-security-headers` findings in nest-framework's
  `platform-fastify/adapters/fastify-adapter.ts`, which imports `@fastify/cors`.
- **`mongodb-security/require-lean-queries` (5)**: the-mirror migrate-mongo
  scripts, `const assetsCollection = db.collection('assets');
assetsCollection.find(…).toArray()`. `.lean()` is Mongoose-only. The rule
  already skipped the inline `db.collection('x').find()` but not a handle held
  in a variable; it now uses `isNativeCollectionReceiver`, which follows the
  bound handle the way the gate does.

Ceilings raised, because the file uses the SDK through evidence the import
probe cannot see:

| Rule                                  | Ceiling | Files                                                                     | Evidence the gate reads                                                                                                                                                                                                                    |
| ------------------------------------- | ------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `mongodb-security/no-unbounded-find`  | 5 → 10  | the-mirror `mirror-web-server/migrations/themirror/` (4 files, 5 queries) | migrate-mongo hands `up(db, client)` the driver's `Db`; the script binds `db.collection('assets')` and calls `.find({...}).toArray()` with no limit. The native-driver arm of `fileUsesMongo` (handle held in a variable, #1693) reads it. |
| `mongodb-security/require-projection` | 7 → 11  | the same migrations (3 files, 4 queries)                                  | the same bound collection handles, queried with no projection                                                                                                                                                                              |

`express-security/no-missing-security-headers` gained one finding the old rules
did not report: booking-microservices-expressjs
`src/building-blocks/monitoring/prometheus.metrics.js`, a compiled route module
that receives `app` and registers `app.use('/metrics', async (req, res) => …)`.
It is Express through the route-registration arm, and it fits under the
unchanged ceiling of 20.

Re-measured after the fixes on the 14 repositories that produced any finding of
these five rules:

| Rule                                           | Ceiling | After |
| ---------------------------------------------- | ------: | ----: |
| `express-security/no-missing-csrf-protection`  |       9 |     9 |
| `express-security/no-missing-security-headers` |      20 |    19 |
| `mongodb-security/no-unbounded-find`           |      10 |    10 |
| `mongodb-security/require-projection`          |      11 |    11 |
| `mongodb-security/require-lean-queries`        |       2 |     2 |

The `no-missing-csrf-protection` ceiling still holds eight findings in tududi
(`areasService.delete(userId, uid)` read as a `DELETE` route). They were already
there in the 2026-11-14 run and are not raised here.
