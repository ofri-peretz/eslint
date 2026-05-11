# Type-Awareness Philosophy — Interlace ESLint Ecosystem

> **TL;DR**: 393 / 397 of our rules are **type-unaware**. This is intentional. Type-unaware rules run in <1s on a million-LOC codebase via oxlint; type-aware rules run in 30–120s via ESLint+TS. The gap doesn't have to be permanent — `tsgo` and oxlint's roadmap close it — but until then we keep the syntactic-first feedback loop and pay for type-checking only where it earns its keep.

_Last updated: 2026-05-09 — see [`type-awareness-audit.md`](./type-awareness-audit.md) for the per-rule classification._

---

## The policy, in one line

**Avoid type-awareness whenever we can. Type-unaware is the default. Only go type-aware when type-unaware would genuinely compromise the rule's quality.**

This is a quality-conditional preference, not absolutism. Type-unawareness is good for performance — it's how we deliver oxlint-tier feedback latency. But we will not preserve it at the cost of recall or precision on a rule's CWE corpus. When the type-unaware path materially degrades quality, we go type-aware honestly and document the cost. Until that bar is hit, we stay syntactic.

§§ 2–6 below explain why this default exists, what "earns its keep" means in practice, and what tooling changes would let us revisit it.

---

## 1. The terminology, aligned with the ecosystem

We use the canonical labels from `typescript-eslint` and oxlint. Don't invent new ones.

| Label (ours) | typescript-eslint | oxlint | What it means in code |
| :--- | :--- | :--- | :--- |
| **Type-unaware** | "type-unaware", "non-typed" | "syntactic" | Operates on the AST only. No `parserServices.program`. Runs on plain JS, on TS without `parserOptions.project`, and inside oxlint's JS-plugin tier. |
| **Type-aware (graceful)** | "type-aware" with no-op fallback | n/a | Calls `getParserServices()` but exits early via `if (!hasParserServices(context)) return {}`. Provides value only when types are available; silent (not broken) when they aren't. |
| **Type-aware (refining)** | "type-aware" with optional precision | n/a | Pure-AST detection runs always; type info refines precision via `hasParserServices()`-guarded branches. Ships value in both modes. |
| **Type-aware (hard)** | "type-aware" | "semantic" / "type-checked" (planned) | Requires the TS program. Returns no findings (or crashes) without it. Cannot run in oxlint today. |

`meta.docs.requiresTypeChecking: true` is the typescript-eslint flag for the last two categories. **Zero of our rules set it today.** That's the headline.

---

## 2. Why we default to type-unaware

### 2a. The performance gap is enormous

On a representative TS monorepo (Snappy `payload`, ~250K LOC, 1,200 files):

| Tier | What runs | Cold | Warm (cache hit) | Files / sec |
| :--- | :--- | :---: | :---: | ---: |
| **Tier 1 — oxlint syntactic** | native Rust, AST only | **0.06 s** | 0.06 s | ~20,000 |
| **Tier 2 — oxlint + JS plugins** | Tier 1 + Interlace rules via JS-plugin shim | **0.81 s** | 0.81 s | ~1,500 |
| **Tier 3 — ESLint type-unaware** | full ESLint, no `parserOptions.project` | **5.3 s** | 1.4 s | ~230 |
| **Tier 4 — ESLint type-aware** | full ESLint with TS program | **47 s** | 18 s | ~25 |

(Data: `benchmarks/results/ilb-perf-import/2026-01-02.json` for Tier 1–2; Tier 3–4 measured 2026-04-22 against the same corpus.)

The cliff between Tier 3 and Tier 4 — **~9× slower cold, ~13× slower warm** — is the cost of spinning up a TypeScript program, walking the symbol graph, and resolving `getTypeAtLocation()` for every rule that asks. It's not the lint logic; it's the type-checker.

### 2b. The cost is not constant — it scales superlinearly with project size

A clean Tier-3 run is roughly O(files). Tier 4 is closer to O(files × cross-file references): adding a file that's imported by N others increases work everywhere. On large monorepos (>1M LOC) we've seen Tier-4 cold runs hit 4–7 minutes — past the threshold where developers stop running the linter pre-push.

**This is the death of the inner-loop.** A linter that takes longer than `git push` becomes a CI-only check, and CI-only checks find bugs days late.

### 2c. Type-unaware rules are not "weaker"

A common misread: "type-aware = better, type-unaware = simpler." In practice, type-unaware rules can match or exceed type-aware precision when:

- The pattern has a **narrow signature** (e.g. `postMessage(data, '*')` — wildcard origin is wrong regardless of type).
- The semantics are **decided by the call shape**, not the operand type (e.g. `client.query(\`SELECT * FROM users WHERE id=${id}\`)` — template-string interpolation is the smoking gun, the type of `id` is irrelevant).
- The rule has access to **ambient signals** that are cheaper than types: variable names, identifier scope, regex literal structure, JSX attribute presence.

Our flagship rules (see [`flagship-rules.md`](./flagship-rules.md)) are type-unaware on purpose. The ones that *would* benefit most from type info — `secure-coding/detect-object-injection` — use it as an optional refiner with a pure-AST fallback.

---

## 3. When type-awareness *does* earn its keep

We don't reject type-aware rules dogmatically. They earn their slot when:

1. **The check is undecidable without types.** Example: `no-floating-promises` (typescript-eslint) — knowing whether an expression returns `Promise<T>` requires the checker.
2. **The pattern's ambiguity is high.** Example: `import-next/named` — verifying that `import { foo } from 'pkg'` resolves to a real export requires symbol resolution. The fallback (regex-matching exports) generates too many FPs.
3. **The cost is bounded.** A rule that calls `getTypeAtLocation` once per match is acceptable; one that calls it for every Identifier node multiplies the type-checker cost ×N.

**Today, only 4 of our 397 rules cross this threshold:**

| Rule | Plugin | Mode | Why types earn it |
| :--- | :--- | :--- | :--- |
| `named` | `import-next` | type-aware (graceful) | Symbol resolution to verify named export exists. |
| `namespace` | `import-next` | type-aware (graceful) | Validates `ns.member` access against the imported module's exports. |
| `default` | `import-next` | type-aware (graceful) | Resolves whether a module has a default export. |
| `detect-object-injection` | `secure-coding` | type-aware (refining) | Type-narrowing rules out safe union-of-string-literals indexes. Pure-AST fallback still fires. |

That's it. Everywhere else, the type-unaware path is good enough — and the `parserServices` cost would be net-negative on the inner loop.

---

## 4. The roadmap that closes the gap: tsgo + oxlint

The current Tier-3 → Tier-4 cliff is a TypeScript-compiler bottleneck, not a linter bottleneck. Two converging projects make the cliff vanish:

### 4a. tsgo — TypeScript ported to Go (Microsoft)

Announced 2025; targets ~10× speedup on the type-checker by:
- Replacing the JS/TS implementation with a native Go binary
- Parallelizing program construction across cores
- Sharing a single program instance across linter / IDE / build

Rough projection on the same corpus: Tier-4 cold goes from **47 s → ~5 s**. Same _quality_ of type-aware checks, with feedback that fits inside the inner loop.

### 4b. oxlint type-aware support (planned)

oxlint ships a JS-plugin tier today that hosts our type-unaware rules. The roadmap pairs the JS-plugin host with a native type service backed by **either** `tsc-go` or oxc's own type-checking effort. When that lands:

- A flagship rule that wants type info ships once as a JS plugin.
- The host provides a `getType(node)` API backed by tsgo.
- The same rule runs in <1s tier instead of >30s tier.

This is the inflection point: **type-aware stops being a perf tax**.

### 4c. Project Service (typescript-eslint) — the bridge

Until tsgo+oxlint land, the `@typescript-eslint/project-service` model — auto-discovering tsconfigs, sharing a single program across rule invocations, and using TypeScript's incremental APIs — already cuts Tier-4 warm runs by 30–60%. It's the right interim default for any project where flipping a flagship rule type-aware would earn its slot.

---

## 5. Saving type-checking without compromising quality

If you can't get to tsgo yet, you can still pay less without losing signal. The strategies, in order of leverage:

### 5a. Tier the lint pipeline

Run cheap rules everywhere, expensive rules only where they matter:

```
Save              → Tier 1 (oxlint syntactic)        — <100 ms, every keystroke
Pre-commit        → Tier 1 + Tier 2 (oxlint+plugins) — <2 s, on staged files only
Pre-push          → Tier 3 (ESLint type-unaware)     — 1–5 s, full repo
Pull request      → Tier 4 (ESLint type-aware)       — 30 s–5 min, full repo, parallel
Nightly           → Tier 4 + cross-repo benches      — full Wild + Edge corpus
```

Each tier provides confidence proportional to its cost. The fastest tier runs on every save; the slowest runs once per PR. **Confidence accumulates** — by the time a PR opens, Tiers 1–3 have already greenlit it on the dev's machine.

### 5b. Scope type-aware rules to changed files

`eslint --cache` + `lint-staged` already do this in spirit. For large repos add:
- Type-aware rules in a separate ESLint config (`eslint.config.types.js`)
- Run that config only on changed files in CI (`gh pr diff --name-only`)
- Run the type-unaware config on the full repo

This trades absolute coverage for inner-loop speed and recovers it nightly.

### 5c. Batch the program

A type-aware rule pays for `program.getTypeChecker()` once per ESLint invocation, not once per rule. If you need *one* type-aware rule, you may as well run all your type-aware rules in the same pass. Configure them in a single ESLint run; don't fan-out across multiple invocations.

### 5d. Parallelize at the file level

ESLint 9.x supports `--concurrency`. On an 8-core box, Tier-4 cold drops 4–6×. Combined with the project service's shared program, it's the largest single perf win available without changing tooling.

### 5e. Promote rules from type-aware → type-unaware when possible

If a type-aware rule's TP set on real corpora can be reproduced by syntactic patterns at >95% recall, the type-aware path is dead weight. Audit annually: any rule whose type-aware contribution is below the noise floor gets moved to pure-AST.

---

## 6. CI / feedback-loop philosophy — confidence as a function of latency

The deeper question this whole thing answers: **what does each lint tier buy us, and when?**

```
                                CONFIDENCE
                                    ▲
                                    │
                Tier 4 ─────────────┤ "PR is mergeable"
                                    │
                Tier 3 ─────────────┤ "Code likely compiles + ships"
                                    │
                Tier 2 ─────────────┤ "No security regressions in changed files"
                                    │
                Tier 1 ─────────────┤ "Syntax is clean, suspicious patterns flagged"
                                    │
                                    └──────────────────► LATENCY
                                       100 ms     30 s
```

The feedback-loop philosophy follows three principles:

### 6a. Latency is a tax on the iteration count

The number of times a developer can change-run-observe in an hour is `3600 / (think + edit + lint + test)`. Cutting the lint term from 5 s → 100 ms doesn't make any single iteration much better; it lets the developer try **3–5× more iterations** before fatigue. Confidence is discovered, not declared. More iterations → more discovered confidence.

### 6b. Where you spend confidence is where you build trust

Two failure modes of CI design:
- **Trust deficit**: cheap checks miss real bugs → engineers stop trusting the green check → manual review becomes mandatory → throughput collapses.
- **Trust surplus**: expensive checks run before cheap ones → every PR waits 30 min → engineers batch changes → batches grow → reviews slip → throughput collapses.

The two-tier design above avoids both: **Tier 1 catches almost everything for almost-no-cost**; Tier 4 catches the rest for cost-proportional-to-blast-radius.

### 6c. Confidence compounds across the team

In a team of 1, you can carry the inner loop in your head: "I know I just refactored the auth module — I'll be careful." In a team of 50, that knowledge doesn't propagate. The linter has to substitute for the missing context. Type-unaware rules with high precision are the cheapest way to get a 50-person team to **deliver with the confidence of a 5-person team** — every developer's PR carries the team's accumulated knowledge of what counts as "wrong here."

This is the productivity argument: **confidence early → faster iteration → more deliveries**. At small scale you don't need it. At larger scale it's the difference between a team that ships every day and a team that ships every sprint.

---

## 7. How this shapes our roadmap

Concrete commitments derived from the philosophy:

1. **Default type-unaware.** New rules ship type-unaware unless they meet the "earns its keep" bar in §3. The PR template includes a "type-awareness justification" field.
2. **Flagship rules MUST stay type-unaware.** Any PR that adds `getType*` to a flagship rule fails CI (`oxlint:flagship` shim load test).
3. **Type-aware rules disclose their tier.** Every type-aware rule's docs state its Tier-4 cost and the SLO under which it earns inclusion in `recommended`.
4. **The audit lives in one place.** [`type-awareness-audit.md`](./type-awareness-audit.md) is the single source. README rule tables surface a `Type-aware?` column derived from the audit; they don't mint their own classifications.
5. **Tier-3 is the per-PR default.** CI runs Tier 3 on every PR. Tier 4 runs on PRs that touch files matched by the type-aware config (a small subset of the repo today).
6. **We re-evaluate when tsgo + oxlint type-aware land.** The plan is to remove the type-aware-as-tax framing entirely once both are GA. The audit doc tracks the transition; the philosophy doc gets a §8 when it happens.

---

## 8. Open questions

- **Cross-rule type-program sharing inside oxlint** — even within a single ESLint run, the typescript-eslint project service shares the program across rules. Will oxlint's JS-plugin host expose the same? (Tracking: oxc-project/oxc-resolver discussions.)
- **Should `import-next/named` move to refining mode?** Today it returns `{}` without types. Building a syntactic fallback (e.g., parse the resolved file and read its export list directly) would let it provide partial value in oxlint's JS-plugin tier without waiting for tsgo.
- **What's the right SLO for Tier-4 in CI?** We've held ≤5 min as a soft cap. Should we tighten to ≤2 min when concurrency support is widespread?

---

## Related docs

- [Flagship rules](./flagship-rules.md) — the 10 rules that anchor the syntactic-first commitment
- [Type-awareness audit](./type-awareness-audit.md) — the per-rule classification
- [Plugin classification guide](./plugin-rule-classification-guide.md) — where rules belong
- [Compatibility matrix](./compatibility-matrix.md) — Node / ESLint / TS support
- [Oxlint integration](../docs/oxlint-integration.md) — JS-plugin shim, native-port roadmap
- typescript-eslint typed-linting glossary: https://typescript-eslint.io/getting-started/typed-linting
- TypeScript Native (tsgo) announcement: https://devblogs.microsoft.com/typescript/typescript-native-port/
