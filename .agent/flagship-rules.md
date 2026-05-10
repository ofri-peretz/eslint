# Flagship Rules — Interlace ESLint Ecosystem

> **Purpose**: Designate the 10 rules that represent the ecosystem's competitive edge. These get **dedicated independent benchmarks**, **oxlint-compatibility guarantees**, **type-awareness disclosure**, and **per-rule precision/recall SLOs**.

_Last updated: 2026-05-09_

---

## Selection criteria

A rule earns flagship status only if it satisfies all five:

1. **High impact** — maps to OWASP Top 10, OWASP LLM Top 10, MITRE CWE Top 25, or a critical quality concern.
2. **Strategic moat** — dominates a green-field niche (no real competitor) or is a head-to-head challenger to a market leader (`eslint-plugin-import`, `react-hooks`, `jsx-a11y`).
3. **Narrow, defensible signal** — fires on a specific construct with a verifiable definition. **No "generic" rules** (broad noisy patterns like "uses innerHTML", "any bracket access") even if the underlying CWE is famous.
4. **Type-unaware** — pure AST traversal; no required `parserServices.program` / TypeScript type checker. Required so the rule runs in oxlint's JS-plugin tier without falling back to ESLint's slow path.
5. **Stable + recommended** — already shipping in a `recommended` preset, with corpus coverage in `benchmarks/corpus/`.

### Why criterion 3 ("not generic")

A rule like `no-innerhtml` (flag every `el.innerHTML = …`) has high CVE pedigree but generates noise across React (`dangerouslySetInnerHTML`), sanitizer libraries (`DOMPurify.sanitize` → `innerHTML`), and templating systems. The flagship list elevates rules whose firing pattern is **inherently wrong in context**, not "potentially wrong." Two candidates were dropped on this basis (see "Rejected" below).

### Why criterion 4 (type-unaware) — terminology

| Term | Source | Meaning |
| :--- | :--- | :--- |
| **Type-unaware** | `typescript-eslint` | Rule operates on AST only; no `getParserServices().program`. Runs on plain JS, on TS without a project, and inside **oxlint's JS-plugin tier**. |
| **Type-aware** | `typescript-eslint` | Rule calls `program.getTypeChecker()` / `getTypeAtLocation()`. Requires a parsed TS program. **Cannot run in oxlint today** (blocked on tsgo). |
| **Syntactic** | oxlint / Rust linters | Equivalent to type-unaware. Used in oxlint docs/config. |
| **Semantic / type-checked** | oxlint roadmap | Equivalent to type-aware. Future tsgo work. |

We use **type-unaware** as the canonical label (matches `typescript-eslint` docs) and note the oxlint synonym ("syntactic") where it appears in oxlint configs.

A rule that uses `hasParserServices()` only as an optional precision booster, with a pure-AST fallback path, qualifies as **type-unaware** for flagship purposes — it must run correctly when the type checker is absent. Rules that require type info to fire at all are **type-aware** and ineligible.

---

## The 10

| # | Rule | Plugin | Concern | CWE / OWASP | Strategic role | Type-aware? | Oxlint |
| :- | :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| 1 | `no-cycle` | `import-next` | Circular dependencies | — / — | Head-to-head vs `eslint-plugin-import` (38.2M dl/wk). Already isolated in `ilb-perf-import`. | ❌ unaware | ✅ |
| 2 | `no-unsafe-query` | `pg` | SQL injection in node-postgres | CWE-89 / A03 | Green-field. **#1 oxlint native-port candidate.** | ❌ unaware | ✅ |
| 3 | `no-hardcoded-credentials` | `secure-coding` | Embedded secrets (entropy-filtered) | CWE-798 / A07 | Universal baseline. **#2 native-port candidate.** Beats `no-secrets` on CVSS-tagged messaging + entropy gating (not just regex). | ❌ unaware | ✅ |
| 4 | `no-redos-vulnerable-regex` | `secure-coding` | Catastrophic-backtracking regex | CWE-1333 / A05 | Performs static complexity analysis on regex literals (not "uses regex"). Beats `regexp/no-super-linear-backtracking` on actionable messaging. | ❌ unaware | ✅ |
| 5 | `no-unsafe-query` | `mongodb-security` | NoSQL operator injection | CWE-943 / A03 | Green-field — no competitor has `$where` / `$expr` / Mongoose-aware injection detection. | ❌ unaware | ✅ |
| 6 | `no-algorithm-none` | `jwt` | JWT alg-confusion | CWE-327 / A02 | Green-field — JWT-vertical anchor (CVE-2015-9235 reproduction class). | ❌ unaware | ✅ |
| 7 | `no-postmessage-wildcard-origin` | `browser-security` | iframe origin spoofing | CWE-346 / A01 | Narrow signature: `postMessage(data, '*')`. **No legitimate use case** — wildcard origin is a definitional bug. | ❌ unaware | ✅ |
| 8 | `hooks-exhaustive-deps` | `react-features` | Stale-closure / hook deps | — | Head-to-head vs `react-hooks/exhaustive-deps` — most-deployed React rule on npm. | ❌ unaware | ✅ |
| 9 | `alt-text` | `react-a11y` | A11y / WCAG 1.1.1 | WCAG 2.1 / Sec. 508 | Head-to-head vs `jsx-a11y/alt-text`. Most-cited a11y violation in audits. | ❌ unaware | ✅ |
| 10 | `no-unsafe-output-handling` | `vercel-ai-security` | LLM output → unsanitized sink | OWASP LLM02 | Green-field. Tracks `generateText` / `streamText` results into XSS sinks. No competitor exists. | ❌ unaware | ✅ |

**All 10 are type-unaware.** Verified by static check for `getType*`, `parserServices`, `TypeChecker`, `getProgram`, `hasParserServices` in each rule's source. None matched. This is intentional: a flagship rule that requires type info would silently fall out of oxlint's JS-plugin tier and lose the 12.6× speedup path — it could no longer be "benchmarked independently" in the oxlint comparison.

### Type-awareness rationale per rule

- **`import-next/no-cycle`** uses an external resolver (`oxc-resolver`) for filesystem lookups; this is module resolution, not type checking, and stays type-unaware. Do not conflate "needs filesystem access" with "type-aware."
- **`hooks-exhaustive-deps`** would be more accurate with type info (knowing whether a value is referentially stable), but the upstream `react-hooks` rule is also type-unaware, so a fair head-to-head requires we stay type-unaware too.
- **`secure-coding/no-hardcoded-credentials`** could use type info to drop FPs on test fixtures, but our entropy-gating + variable-name heuristic is intentionally syntactic to keep parity with oxlint's JS-plugin host.

---

## Rejected (initial picks dropped on the "not generic" criterion)

| Original pick | Replaced with | Why dropped |
| :--- | :--- | :--- |
| `secure-coding/detect-object-injection` | `secure-coding/no-redos-vulnerable-regex` | Too generic. Inherits the legacy `eslint-plugin-security/detect-object-injection` reputation (≈95% FP rate in real corpora — any `obj[var]` triggers it). Even with our tightened heuristics, the rule's firing condition is not narrow enough to defend a flagship slot. ReDoS detection, by contrast, performs objective complexity analysis on regex literals — a verifiable definition with low FP exposure. |
| `browser-security/no-innerhtml` | `browser-security/no-postmessage-wildcard-origin` | Too generic. `el.innerHTML = …` is legitimate via sanitizer libraries (`DOMPurify.sanitize().innerHTML`), templating systems, and React's `dangerouslySetInnerHTML`. The rule would either over-fire or duplicate `eslint-plugin-no-unsanitized`. By contrast, `postMessage(data, '*')` has **no legitimate use case** — wildcard origin in postMessage is a definitional bug, CWE-346. |

These two replacements bring the list to a uniform "narrow, defensible signal" bar.

---

## Domain coverage

```
Imports (1)        ─ no-cycle
Universal sec (2)  ─ no-hardcoded-credentials, no-redos-vulnerable-regex
DB sec (2)         ─ pg/no-unsafe-query, mongodb-security/no-unsafe-query
Identity sec (1)   ─ jwt/no-algorithm-none
Browser sec (1)    ─ no-postmessage-wildcard-origin
React (2)          ─ hooks-exhaustive-deps, alt-text
AI sec (1)         ─ no-unsafe-output-handling
```

Deliberate gaps: no flagship from `node-security`, `lambda-security`, `nestjs-security`, `express-security`, `crypto`, or any quality plugin (`maintainability`, `reliability`, `modernization`, `conventions`, `modularity`, `operability`). Each ships a `recommended` preset, but their highest-signal rules don't yet meet the head-to-head + type-unaware + non-generic bar. Re-evaluate quarterly.

---

## Using the flagship preset

Every plugin that hosts a flagship rule exports a `flagship` config that enables exactly that rule (or, for `secure-coding`, the two rules) at error level. Compose them yourself for a CI gate that checks only the 10:

```js
// eslint.config.mjs
import importNext from 'eslint-plugin-import-next';
import pg from 'eslint-plugin-pg';
import secureCoding from 'eslint-plugin-secure-coding';
import mongodb from 'eslint-plugin-mongodb-security';
import jwt from 'eslint-plugin-jwt';
import browserSecurity from 'eslint-plugin-browser-security';
import reactFeatures from 'eslint-plugin-react-features';
import reactA11y from 'eslint-plugin-react-a11y';
import vercelAi from 'eslint-plugin-vercel-ai-security';

export default [
  importNext.configs.flagship,
  pg.configs.flagship,
  secureCoding.configs.flagship,
  mongodb.configs.flagship,
  jwt.configs.flagship,
  browserSecurity.configs.flagship,
  reactFeatures.configs.flagship,
  reactA11y.configs.flagship,
  vercelAi.configs.flagship,
];
```

The flagship preset is intentionally minimal — only the rules in the list above. For broader coverage, layer it on top of each plugin's `recommended` preset.

## Independent benchmarking

Each flagship rule MUST have a per-rule entry in `benchmarks/results/ilb-flagship/<date>.json`:

- **Precision / recall / F1** with Wilson 95% CI on a rule-specific corpus subset.
- **ms/file (median)** + peak RSS, **single-rule isolated config** (no other rules loaded — this is what "benchmarked independently" means).
- **Type-awareness flag** — `unaware` for all 10 today; if any rule changes status, the bench fails until re-classified.
- **Oxlint compat status** — one of: `native-port`, `js-plugin-syntactic`, `eslint-only`. Flagship rules must be `native-port` or `js-plugin-syntactic`.
- **Head-to-head delta** for the four rules with named competitors (`no-cycle`, `hooks-exhaustive-deps`, `alt-text`, plus a partial overlap for `no-redos-vulnerable-regex` vs `regexp/no-super-linear-backtracking`).

### Bench plan

| Flagship rule | Existing bench | Action |
| :--- | :--- | :--- |
| `no-cycle` | `ilb-perf-import` | Already isolated. Promote into flagship dashboard. |
| `pg/no-unsafe-query` | ilb-juliet CWE-89 | Carve single-rule subset; isolated runner. |
| `secure-coding/no-hardcoded-credentials` | ilb-juliet CWE-798 | Carve subset. |
| `secure-coding/no-redos-vulnerable-regex` | — | New ReDoS fixture pack; head-to-head vs `regexp/no-super-linear-backtracking`. |
| `mongodb-security/no-unsafe-query` | ilb-arena | Add Mongo-specific fixture set ($where, $expr, allowDiskUse). |
| `jwt/no-algorithm-none` | ilb-arena | Add CVE-2015-9235 reproduction fixtures. |
| `browser-security/no-postmessage-wildcard-origin` | — | New fixture pack (legitimate same-origin + adversarial wildcard). |
| `react-features/hooks-exhaustive-deps` | — | New fixture pack; head-to-head vs `react-hooks/exhaustive-deps`. |
| `react-a11y/alt-text` | — | New fixture pack; head-to-head vs `jsx-a11y/alt-text`. |
| `vercel-ai-security/no-unsafe-output-handling` | — | OWASP LLM02 fixtures (`generateText` → innerHTML/eval). |

Wire into a new `npm run ilb:flagship` aggregator → writes `results/ilb-flagship/<date>.json` and adds rows to `benchmark-results/scorecard.md`.

### Per-rule SLOs

- **Precision** ≥ 90% on Arena (zero FPs on adversarial-real Edge corpus).
- **Recall** ≥ 95% on the rule's CWE corpus.
- **Latency** ≤ 5 ms/file isolated (single-rule config).
- **Stable for 14 days** before any flagship rule may be removed.
- **Type-awareness** must remain `unaware`. Any PR that introduces a `getType*` / `program` dependency in a flagship rule is a release blocker.

A regression on any flagship rule is weighted ×10 in `ilb:regression`.

### Latest bench numbers (v2.1, 2026-05-10 — after the 5 fixes)

Single-shot timings on `~/repos/ofriperetz.dev/oos/`. Full data: [`benchmarks/results/ilb-flagship/2026-05-10.json`](../benchmarks/results/ilb-flagship/2026-05-10.json). What changed vs v2 (2026-05-09):

| Rule | Repo | Ours v2 → v2.1 | Comp v2 → v2.1 | What changed |
| :--- | :--- | :--- | :--- | :--- |
| `import-next/no-cycle` | next.js | 0 → **914 unique** (2842 reports) | 0 → 0 | Fixed `nonCyclicFiles` cache poisoning by depth-truncated DFS. The competitor uses SCC-based detection so they're immune to the bug class — different algorithm, same answer (0 in their config). Our wide-scope recall recovered. |
| `pg/no-unsafe-query` | supabase | 0 → 0 (clean repo) | — | No change. Synthetic corpus: **P=R=F1=1.00** (3 vuln + 3 safe). |
| `secure-coding/no-hardcoded-credentials` | vercel-ai | 842 → **0** | 380 → 380 | Added `structural` vs `ambiguous` confidence tiers + credential-named context gate. All 807 ours-only FPs eliminated. Synthetic corpus went from P=0.67 R=1.00 F=0.80 to **P=R=F1=1.00**. (The 0 on real OSS is correct — vercel/ai's source has no actual hardcoded credentials; the 380 the competitor still reports are entropy-only matches in test fixtures.) |
| `secure-coding/no-redos-vulnerable-regex` | lodash | 1 → 1 (build-script context, not security per lodash threat model) | 0 → 0 | Adopted `scslre` for proper NFA-based detection. Heuristic kept as fallback. Catches Self-loop AND Trade patterns, distinguishes exponential vs polynomial. |
| `mongodb-security/no-unsafe-query` | payload | 233 → 233 (green-field) | — | No change. |
| `jwt/no-algorithm-none` | supabase | 0 → 0 (no `algorithm: 'none'` literals) | — | No change. |
| `browser-security/no-postmessage-wildcard-origin` | next.js | 2 → 2 (real CWE-346 in compiled `setimmediate`) | — | No change. Narrow signature, no FP risk. |
| `react-features/hooks-exhaustive-deps` | next.js | 83 → **105** (overlap 0/79/22 → **22/79/0**) | 44 → 44 | Added non-array-deps reporting + `TSAsExpression` (`as const`) handling. We now catch every finding the competitor caught (the 22 in `compiled/react-dom/cjs/*` we previously missed) AND keep our 79 ours-only wins. **Competitor no longer beats us on any line.** |
| `react-a11y/alt-text` | shadcn-ui | 1 (FP) → **0** | 0 → 0 | Added 4-element-type coverage (`<img>`, `<object>`, `<area>`, `<input type="image">`), custom-component support, and `role="presentation"` correct handling. Pre-fix our v2 finding (`alt={alt}` on a forwarded prop) was a false positive — we now correctly stay silent on dynamic alt expressions, matching jsx-a11y semantics. The element-type expansion will surface real findings on next.js / Next.js apps once we run a wider bench with `{ img: ['Image'] }` configured. |
| `vercel-ai-security/no-unsafe-output-handling` | vercel-ai | 0 → 0 (SDK source clean) | — | No change. |

**Cache effectiveness median (v2.1)**: ours-eslint **96%** (cold ~10s, warm ~410ms), competitor-eslint 92%, oxlint native 18% (already cheap). The 96% warm cache benefit is the inner-loop UX target — pre-commit / save runs fit in ~400ms even on 14K-file next.js.

**Synthetic corpus P/R/F1 — full smoke gate (9 rules, ground-truthed)**

After expanding the corpus to 7 new CWE/standard mappings, the `npm run ilb:flagship:smoke` gate (wired into `quality`) now covers 9 of the 10 flagship rules. `no-cycle` is the 10th — its corpus is repo-specific cycles, not a CWE pattern, so it stays out of the smoke gate.

| Rule | Corpus | P | R | F1 |
| :--- | :--- | ---: | ---: | ---: |
| `pg/no-unsafe-query` | CWE-89 | 1.00 | 1.00 | 1.00 |
| `secure-coding/no-hardcoded-credentials` | CWE-798 | 1.00 | 1.00 | 1.00 |
| `secure-coding/no-redos-vulnerable-regex` | CWE-1333 | 1.00 | 1.00 | 1.00 |
| `mongodb-security/no-unsafe-query` | CWE-943 | 1.00 | 1.00 | 1.00 |
| `jwt/no-algorithm-none` | CWE-327 | 1.00 | 1.00 | 1.00 |
| `browser-security/no-postmessage-wildcard-origin` | CWE-346 | 1.00 | 1.00 | 1.00 |
| `react-features/hooks-exhaustive-deps` | react-hooks | 1.00 | 1.00 | 1.00 |
| `react-a11y/alt-text` | WCAG 1.1.1 | 1.00 | 1.00 | 1.00 |
| `vercel-ai-security/no-unsafe-output-handling` | OWASP LLM02 | 1.00 | 1.00 | 1.00 |

Three real bugs were found and fixed during corpus seeding:

- `react-features/hooks-exhaustive-deps` — flagged inner-callback parameters (`(r) => r.json()`) as missing deps. Fixed: track `params` of nested ArrowFunction/FunctionExpression in the locally-declared set.
- `mongodb-security/no-unsafe-query` — missed `$where: \`...\${userInput}\`` because TemplateLiteral was stringified to `'[expression]'` before pattern matching. Fixed: `containsUserInput` now recurses into TemplateLiteral / BinaryExpression / CallExpression.
- `vercel-ai-security/no-unsafe-output-handling` — missed the idiomatic `const { text } = await generateText(...)` destructured pattern. Fixed: scope-track local variables bound to known AI SDK calls (`generateText`, `streamText`, `generateObject`, `streamObject`).

**alt-text on next.js with `{ img: ['Image'] }`** (manifest field `ruleOptions`): 3 findings on next.js source itself, all 3 stacks (ours / jsx-a11y / oxlint native) in perfect agreement. The same rule against next.js without the option — invisible. The custom-component config is what takes the rule from "useful in shadcn-only-style projects" to "useful in every Next.js app."

**Median-of-N timings** (the `--repeat=N` flag): single-shot timings showed visible variance (`jwt/no-algorithm-none` cold ranged 15s → 53s between runs). v2.1 still uses single-shot for full sweeps; for SLO-grade numbers, run `npm run ilb:flagship -- --rule=<id> --repeat=3` and read the `(min…max)` spread next to the median.

---

## Oxlint compatibility guarantees

All 10 rules MUST stay oxlint-compatible (`js-plugin-syntactic` or better). Concretely:

- **No `parserServices.program` / `getTypeChecker()`** — type-aware code paths are forbidden. Optional `hasParserServices()` precision boosters are allowed only with a pure-AST fallback.
- **No custom parser dependency** (Vue SFC, Astro, etc.).
- **Selectors and `context.report` only** — APIs the oxlint JS-plugin host doesn't yet implement are forbidden.
- **CI gate.** Add `npm run oxlint:flagship` to `quality` — runs the 10 rules through the oxlint JS-plugin shim against `benchmarks/corpus/`. Any rule that errors at oxlint load fails the gate.

### Native Rust port priority (upstream into oxlint)

1. `pg/no-unsafe-query` — highest CVSS, pure pattern matching, smallest AST surface.
2. `secure-coding/no-hardcoded-credentials` — common across all SDKs, entropy check is straightforward in Rust.
3. `mongodb-security/no-unsafe-query` — symmetric to (1).
4. `jwt/no-algorithm-none` — small, deterministic AST surface.
5. `browser-security/no-postmessage-wildcard-origin` — narrowest signature on the list (`CallExpression[callee.property.name='postMessage'][arguments.1.value='*']`).

The remaining 5 (`no-cycle`, `no-redos-vulnerable-regex`, `hooks-exhaustive-deps`, `alt-text`, `no-unsafe-output-handling`) stay as JS plugins:

- `no-cycle` needs a filesystem resolver + cross-file graph state.
- `no-redos-vulnerable-regex` needs an NFA-complexity analyzer (we use `safe-regex2` derivatives — easier to keep in JS).
- `hooks-exhaustive-deps` and `alt-text` need JSX support that varies between oxc and ESLint AST shapes.
- `no-unsafe-output-handling` tracks SDK-specific call patterns that mutate too quickly to vendor into Rust.

---

## Maintenance cadence

| Cadence | What | Who |
| :--- | :--- | :--- |
| Per-PR | `ilb:flagship` runs in CI; regressions block merge; oxlint shim load test gates type-awareness drift | benchmark-validator |
| Weekly | Refresh head-to-head competitor pins; re-run oxlint compat shim load test | maintainer |
| Quarterly | Re-evaluate the 10. Promote new candidates from `recommended`. Demote any rule below SLO for 30 days. Re-check the "not generic" bar against accumulated FP/FN data. | maintainer |
| Annually | Re-baseline ×10 weight in `ilb:regression`; revisit native-port priority list; revisit type-aware allowance if oxlint ships tsgo type-checking for JS plugins | maintainer |

---

## Related docs

- [Plugin rule classification guide](./plugin-rule-classification-guide.md) — where rules belong
- [Type-awareness philosophy](./type-awareness-philosophy.md) — why type-unaware-by-default, perf model, CI tiers, confidence ladder
- [Type-awareness audit](./type-awareness-audit.md) — per-rule classification (single source of truth for README columns)
- [Compatibility matrix](./compatibility-matrix.md) — Node/ESLint/TS support
- [Oxlint integration](../docs/oxlint-integration.md) — JS plugin shim and native-port roadmap
- [`benchmarks/README.md`](../benchmarks/README.md) — the 10 ILB benches
- typescript-eslint glossary on type-aware vs type-unaware: https://typescript-eslint.io/getting-started/typed-linting (canonical terminology)
