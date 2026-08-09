# NestJS Expansion Plan

> Living tracker. Successor to `NESTJS-HARDENING-PLAN.md` (which covered making the
> plugin _correct_). This one covers making it _land_: real true positives, more
> rules that deserve to exist, and reach inside the NestJS community.
>
> Opened 2026-08-06. Every number below was measured, not assumed — the source
> command is given for each.

---

## 0. The situation, stated honestly

`eslint-plugin-nestjs-security@2.2.0` is in `nestjs/awesome-nestjs` (2026-08-02).
That listing is the trust the community extended us. The plan is what we do with it.

The last sweep produced a result we have to build on rather than around:

> 9 rules × 8 major NestJS repos → **128 findings, 0 true positives worth a PR.**
> After 2.2.0 shipped, 128 → 100, verified against the published npm tarball.

That is not a rule-quality problem. It is a **shape** problem, and today's
measurements pin down exactly what the shape is.

---

## 1. Why our current rules structurally cannot yield PR-able true positives

Sort the 9 shipped rules by what they key on:

| shape                                                              | rules                                                                                                                    | can it produce a PR-able TP?                                                                                                                                                                     |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Absence** of a defensive construct                               | `require-guards`, `require-throttler`, `no-missing-validation-pipe`, `no-unguarded-swagger`, `no-hybrid-app-config-loss` | **No.** In a mature repo the absence is a deliberate architectural call (global `APP_GUARD`, rate limiting at the CDN, public-by-design webhooks). We cannot see the reason; the maintainer can. |
| **Presence** of a dangerous construct, gated on **local** evidence | `no-permissive-cors`, `no-res-bypass-serialization`                                                                      | **Yes** — and these are the only two that ever have.                                                                                                                                             |
| Mixed                                                              | `require-validation-pipe-whitelist`, `no-exposed-private-fields`                                                         | Sometimes.                                                                                                                                                                                       |

The evidence for the split is already in our own numbers. When
`no-res-bypass-serialization` was narrowed from "there is a `@Res()`" to "there is
a `@Res()` **and** this file mounts a serializer", it went **27 → 0** on the eight
repos. `no-permissive-cors` was narrowed from "wildcard origin" to "reflected
origin **and** `credentials: true`" and fires **once** across the whole corpus.

**One finding is not a weak rule. It is the only kind of finding a stranger can
open a PR about.** §4 below confirms that single finding is real.

**Doctrine going forward:** a rule earns "PR-grade" status only if every fact its
message asserts is visible in the flagged file. Everything else is a `warn`-tier
hygiene rule — valuable to a team that installs us, useless as an outreach vehicle.

---

## 2. Measured today: NestJS layering makes same-file taint invisible

The obvious next move was classic taint rules — `@Param()` reaching `exec`,
`readFile`, a raw SQL string. Measured first, over the 28-repo corpus
(46,929 non-test `.ts` files, `tmp/nest-corpus{,2,3}`):

```
                              files w/ sink   ∩ same file has @Param/@Body/@Query
exec / spawn / execSync              171   →   0
$queryRawUnsafe / $executeRawUnsafe   67   →   0
qb .where(`…${…}`)                    34   →   1
sendFile / createReadStream / readFileSync  181 →  13
Object.assign(                       181   →   3
multer file.originalname              17   →   1
```

**Zero.** Not "low" — zero, on the two highest-severity sink classes.

The cause is NestJS itself. The controller takes `@Param('id')` and immediately
calls `this.userService.findOne(id)`. The sink lives in a service file that
contains no decorator at all. **A same-file taint rule cannot see a NestJS taint
flow**, by construction of the framework we are targeting.

Two consequences, both load-bearing:

1. **Type-aware linting via `parserServices` is no longer a nice-to-have.** It is
   the only mechanism that can follow `this.userService.findOne(id)` across the
   controller/service boundary. Everything in §5's "provable" column depends on it.
2. **The SQL sinks are not ours to rule on.** 67 `$queryRawUnsafe` files and 34
   query-builder template literals live in service classes — that is
   `eslint-plugin-prisma-security` / `eslint-plugin-typeorm-security` territory,
   both of which we already publish. NestJS repos are a _corpus_ for those plugins,
   not a rule surface for this one.

### And the SQL hits are clean anyway — sampled, not assumed

Every interpolation found was an **identifier**, with the value correctly bound:

```ts
qb.andWhere(`row.${column} = :${parameterKey}`, { … })   // twenty
.where(`${alias}.id = :id`, { id: targetRecordId })      // twenty
$executeRawUnsafe(`SET LOCAL statement_timeout = ${searchTimeout}`)  // teable
```

A naive `no-sql-template-literal` rule would fire 34 times and be wrong 34 times.
Recording this so nobody writes it.

---

## 3. The certainty gate — what "absolutely sure about a true positive" means

No upstream PR without all five, written down per candidate. This is the artifact
that makes a claim defensible if a maintainer pushes back.

1. **Local evidence.** Every fact the finding asserts is visible in the flagged
   file(s) of that repo. No "probably there's no global guard."
2. **Reachability.** The code is actually wired: the config is passed to a live
   `NestFactory` app, the controller's module is imported by `AppModule`. Traced by
   hand, path recorded.
3. **Precondition check — the one that kills candidates.** The impact requires
   something; verify that something exists. Credentialed CORS needs cookie auth.
   Path traversal needs the path to reach `fs`. **Explicitly check for an
   `NODE_ENV` / `isDev` guard** (§4 shows why).
4. **Exploit sketch.** Write the concrete request. If you cannot write the `curl`,
   it is not a TP.
5. **Fix is ≤10 lines and preserves legitimate behaviour.** Best case: the fix uses
   a constant the repo already defines. An architectural suggestion is not a PR.

Then, adversarially: a second pass whose only job is to **refute** the finding.
Default to refuted when uncertain. §4 is that pass working as designed.

---

## 4. First results from the gate — one confirmed, one refuted

Both are `no-permissive-cors`, both look identical at grep level, and they land on
opposite sides.

### ✅ CONFIRMED — `juicycleff/ultimate-backend` (2,899★, active, not archived)

```
libs/common/src/utils/cors-config.util.ts:11   corsOptions = { origin: true, credentials: true }
apps/api-admin/src/main.ts:23                  app.enableCors(corsOptions)      ← unconditional
libs/common/src/setup/auth.setup.ts:72         app.use(cookieParser())          ← via authSetup(app, true)
```

- **Local evidence:** ✅ three files, one repo, nothing inferred.
- **Reachability:** ✅ `main.ts:23` of the **admin** API. No env guard.
- **Precondition:** ✅ cookie-based session confirmed — `credentials: true` is live.
- **Exploit:** attacker page runs `fetch(adminApi, {credentials:'include'})`; server
  reflects the attacker origin with `Access-Control-Allow-Credentials: true`; the
  browser attaches the session cookie and hands the response body to attacker JS.
  CWE-942 / CWE-346, CVSS 8.1.
- **Fix:** one line. `origin: true` → `origin: whitelist` — using the `whitelist`
  constant **already defined 7 lines above in the same file** and already used for
  `corsApollOptions`. The maintainer wrote the fix; they just didn't apply it here.

This is the ideal first upstream PR: high-value target, unarguable severity,
one-line diff, uses their own code. **Awaiting Ofri's per-repo approval** (standing
constraint from `NESTJS-HARDENING-PLAN.md` §7).

### ❌ REFUTED — `gobeam/truthy` (599★)

```ts
if (process.env.NODE_ENV === 'development') {
  app.enableCors({ origin: true, methods: '…', credentials: true });
```

Dev-only, deliberate, correct. Never runs in production.

> **Correction (2026-08-07).** This section originally added "**and our rule fires
> on it**", called that a new FP class, and made fixing it W1. That was wrong. It
> was inferred from a _grep hit_, never from running the rule. Running it shows
> `no-permissive-cors` reports nothing here: `insideEnvironmentBranch` /
> `isDevelopmentScoped` have handled `NODE_ENV`-guarded calls since #380.
>
> Correcting it is what surfaced the real defect, which is the opposite one — see
> §4b. The gate's value stands; the claimed FP does not.

**The lesson:** the gate paid for itself on its first two candidates — it found the
PR and it stopped the embarrassing one. But a candidate is not triaged until the
rule has actually been run on it.

---

## 4b. The real defect: a false negative, and the lock that pinned it

Running `no-permissive-cors` on the confirmed §4 candidate reported **nothing**
either. `resolveLocalObject` resolves same-file bindings only, so
`app.enableCors(corsOptions)` where `corsOptions` is _imported_ is invisible —
and that is exactly the shape of the one true positive we have.

Worse, the false negative was already written down. `real-world-lock.test.ts`
carried the ultimate-backend shape with `expected: {}` and a comment describing
the miss accurately:

```
// NOT reported today, and this is the genuinely exploitable one …
expected: {},
```

**A lock is only a lock on the behaviour you assert.** Asserting the buggy number
makes the bug permanent, and this one survived a release that way.

**Fixed** by reporting the annotated declaration itself:
`export const corsOptions: CorsOptions = { origin: true, credentials: true }`.
The annotation is what makes an object literal in a file with no `enableCors`
call provably a CORS config — the name is not evidence, the import it resolves
to is. Nothing is silenced on missing cross-file evidence (an unannotated object
is exactly as visible as before), so it cannot become self-suppression.

Locked with 5 tests that fail on the unfixed walk, including the truthy dev-guard
shape, which must stay silent, and the `origin: whitelist` declaration sitting
seven lines below the defect in ultimate-backend's own file.

---

## 5. Rule roadmap, re-ranked by _provability_ rather than hit rate

Old ranking was "how often does this pattern appear". New ranking is "if it fires,
can we prove it from the file". Both matter; provability is the gate.

### Tier A — presence-shaped, locally provable, ship-ready

| Rule                                      | Evidence                            | Notes                                                                                                                                                                                                                                          |
| ----------------------------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`no-permissive-cors` imported-config FN fix** | 1 confirmed TP (§4), 1 refuted candidate, 1 confirmed FN (§4b) | Not a new rule — a correctness fix. Do first. The env-guard FP this row used to cite was withdrawn on 2026-08-07: it was inferred from a grep hit, and the rule never fired on it. The real defect is the opposite — an imported `corsOptions` was invisible to `resolveLocalObject`, which is the shape of the only true positive we have. |
| **`no-graphql-introspection-production`** | 2 corpus files literal `true`       | Presence of a literal `true` **is** the evidence; env-gated forms don't fire. Same shape as the CORS rule, which is the shape that works.                                                                                                      |
| **`no-sensitive-error-response`**         | not yet counted                     | Exception filter returning `error.stack` / raw `exception.message`. Local, CWE-209, one-line fix. **Count before writing.**                                                                                                                    |
| **`no-unsafe-multer-filename`**           | 17 files use `originalname`         | `diskStorage({ filename })` echoing `file.originalname` → path traversal / overwrite, CWE-22+434. All evidence inside the `FileInterceptor` options object. Fix: `basename()`/uuid. **Triage the 17 first** — some will legitimately sanitize. |

### Tier B — needs `parserServices` (type-aware) to exist at all

Blocked on the §2 finding. This is where NestJS's _real_ vulnerabilities live, and
nobody else can reach them either — which is exactly why it's worth the investment.

- **`no-tainted-param-to-fs`** — `@Param()` → service → `readFile`/`sendFile`. 13 same-file hits today; cross-file will be far more.
- **`no-tainted-param-to-exec`** — 171 exec sites currently invisible.
- **`no-mass-assignment-sink`** — `@Body()` → `Object.assign(entity, dto)` / `repo.save({...dto})` across the boundary.

**Spike first, one week, one rule.** If cross-file resolution through
`this.xService.method()` proves unreliable in real monorepos (Nx, path aliases),
Tier B dies and we say so — same as the four candidates already dropped on evidence.

### Tier C — explicitly dropped (do not revisit without new counts)

`no-typeorm-synchronize-production` (0 outside nest's own fixtures),
`no-hardcoded-jwt-secret` (0/13), `no-websocket-permissive-cors` (0/18),
`require-session-secure-cookie` (1 file), `no-sql-template-literal` (34 hits, 34 safe — §2),
`ignoreExpiration: true` (**0** files, measured today).

### Untouched surfaces where we likely have false negatives

Both are real NestJS deployment shapes our corpus barely covers:

- **Microservices** — `@MessagePattern` / `@EventPattern` in 27 files. Zero rules
  apply. A message handler has no guard, no validation pipe by default, and
  `ValidationPipe` behaves differently on RPC. Probable rich FN surface.
- **Fastify adapter** — 17 files. `@Res()` semantics, helmet, and CORS all differ.
  Our rules assume Express. **Verify we don't emit FPs there before adding rules.**

---

## 6. Expansion targets — where the true positives actually are

The eight mega-repos were the wrong hunting ground twice over: mature teams made
these calls deliberately, and their maintainers don't merge drive-by security PRs
from strangers. Corpus today (28 repos) vs. what GitHub shows is untouched:

**Tier 1 — copy-multiplier repos (highest value, most receptive maintainers).**
A defect here is copied into thousands of private apps, and the maintainer's whole
value proposition is teaching the correct pattern — so they _want_ the fix.

| repo                                  |     ★ | last push | why                                                                                                                                            |
| ------------------------------------- | ----: | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `vladwulf/nestjs-api-tutorial`        |   553 | 2024-08   | The FreeCodeCamp NestJS course. Enormous copy reach.                                                                                           |
| `QuarkGluonPlasma/nestjs-course-code` |   603 | 2026-05   | Active course repo.                                                                                                                            |
| `vladwulf/nestjs-jwts`                |   416 | 2023-03   | JWT access/refresh tutorial — auth-critical by definition.                                                                                     |
| `hantsy/nestjs-rest-sample`           |   480 | 2026-08   | Active reference sample.                                                                                                                       |
| `nestjs/docs.nestjs.com`              | 1,366 | 2026-08   | **The official docs.** A security fix to a doc code sample is the single highest-multiplier PR in the ecosystem, and the core team reviews it. |

**Tier 2 — active admin/product repos (real apps, real defects).**
`buqiyuan/nest-admin` (2,262★, active), `surmon-china/nodepress` (1,522★, active),
`kuangshp/nestjs-mysql-api` (904★), `87789771/meimei-nestjs-admin` (658★),
`andrechristikan/ack-nestjs-boilerplate` (686★, active), `kyhsa93/nestjs-rest-cqrs-example` (876★),
`chnirt/nestjs-graphql-best-practice` (1,368★), `CatsMiaow/nestjs-project-structure` (1,354★).

**Tier 3 — ecosystem security libraries. Treat as advisories, not PRs.**
`nestjsx/nest-access-control` (1,158★), `sergey-telpuk/nestjs-rbac` (509★),
`hiro1107/nestjs-supabase-auth` (546★), `golevelup/nestjs` (2,732★),
`BenLorantfy/nestjs-zod` (1,106★). A defect in an access-control library is a CVE
with downstream blast radius, not a pull request. **Private disclosure first**,
always — and that route buys far more credibility than a merged PR.

**Explicitly deprioritised:** `nestjsx/crud` (4,326★ but last push 2024-07) and
other high-star/dead repos. Great for the report in §7, dead for PRs.

---

## 7. Reach — the play when the TP well is thin

We should assume TPs stay rare. That is a _finding_, not a setback, and the honest
version of it is more valuable than the PRs would have been.

1. **Publish the sweep.** "We ran 9 security rules across 28 NestJS repos
   (~47k files). 128 findings. 0 true positives. Here's every false positive we
   shipped and what we fixed." Ofri's honest-losses framing, and it matches the
   Dev.to editorial signal (first-person, craft, admits error) better than any
   benchmark post. The `truthy` refutation in §4 is the story's spine: _the tool
   found it, the discipline killed it, the discipline was the product._
2. **Land the `ultimate-backend` PR** (§4) — one merged security fix in a 2.9k★
   repo is the proof point the article needs.
3. **Be the default in the templates people copy.** A boilerplate that adopts us in
   its `eslint.config.mjs` installs us into every project generated from it. This
   is a far better adoption vector than mega-repos, and the ask is smaller: _the
   green-subset ratchet_ — offer only the rules already at 0 for that repo, so the
   maintainer merges a regression lock with zero cleanup.
4. **NestJS benchmark fixtures** (`§8` gate, still open). Until they exist, our
   oxlint parity is 100% on 0-vs-0 and proves nothing. Blocks any published
   precision claim.
5. **Core-team surface.** A fix to a `docs.nestjs.com` sample or `nestjs/nest`'s
   `sample/` tree reaches Kamil's team directly. Highest-trust, lowest-volume channel.

---

## 7b. Execution log — 2026-08-07

All in-repo workstreams executed. One PR: `feat/nestjs-expansion`.

### W3 — tier-2 corpus: the 128→0 result generalises

21 repos cloned (`tmp/nest-corpus4`, `clone.sh` reproduces), 3,559 non-test files,
**833 findings**. Shape is identical to the mega-repo sweep:

| rule                              |      n | shape                       |
| --------------------------------- | -----: | --------------------------- |
| require-guards                    |    653 | absence — 78% of everything |
| require-throttler                 |     87 | absence                     |
| no-missing-validation-pipe        |     24 | absence                     |
| **no-permissive-cors**            | **22** | **presence**                |
| require-validation-pipe-whitelist |     19 | mixed                       |
| no-exposed-private-fields         |     17 | absence                     |
| no-unguarded-swagger              |      7 | absence                     |
| no-hybrid-app-config-loss         |      4 | absence                     |

Five repos scan completely clean: `docs.nestjs.com`, `nest-access-control`,
`nestjs-rbac`, `nestjs-supabase-auth`, `cqrs-starter`.

**All 22 `no-permissive-cors` findings hand-triaged → 0 PR-able TPs.** 20 are a
bare `enableCors()` / `cors: true` (wildcard, no credentials — the browser
withholds the response from the script, so no authenticated read). One is
`nest-admin`'s `origin: '*', credentials: true`, which browsers _reject_ — their
CORS is broken, not exploitable. Zero reflected-origin-with-credentials.

So the tier-1 hypothesis in §6 is **not supported**: copy-multiplier repos are
not more vulnerable, they are less hardened in ways that are not exploitable.
The TP rate is a property of what our rules can prove, not of which repos we pick.

**Harness note:** the first run reported 0 findings across all 21 repos because
ESLint matches `files` globs against a cwd-relative path and the corpus is
outside the worktree — every file silently matched no config. Caught only
because the runner counts messages with no `ruleId` as errors. This is the third
time this trap has cost a run; **always print the error count beside the finding
count.**

### W6 — microservices and Fastify

`@MessagePattern` / `@EventPattern` appear in 6 controller files across three
repos. The plugin produces **zero findings on all six** — so: no false positives
to fix, and a confirmed **false-negative surface**. A message handler gets no
guard check and no validation check, and `ValidationPipe` behaves differently on
RPC. `FastifyAdapter` appears in 17 files with no misfires either.

Neither is a blocker; both are open FN work, now evidenced.

### W5 — one rule written, one dropped, one deferred

Counted first, over all four corpora (52,363 files):

| candidate                             | evidence                                                | verdict                                                                                                                                        |
| ------------------------------------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `no-unsafe-multer-filename`           | `diskStorage(` ∩ `originalname` = 8 files, **5 raw**    | **shipped**                                                                                                                                    |
| `no-graphql-introspection-production` | literal `playground/introspection: true` in **3** files | **dropped**                                                                                                                                    |
| `no-sensitive-error-response`         | exception filter ∩ `.stack` = 6; ∩ raw `.message` = 37  | **deferred** — the 37 are normal `getResponse()` handling; only the 6 are defects, and separating them needs the same care the multer rule got |

`no-unsafe-multer-filename` reports 5 of the 8 and abstains on the 3 that pass
the name through any call (`extname`, `.split('.').pop()`, a project helper).
Three of the five findings are _course repositories_ shipping the identical
`Date.now() + '-' + file.originalname` file — the prefix reads as a mitigation
and is not one.

### W8 — the unconditioned-impact contract

Shipped as `src/precondition-contract.test.ts`, not a script. Every rule must
declare itself `presence` or `absence`; the registry is asserted exhaustive, so a
new rule cannot be added without its author answering the question in writing.
Every `presence` rule supplies source with its shape but _not_ its precondition
and must report nothing on it — which is the 128→0 defect, mechanised.

This is deliberately a test rather than a corpus scanner: the scanner finds
today's instances, the contract prevents tomorrow's.

### W4 — `parserServices` cross-file taint: **GO**

Spiked against a two-file controller/service fixture. Given
`this.userService.findAvatar(id)` in the controller, the checker resolves the
symbol, the declaration lands in `user.service.ts`, the method **body is
walkable**, and the `readFileSync` sink is found. Cross-file taint is reachable.

Costs and untested risks, recorded honestly:

- Requires `parserOptions.project` / `projectService`. Must degrade to silence
  without it, the way `no-missing-validation-pipe` already does.
- The resolved body is a **`ts.Node`, not TSESTree** — a second AST and a second
  set of sink matchers. That is the real engineering cost, not the resolution.
- Not covered by the spike: injection by token or interface rather than concrete
  class, Nx path aliases, and monorepo project boundaries. Those are where this
  will actually break; scope the first Tier-B rule to measure them.

---

## 8. Workstreams

- ✅ **W1 — `no-permissive-cors`.** Shipped as a _false-negative_ fix, not the FP
  the plan first claimed (§4b). 5 locks, all red on the unfixed walk.
- ⏸️ **W2 — `ultimate-backend` upstream PR.** Gate doc written (§4), and the rule
  now reports it. **Blocked on Ofri's per-repo approval** — outside this repo, so
  outside this PR.
- ✅ **W3 — corpus tier-2.** 21 repos, 833 findings, 0 PR-able TPs (§7b).
- ✅ **W4 — `parserServices` spike.** GO, with the `ts.Node` cost named (§7b).
- ✅ **W5 — Tier A rules.** `no-unsafe-multer-filename` shipped;
  `no-graphql-introspection-production` dropped on evidence;
  `no-sensitive-error-response` deferred with its count recorded (§7b).
- ✅ **W6 — microservices + Fastify.** No FPs; a confirmed FN surface (§7b).
- ⏳ **W7 — the article** (§7.1). Now has its spine: 49 repos, ~52k files, 961
  findings, 1 true positive — plus the lock that pinned its own false negative.
  Lives in the blog repo, so outside this PR.
- ✅ **W8 — the unconditioned-impact contract.** Shipped as a locked contract
  rather than a scanner (§7b).

**What is left, in order:**

1. **W2** — open the ultimate-backend PR, on approval.
2. **First Tier-B rule** — `no-tainted-param-to-fs`, scoped to measure the three
   untested risks in W4 (token injection, path aliases, monorepo boundaries)
   rather than to maximise findings.
3. **Microservices FN work** — `@MessagePattern` handlers get no guard and no
   validation check today, and `ValidationPipe` semantics differ on RPC.
4. **W7** — the article, once W2 resolves either way.

The §8 confidence gate's open boxes (stratified per-rule triage, NestJS benchmark
fixtures, whole-repo `no-exposed-private-fields`) are unchanged and still block
any published precision claim.

---

## Standing constraints carried forward

- **No PR to a third-party repo without explicit per-repo approval from Ofri.**
- Verify every release against the **published npm tarball**, never a local `dist/`.
- A `{ messageId }` assertion locks nothing about CWE/CVSS — assert the rendered
  message string, both halves.
- Never gate a security rule on a cross-file project scan. Absence of evidence would
  silence the rule; that is self-suppression, the worst defect class.
