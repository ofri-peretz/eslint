# ILB-Corpus-Truth — corpus changes

Every change to `repos.json` changes the denominator the per-rule ceilings in
`baseline.json` were recorded against. Each one is logged here with the
arithmetic that carried the baseline across it. A baseline is amended by
subtracting the removed repositories' own contributions, never by re-recording
the whole corpus, because a fresh full re-measure would silently absorb any
regression that landed since the last recording.

| Date       | Change                    | Repository                                      | Pin                                        | Reason           |
| ---------- | ------------------------- | ----------------------------------------------- | ------------------------------------------ | ---------------- |
| 2026-10-19 | removed (107 → 106 repos) | `autobe` — `https://github.com/wrtnlabs/autobe` | `f5de9927c8eee6805afa3aeafd204f4c45037e49` | upstream deleted |

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
