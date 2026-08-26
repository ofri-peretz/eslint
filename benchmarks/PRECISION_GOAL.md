# Precision goal and the TP/FP evidence contract

> **Set 2026-08-26.** Owner: the rule-quality track.
> Numbers here are reproducible with `npx tsx benchmarks/score.ts`.

## Where we are

| Metric | Value | Basis |
| :--- | ---: | :--- |
| Precision (CWE corpus) | **99%** | TP 69 · FP 1 · TN 61 · FN 0 |
| Recall (CWE corpus) | **100%** | — |
| F1 | **99%** | — |
| Rules in the suite | **374** | across 30 plugins |
| CWE directories | **31** | 150 fixtures total |

Two further real-world false positives are written up and reproduced but not yet
scored — they sit in `benchmarks/corpus/_pending-rule-fix/` until the rules that
produce them are fixed. Counting them today would mean either a red `main` or a
raised false-positive budget, and a raised budget is how a false positive becomes
permanent. **Precision here is therefore an overstatement by exactly two known
defects**, and it stays one until those land.

**The headline number is not the interesting one.** 96% is measured on 133
hand-written samples covering 31 CWEs. It says nothing about the 374 rules, and
nothing about real third-party code — which is where every false positive that
has actually cost us a conversation came from.

Until 2026-08-26 this harness could not run at all (see the two commits that
precede this file); the precision figures published before that date were
produced by a scorer whose ESLint invocation always failed.

## The metric that actually matters

**Suppression rate: `eslint-disable` comments naming our rules, per adopter repo.**

That is precision measured by the only judge that counts — what a user does when
we are wrong. It is already observable without asking anyone:

- `IGNF/cartes.gouv.fr-entree-carto` — **36** disables, each with a hand-written
  French justification, all of them made unnecessary by later majors
- `aemdemos/lundbeck-vyepti` — 8 disables, 7 now stale

A synthetic corpus can be gamed by editing fixtures. Suppression count cannot.

## Goals

### Primary — real-world precision ≥ 98%, measured continuously

The per-CWE false-positive budget already exists and is already zero:
`scripts/recall-gate.ts` fails the build when any CWE gains a false positive.
What it lacks is **material** — it scores 133 hand-written fixtures, and the
false positives that cost us real conversations came from third-party code that
no one would think to invent.

So the work is not a new gate. It is feeding the gate we have: every FP verified
in the wild becomes a fixture, sourced to the repo and commit it came from.

### Secondary — zero net-new suppressions

No adopter should have to write an `eslint-disable` for one of our rules. Every
new one found in the wild is a precision bug with a reproduction attached.

### Coverage — every rule carries evidence

Today 31 CWEs have fixtures against 374 rules. A rule with no fixture has **no
precision data at all**, and the scorecard already flags these as `⚠️ none`.

| Milestone | Target | Measure |
| :--- | :--- | :--- |
| **M1** | every FP verified in the wild is pinned as a fixture | **4 landed 2026-08-26** (otel-propagation-extract, oauth-claims-extractor, dompurify-optional-chaining, typeorm-migration-name); ~8 more known |
| **M2** | FP budget file + CI gate live | a rule may never exceed its pinned-corpus finding budget |
| **M3** | 100 rules with a real-world safe fixture | measured, not estimated |
| **M4** | all 374 rules have ≥1 vulnerable + ≥1 safe fixture | closes the `⚠️ none` column entirely |

Realistic because M1 and M2 are days of work on evidence we already collected,
and every outreach scan feeds M3 automatically. Ambitious because M4 means
building evidence for 374 rules, which no comparable plugin ecosystem publishes.

## The evidence contract

Every verified true positive and every sealed false positive is recorded in the
same place, in the same shape.

```
benchmarks/corpus/CWE-NNN/
  vulnerable/<case>.js     a TP — this MUST be flagged
  safe/<case>.js           an FP we sealed — this MUST NOT be flagged
  manifest.json            cwe, expectedPlugins, per-fixture description
```

Every fixture carries provenance in its header:

```js
// CWE-022: safe — OpenTelemetry context propagation is not archive extraction
// @author        ofri-peretz
// @reviewedBy    benchmark-validator
// @lastReviewed  2026-08-26
// @source        diia-open-source/be-diia-app@<sha> src/grpc/grpcService.ts:280
// @sealed        node-security/no-zip-slip — a bare .extract() is not an archive
// This MUST NOT be flagged
```

`@source` is what makes a fixture worth more than an invented one: it names real
code, at a commit, that a real team ships. `@sealed` names the rule the fixture
holds down, so a reviewer can see at a glance which guarantee would break.

**Rule:** a false positive is not closed when the rule stops firing. It is closed
when a fixture exists that fails on the unfixed rule and passes on the fixed one
— the same standard the repo already applies to bugs.

## Known open items

| Item | Where | Status |
| :--- | :--- | :--- |
| `jwt/require-issuer-validation` + `require-audience-validation` + `require-max-age` fire on a minimal `jwt.verify` with a safe algorithm allowlist | `corpus/CWE-327/safe/verify-allowlist.js` | **open** — the only FP in the corpus. Decide whether these are hardening advice (warn) or defects (error) |
| Sanitizer detection blind to optional chaining — `DOMPurify?.sanitize()` reported as CWE-79 CRITICAL | `blocks/embed/embed.js` in 7 Adobe repos | in progress |
| `no-hardcoded-credentials` on TypeORM migration `name` fields | humanprotocol/human-protocol | **open**, ~20 occurrences |
| `no-timing-unsafe-compare` on `configHash !== desiredHash` | aws/n8n-nodes-agentcore | **open** |
| `pg/no-transaction-on-pool` hardcodes the identifier `pool` with no option | `packages/eslint-plugin-pg` | in progress |
