# ORM + Agentic families — security rule plan

Living tracker for the 11 stub plugins published 2026-08-03. Status column is the
source of truth; update it as rules land.

## 0. Verified starting state (2026-08-03)

**ORM/driver family — 7 packages, on `main`, published v0.1.1.**
Every one ships exactly one rule, `no-unsafe-query`, a thin instantiation of
`createSqlInjectionRule` from `@interlace/eslint-devkit`.

| Package | Sinks wired today |
|---|---|
| `eslint-plugin-prisma-security` | `$queryRawUnsafe`, `$executeRawUnsafe` |
| `eslint-plugin-drizzle-security` | raw-query sinks |
| `eslint-plugin-typeorm-security` | raw-query sinks |
| `eslint-plugin-sequelize-security` | `sequelize.query()`, `Sequelize.literal()` |
| `eslint-plugin-knex-security` | raw-query sinks |
| `eslint-plugin-mysql-security` | raw-query sinks |
| `eslint-plugin-sqlite-security` | raw-query sinks |

**Agentic family — 4 packages, on open PR #335 (`feat/ai-sdk-family`), published v0.1.0.**
Not yet on `main`. One rule each.

| Package | Rule today |
|---|---|
| `eslint-plugin-openai-security` | `no-browser-api-key-exposure` |
| `eslint-plugin-anthropic-security` | `no-hardcoded-api-key` |
| `eslint-plugin-gemini-security` | `no-disabled-safety-settings` |
| `eslint-plugin-mcp-sdk-security` | `require-tool-input-schema` |

**Consequence:** 11 packages are live on npm at a rule surface that does not yet
justify the `-security` name. Everything below is surface completion, not
greenfield.

**Blocking order:** PR #335 merges *before* any agentic rule work. Building new
rules on an unmerged branch that is already 3 commits behind `main` means
rebasing ~9 rules × 4 packages later. ORM work is unblocked today.

---

## 1. The quality contract (applies to every rule below)

Nothing here is new policy — it is the existing bar, collected so a rule can be
checked off against it. A rule is **not done** until all of it holds.

### 1.1 Placement (taxonomy)
- Detection gate decides the home, not the vulnerability class. If the detection
  path compares against an exact SDK/driver identifier, it belongs in that
  driver's plugin — never in `secure-coding`/`node-security`/`browser-security`.
- Shared *logic* lives in a `@interlace/eslint-devkit` factory; each plugin ships
  a thin instantiation with its own sinks and remediation copy. This is the
  `createSqlInjectionRule` shape and it is the required pattern for every
  multi-driver rule below.
- `npm run lint:taxonomy` must stay green; do not add to its `GRANDFATHERED` array.
- No two plugins may report the same line. A dedupe test is the tell that the
  boundary is wrong.

### 1.2 Self-suppression audit (highest-severity defect class)
Every rule with an early-exit, allowlist, or "already guarded" path gets an
explicit adversarial pass before merge:
- Does the guard match **printed source text** instead of a resolved AST shape?
  Text matching over-matches, always.
- Does a **scoped** construct get read as global?
- The regression test is an `invalid` case the suppression would swallow. Verify
  the lock by reverting the fix — **the test must fail**. Green tests after a fix
  prove nothing on their own.

A rule that silently disables itself scores a perfect false-positive rate while
protecting nothing, and silently invalidates every benchmark row it contributes to.

### 1.3 Tests & coverage
- 100/100/100/100 (lines/statements/functions/branches) on production source,
  thresholds pinned in the package's vitest config.
- Zero `/* v8 ignore */`. Unreachable branches are reproduced via
  `rule.create(createWithMockContext())` + direct listener invocation, or deleted.
- Dual-layer: **L1** RuleTester (FP/FN matrix, options, autofix `output`,
  suggestions) + **L2** raw unit tests on extracted named functions.
- Barrel-lock test per package: exact-match `Object.keys(plugin.rules).sort()`
  against a literal list, plus config names and `meta.name`/`version` wiring.

### 1.4 Fixtures before rules
Each rule lands a labeled vulnerable+safe fixture pair in `benchmarks/corpus/`
(`@cwe`/`@expected`/`@author`/`@reviewedBy` headers) **before** the
implementation. The safe half is the FP wedge — guard-aware cases that must stay
silent — and it is what makes "low false positives" a measured result rather than
a slogan.

### 1.5 Package plumbing (each hard-fails if skipped)
`apps/docs/src/lib/plugins.ts` · docs `meta.json` nav + `rules/<rule>.mdx` shell ·
`.agent/type-awareness-scan.tsv` · `.agent/plugin-rule-manifest.json` ·
`PLUGIN_ALLOWED_ENVIRONMENTS` · `fix-readmes.ts` `DESCRIPTIONS` ·
`scripts/__tests__/ecosystem-integrity.test.ts` `PLUGIN_NAMES` +
`scripts/__tests__/fixtures/ecosystem-presets.ts` · `tsconfig.solution.json` ·
docs plugin-count assertions. Then regenerate: `sync-readmes`, `oxlint:shims`,
`oxlint:shims:verify -- --update`, `ilb:scope-audit`, full `npm run build`.

SDK peers go in **both** `peerDependencies` and `peerDependenciesMeta`
(`optional: true`) — a `peerDependenciesMeta` entry with no `peerDependencies`
twin is silently ignored by npm.

### 1.6 Presets
New rules join `strict` automatically. Promotion to `recommended`/`flagship`
requires a measured FP profile on the corpus. Rules marked **warn** below stay
out of `flagship` until measured.

---

## 2. ORM / driver family — rule matrix

### 2.1 Shared rules (one devkit factory → 7 instantiations)

| # | Rule | CWE | Sev | Why it is not covered by `no-unsafe-query` | FP |
|---|---|---|---|---|---|
| O1 | `no-raw-identifier-interpolation` | CWE-89 | error | Table/column/order-by identifiers **cannot be parameterized** — the tagged-template escape everyone recommends does not save you here. Anchor: Drizzle GHSA-gpj5-g38j-94v9. | near-zero |
| O2 | `no-unscoped-mutation` | CWE-284 | error | `deleteMany()`/`updateMany()`/`.del()` with no filter — mass data loss. This is `eslint-plugin-drizzle`'s *entire* published surface; we generalize it. **Shipped for Prisma, Drizzle and Knex only** — see §5.1 for why Sequelize and TypeORM are excluded. | near-zero (driver-gated) |
| O3 | `no-mass-assignment` | CWE-915 | error | `req.body` spread straight into `create`/`update`/`values()` — the standard privilege-escalation path (set `role`, `isAdmin`, `ownerId`). | low (allowlist option) |
| O4 | `require-tls` | CWE-319 | error | `ssl:false`, `rejectUnauthorized:false`, `sslmode=disable` in connection config. Explicitly moved here from `node-security` by the taxonomy contract. | ~zero (literal props) |
| O5 | `no-hardcoded-credentials` | CWE-798 | error | Inline password in a connection string/config object. | low |
| O6 | `no-query-param-logging` | CWE-532 | warn | `logging: console.log` (Sequelize), `log:['query']` (Prisma) echo **bound parameter values** into logs — PII and credentials land in log aggregation. | low |
| O7 | `require-query-limit` | CWE-770 | warn | Unbounded `findMany()`/`select()` on a user-facing path — memory-exhaustion DoS. | moderate → **warn only**, never flagship |

### 2.2 Per-driver rules (detection is driver-unique)

| Driver | Rule | CWE | Note |
|---|---|---|---|
| Prisma | `no-prisma-raw-in-template` | CWE-89 | `Prisma.raw()` inside a `$queryRaw` tagged template defeats the very parameterization the template provides. High-value: the "safe" API used unsafely. |
| Sequelize | `no-operator-injection` | CWE-89 | `req.query` merged into a `where` clause lets the client inject `Op` keys. Sequelize's own docs warn about it; no linter checks it. |
| Sequelize | `no-unsafe-replacements` | CWE-89 | `replacements` built by concatenation instead of `:named` binds. |
| TypeORM | `no-unsafe-where-string` | CWE-89 | `.where("id = " + x)` — the string-form `where` is the documented footgun. |
| TypeORM / Knex | `no-unsafe-order-by` | CWE-89 | `ORDER BY` takes raw SQL and is not parameterizable (sibling of O1, driver-shaped). |
| Knex | `no-raw-binding-mismatch` | CWE-89 | `knex.raw()` with `?` count ≠ binding count — silently mis-binds. |
| Drizzle | `no-sql-raw` | CWE-89 | `sql.raw()` / `sql.identifier()` with non-literal input. |
| mysql / sqlite | `no-multi-statement` | CWE-89 | `multipleStatements:true` converts any injection into stacked-query RCE-adjacent impact. Literal prop, ~zero FP. |

**Totals:** 7 shared + 8 driver-specific. Shared rules cost 1 factory + 7×~15-line
instantiations each — the marginal cost per driver is near zero, which is the whole
argument for the 7-package split.

---

## 3. Agentic family — rule matrix

**Scope guard:** `eslint-plugin-vercel-ai-security` stays Vercel-AI-SDK-scoped
(19 rules, unchanged). These four packages own the openai / anthropic / gemini
SDKs and the MCP SDK. No rule may fire on both a Vercel-AI call and a raw-SDK call.

### 3.1 Shared across openai / anthropic / gemini (one factory → 3 instantiations)

| # | Rule | CWE | Sev | Note |
|---|---|---|---|---|
| A1 | `no-hardcoded-api-key` | CWE-798 | error | **Shipped all three** (#402) — factory `createSdkApiKeyRule`; gemini also covers the legacy positional-key client. |
| A2 | `no-browser-api-key-exposure` | CWE-522 | error | **Shipped openai + anthropic** — factory `createBrowserEscapeHatchRule`. **Gemini excluded**, see §5.4. |
| A3 | `no-untrusted-content-in-prompt` | CWE-1427 | error | **Shipped all three** (#406) — factory `createSystemPromptInjectionRule`. Gated on the qualified member path (`messages.create`, `completions.create`, `generateContent`), not the leaf method: gating on `create` made one line report twice, measured. A bare `generateText(...)` has no member path, which is what keeps `vercel-ai-security` out. |
| A4 | `no-unsafe-output-handling` | CWE-94 / CWE-78 | error | Model output flowing into `eval`/`exec`/`innerHTML`/a query sink. The core agentic risk: the model is an untrusted source. **Blocked on §5.6** — every sink it targets is already owned, and the existing source-specific sink rules double-reported. Ships only under the ownership rule #409 establishes. |
| A5 | `no-sensitive-in-prompt` | CWE-200 | error | PII/secrets shipped to a third-party inference API. |
| A6 | `require-max-tokens` | CWE-770 | warn | Unbounded generation — cost DoS. |
| A7 | `require-request-timeout` | CWE-400 | warn | No timeout/abort signal on an inference call. |
| A8 | `require-output-validation` | CWE-20 | warn | Structured output consumed without schema validation. |
| A9 | `no-disabled-safety-settings` | CWE-693 | error | Ships on gemini (`BLOCK_NONE`); openai moderation-bypass and anthropic analogues. |

### 3.2 MCP SDK — the differentiated surface

This is the CVE-anchored territory and the strongest story in either family.
Incumbent: `eslint-plugin-mcp-security` (mattschaller, v0.2.5) — a real package,
so these rules must be measurably broader, not just differently named.

| # | Rule | CWE | Sev | Anchor |
|---|---|---|---|---|
| M1 | `require-tool-input-schema` | CWE-20 | error | **Ships today.** |
| M2 | `no-tool-description-injection` | CWE-1427 | error | Tool descriptions are model-visible instructions. Interpolated/dynamic descriptions = tool poisoning (Invariant Labs). |
| M3 | `no-unvalidated-tool-args` | CWE-20 | error | Handler reads `args.x` without going through the declared schema — makes M1 meaningful instead of decorative. |
| M4 | `no-path-traversal-in-resource` | CWE-22 | error | Resource URI → filesystem path without containment. |
| M5 | `no-command-injection-in-tool` | CWE-78 | error | Tool argument → `exec`/`spawn`. CVE-2025-49596, CVE-2025-6514 shape. |
| M6 | `require-origin-validation` | CWE-346 | error | HTTP/SSE transport without an Origin check → DNS rebinding. Documented MCP transport risk. |
| M7 | `no-unauthenticated-http-transport` | CWE-306 | error | `StreamableHTTPServerTransport` bound to `0.0.0.0` / no auth layer. |
| M8 | `no-secrets-in-tool-response` | CWE-200 | error | `process.env` returned in a tool result — the credential-harvest shape. |
| M9 | `require-tool-annotations` | CWE-693 | warn | Missing `readOnlyHint`/`destructiveHint` leaves clients unable to gate destructive tools. |

> CVE identifiers above are carried from `SECURITY-RULE-CANDIDATES.md`. **Re-verify
> each one against its advisory before it appears in published README/docs copy** —
> a wrong CVE in marketing copy is worse than no CVE.

**Totals:** 9 shared (×3 SDKs) + 9 MCP-specific.

---

## 4. Execution waves

Ordered by (protective value × story value) ÷ cost. Each wave is one PR per family.

| Wave | Content | Why first |
|---|---|---|
| **W0** | Merge PR #335. Fix the `peerDependenciesMeta`-without-`peerDependencies` bug across all 11 packages. | Unblocks agentic work; the peer bug is silently active on all 11 published tarballs. |
| **W1** | ORM shared O1–O5 (factory + 7×5 instantiations = 35 rule wirings). Fixtures first. | Highest value/cost ratio in the repo: 5 factories buy 35 rules. O2 alone generalizes a competitor's whole package. |
| **W2** | MCP M2–M5. | The CVE-anchored, zero-real-incumbent set. Best article material of either family. |
| **W3** | Agentic shared A1–A5 across the 3 SDKs (factory + 15 wirings). | Completes the "every LLM SDK is covered" claim. |
| **W4** | ORM per-driver (8 rules) + O6–O7 warn-tier. | Depth once breadth is in. |
| **W5** | MCP M6–M9 + agentic A6–A9 warn-tier. | Resource/hardening tail. |
| **W6** | Corpus re-run + preset promotion + CLAIMS.md rows + README/docs sync. | Turns the work into measured claims. |

**Do not** promote anything to `flagship`/`recommended` before W6 measures its FP
profile on the corpus.

---

## 5. Status

| Wave | State |
|---|---|
| W0 | **Done.** PR #335 merged: agentic peers fixed, AI SDK family landed, `eslint-plugin-pg` / `-jwt` superseded by the `-security` renames. ORM peers were verified correct already. Remaining: the two `npm deprecate` calls need an interactive `npm login` — `latest` on both old packages still carries no notice, so installs are silent today. |
| W1 | **Done.** O2 `no-unscoped-mutation` for prisma / drizzle / knex — factory `createUnscopedMutationRule`, self-suppression lock verified by reverting the guard; **sequelize deliberately excluded**, see §5.1. O4 `require-tls` (#373) for knex / mysql / sequelize / typeorm — `createRequireTlsRule`, URL findings scoped to connection positions. O1 `no-raw-identifier-interpolation` (#385) for drizzle / prisma only — `createRawIdentifierRule`; §5.2 says why two and not seven. O5 `no-hardcoded-credentials` (#386) — `createHardcodedCredentialsRule`. O3 `no-mass-assignment` (#389) — `createMassAssignmentRule`. All at 100/100/100/100. |
| W2 | **Done — 3 of 4 shipped, M4 dropped with cause.** M2 `no-tool-description-injection` (#396), M5 `no-command-injection-in-tool` (#397), M3 `no-unvalidated-tool-args` (#400). **M4 `no-path-traversal-in-resource` does not ship** — see §5.3. All rules held out of `minimal` / `recommended` pending W6, locked by a preset test. |
| W3 | **A1 shipped** (#402): `no-hardcoded-api-key` across openai / anthropic / gemini via `createSdkApiKeyRule`; gemini also covers the legacy positional-key client. **A2 shipped** for openai + anthropic via `createBrowserEscapeHatchRule` — gemini has no equivalent flag, see §5.4. **A3 shipped all three** (#406) via `createSystemPromptInjectionRule`; a follow-up commit fixed two rule docs that named the wrong option and locked the three request paths that had shipped untested. **A4 blocked on §5.6**, A5 not started. |
| W4 | not started |
| W5 | not started |
| W6 | not started |

### 5.1 Findings that changed the plan

**Sequelize cannot carry `no-unscoped-mutation`.** Sequelize gives the instance
and the static bulk form the same method names, and both accept an options
object: `user.destroy({ transaction: t })` deletes one row, `User.destroy({})`
empties the table, and the two are identical ASTs. Every mitigation short of
type information (require an options object, require ≥2 arguments) still fires
on correct single-row code. Two such false positives showed up in the Sequelize
test suite and the rule was withdrawn from that package rather than shipped
with them — a plugin that fires on correct code is the one users disable, which
is the exact wedge we compete on.

The genuinely detectable Sequelize case is `destroy({ truncate: true })`, which
only the static form accepts. It is a *different* rule with a different message
(there is no clause to add), so it moves to W4 as a per-driver
`sequelize-security/no-truncate`.

**TypeORM also deferred to W4.** Its `repo.delete(criteria)` / `repo.update(criteria, partial)`
take a bare criteria object rather than `{ where }`, so "scope" means "a
non-empty object in the criteria position" — a third detection shape that does
not fit the factory cleanly.

**mysql / sqlite are out of scope for this rule by design** — they are raw
drivers where the mutation is a SQL string, so `DELETE FROM t` with no `WHERE`
is literal-text analysis, not an API-shape check.

Net: O2 covers 3 of 7 drivers today, and the remaining 4 have named, understood
follow-ups rather than silent gaps.

### 5.2 O1 covers 2 drivers, not 7 — and that is the whole rule

The plan estimated "7×5 = 35 rule wirings", assuming each shared rule reaches
every driver. O1 cannot, because its value depends on a precondition only two
drivers meet.

O1's finding is *an identifier interpolated into an API that parameterizes
values*. The danger is the gap between what the API promises and what it can
deliver: `` sql`… ${table}` `` looks bound and is not. That gap only exists
where a value-parameterizing tagged template exists — Prisma's
`$queryRaw`/`$executeRaw` and Drizzle's `sql` tag. Nowhere else in the family:

| Driver | Raw entry point | Tagged template? |
|---|---|---|
| Prisma | `$queryRawUnsafe` | ✅ `$queryRaw`, `$executeRaw` |
| Drizzle | `sql.raw()` | ✅ the `sql` tag |
| Knex | `knex.raw(string)` | ❌ |
| Sequelize | `sequelize.query(string)` | ❌ |
| TypeORM | `.query(string)` | ❌ |
| mysql2 | `query`, `execute` | ❌ |
| better-sqlite3 | `prepare`, `exec`, … | ❌ |

For the five without one, the raw entry point takes a plain string, and
`no-unsafe-query` already reports **every** interpolation into it — identifier
or value. Adding O1 there would put two findings from one plugin on one line,
which the taxonomy contract forbids, and it would buy no new detection.

There is a real residual gap: for those five, `no-unsafe-query` fires with the
remediation "use a bind parameter", which is *impossible advice* in an
identifier position. The developer follows it, it does not work, and they go
back to concatenation. That is a message-quality defect in an existing rule, not
a missing rule — tracked for W4 as a remediation split inside
`createSqlInjectionRule`, not as five more O1 instantiations.

Net: 2 instantiations that each detect something nothing else in the ecosystem
detects, rather than 7 of which 5 would be duplicates.

### 5.3 M4 does not ship — the finding is the deliverable

`no-path-traversal-in-resource` was to report an MCP resource URI reaching a
filesystem path. The taxonomy check that precedes every rule (§1.1) asked what
already owns the generic fs sink: `node-security/detect-non-literal-fs-filename`.
Running it against six real shapes:

```
✅ reports | fs.readFile(userPath)
❌ MISSED  | import { readFile } from 'node:fs/promises'
❌ MISSED  | renamed default import
❌ MISSED  | renamed require
❌ MISSED  | fs.promises.readFile
❌ MISSED  | namespace import
```

The gate required the receiver be literally the identifier `fs`
(`node.callee.object.name !== 'fs'`), so the module's most common modern import
styles were unchecked — including the shape the rule's **own documentation**
used as its first incorrect example. That is §1.2's self-suppression class, in a
rule already shipping at `error` in `recommended`.

Writing M4 would have papered over that inside one plugin while leaving every
other consumer exposed. The generic fs sink belongs to `node-security`, so the
fix went there (#401): resolve the binding across `fs`, `node:fs`,
`fs/promises`, `node:fs/promises`; judge at `Program:exit` so a `require` below
its call site still counts. Measured blast radius on this repo: 854 findings,
555 outside test files — so the rule drops to `warn` in `recommended` until W6
measures its FP profile, with the severity locked by a test.

With that fixed there is nothing left for M4 to detect that would not be a
second plugin reporting the same line. **W2 ships 3 of 4 rules; the fourth is
the fix it exposed.**

### 5.4 A2 ships to 2 SDKs, not 3 — Gemini has no escape hatch

`no-browser-api-key-exposure` detects `dangerouslyAllowBrowser: true`. Before
porting it, the flag was looked up in each SDK's **published tarball** rather
than assumed:

| SDK | Flag |
|---|---|
| `openai@6` | `dangerouslyAllowBrowser` |
| `@anthropic-ai/sdk@0.115` | `dangerouslyAllowBrowser` (`client.d.ts:140`) |
| `@google/generative-ai@0.24` | none |
| `@google/genai@2.15` | none |

Anthropic ports exactly — same flag, same semantics, and the SDK's own JSDoc
says client-side use "risks exposing your secret API credentials to attackers".

Neither Gemini SDK has one, because neither refuses the browser in the first
place. There is no flag to detect, and the real risk — using a Gemini key from
client-side code at all — is not statically visible: a linter cannot tell
whether a file ships to a browser. A rule invented to fill the row would report
correct server code. **Gemini does not get this rule**, for the same reason O1
covers 2 drivers and not 7 (§5.2).

### 5.5 Installing in a fresh worktree

A plain install, run outside the agent sandbox:

```bash
npm install --no-audit --no-fund
```

~2100 packages in ~45s, and both workspace lifecycle scripts run — the root
`prepare` (`lefthook install`) and `apps/docs`'s `postinstall` (`fumadocs-mdx`,
which generates `apps/docs/.source`, imported by the docs app). Verify
`apps/docs/.source` exists afterwards; if it does not, the postinstall was
skipped and the docs suite is running against a stale generated tree.

**Do not reach for `--ignore-scripts`.** It completes, but it silently skips
both of the above. An earlier revision of this document recommended it, and the
first round of results here was validated against that incomplete tree.

**Do not act on npm's cache error either.** A sandboxed install reports "Your
cache folder contains root-owned files… run `sudo chown -R 502:20 ~/.npm`".
That is a canned response to any EPERM under the cache path, not a finding:
`~/.npm` on this machine is entirely `ofri:staff`, and npm prints the same
message when pointed at a scratch cache directory created seconds earlier.
Chowning it changes nothing. An earlier revision recommended that sudo too.

What the sandbox actually blocks is a small number of file writes: dependency
postinstall scripts, and `apps/docs`'s Next build (`copyfile` into
`.next/standalone/`). Run install and the docs build outside it.

**npm 11 withholds dependency install scripts** pending `npm approve-scripts`
— currently `sharp`, `esbuild`, and `unrs-resolver`. No approval is needed:
each ships its native binary through a platform `optionalDependencies` package,
and the withheld script is only a validation/download fallback. Verified on
this machine — `esbuild --version`, a `sharp` encode, and a `unrs-resolver`
require all succeed without them. Approving install scripts is a supply-chain
trust decision and belongs to Ofri, not to an agent.


### 5.6 A4 is blocked, and finding out why exposed a shipped defect

A4 says "model output flowing into `eval`/`exec`/`innerHTML`/a query sink". Every
one of those sinks is already owned by another plugin — `browser-security`
(`no-eval`, `no-innerhtml`), `node-security` (`detect-eval-with-expression`,
`detect-child-process`, `no-shell-injection`). Under §1.1 a second rule reporting
the same line is a taxonomy violation, so the question was how the ecosystem
already handles a source-specific rule sitting on a shared sink.

It handles it badly. `browser-security` ships four such rules
(`no-websocket-innerhtml`, `no-postmessage-innerhtml`, `no-filereader-innerhtml`,
`no-worker-message-innerhtml`) plus `no-websocket-eval`, and with
`recommended` and nothing else enabled, **every source shape reported more than
once at the identical range**:

| code | rules that fired |
|---|---|
| WebSocket → `innerHTML` | `no-innerhtml` + `no-websocket-innerhtml` |
| WebSocket → `eval` | `no-eval` + `no-websocket-eval` |
| `postMessage` → `innerHTML` | `no-innerhtml` + `no-postmessage-innerhtml` + `no-websocket-innerhtml` |
| FileReader → `innerHTML` | `no-innerhtml` + `no-filereader-innerhtml` |
| Worker → `innerHTML` | `no-innerhtml` + `no-websocket-innerhtml` + `no-worker-message-innerhtml` |

Measured against the built plugin, at identical `line:column-endLine:endColumn`,
so it is not a one-line-snippet artifact.

A second defect fell out of the same probe: `no-websocket-innerhtml` never
checked for a WebSocket. It gated on `X.onmessage`, which `postMessage` and
Worker handlers also are, so it reported them as "WebSocket message data" and
cited the WebSocket MDN page for code containing no WebSocket. Its real gate was
"is a message handler".

**Fix (#409):** devkit gains `createPayloadResolver`, which resolves a handler's
receiver back to its construction. The ownership rule:

> A source rule reports only what it can **positively attribute**. The generic
> rule reports everything else.

The two tests are complements, so exactly one rule reports any value. An
unresolvable receiver falls to the generic rule rather than being called a
WebSocket — nothing goes unreported, the finding changes rules and stops
claiming a provenance it cannot prove.

**What this means for A4.** A4 ships under the same rule or not at all: the
agentic plugins may report a sink *only* where they can prove the value came
from an inference call, and everything else stays with the generic rules. That
is a narrower rule than the plan implies, and it may turn out that the provable
set is small enough that A4 is not worth a rule at all — the M4 outcome in §5.3.
Decide that on the corpus in W6, not in advance.

**Transferable lesson.** Both defects survived because every rule was tested
alone. A per-rule suite cannot see a duplicate finding; only running two rules
over one file can. Any plugin with a generic rule *and* a specific rule on the
same sink is a candidate — check `secure-coding` and `node-security` next.
