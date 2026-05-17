# Tooling Interop & Static-Analysis Philosophy

A standalone engineering philosophy. Where [DOCS_PHILOSOPHY.md](./DOCS_PHILOSOPHY.md)
governs what a rule looks like to a reader, and [URL_PHILOSOPHY.md](./URL_PHILOSOPHY.md)
governs where it lives, **this document governs what engine runs it, and
what we promise about that engine being replaceable.**

The Rust/Go rewrite wave — oxlint, Biome, swc, the Go port of TSC, stc — is
the largest re-platforming JavaScript tooling has seen since ESLint
itself shipped in 2013. Treating it as "a faster ESLint" is a mistake.
It is a re-platforming of the substrate the entire static-analysis
ecosystem runs on. **The plugins that survive this transition will be
the ones that committed to runtime portability before they had to.**

---

## The core rule

> **Rules are portable. Runtimes are not. We commit to rule semantics;
> we do not commit to a single engine.**

Three things follow from this. Every rule we ship must (a) be expressible
as a pattern over an AST (plus, for the deep tier, a type graph), (b)
declare which runtimes it is known to behave identically under, and (c)
treat the engine that executes the pattern — ESLint today, oxlint
tomorrow, a TSC 7 plugin host eventually — as an implementation detail
the rule's docs do not depend on.

---

## The two tiers

Every rule we ship belongs to exactly one tier. The tier is part of the
rule's metadata, surfaced on its docs page, and used by CI to route the
rule to the correct engine.

### Fast tier — `tier: fast`

- **Runtime budget:** sub-second on a 10k-LOC file, runnable on save.
- **Substrate:** AST only. No type information, no cross-file resolution
  beyond what an import map provides.
- **Target engines:** oxlint primary; Biome secondary; ESLint as the
  compatibility floor.
- **Where it runs:** editor on save, pre-commit, the fast leg of CI.
- **Examples from our catalog:** the bulk of `conventions`,
  `modernization`, `modularity`, most of `react-features`, the
  AST-shape security checks in `secure-coding`.

### Deep tier — `tier: deep`

- **Runtime budget:** seconds, parallelizable, runs in CI.
- **Substrate:** AST + type graph + cross-file scope + (when needed)
  control-flow / dataflow.
- **Target engines:** ESLint primary today; TSC 7 plugin host as the
  inevitable second runtime once the type-checker is cheap enough to
  call per-edit.
- **Where it runs:** CI deep-leg, on-demand local runs, IDE background
  passes.
- **Examples from our catalog:** the four current type-aware rules,
  `pg/no-unsafe-query` (taint tracking), `import-next` cycle detection,
  anything that needs cross-file ownership of an identifier.

**No rule straddles tiers.** A rule that needs type information is
deep, period. If we discover a fast-tier rule has been quietly relying
on type information, that's a regression we fix or a re-classification
we document — not a graceful degradation we ship.

---

## The compatibility contract

The hardest commitment in this document, and the one that earns the
"portable" label:

> **A rule with `runtimes: [eslint, oxlint]` must produce identical
> diagnostics on identical input across both engines. Drift is a build
> failure, not a footnote.**

### What "identical" means

- Same set of files flagged.
- Same set of locations within each file (line, column, end-line,
  end-column).
- Same severity classification, modulo the user's config.
- Same `messageId`. Wording of `message` may differ; the `messageId`
  must not.
- Same autofix output, byte-for-byte, when both engines support fix.
  An engine that does not yet support fix may emit no fix; it may not
  emit a *different* fix.

### What is NOT in scope

- Performance. The whole point of the fast tier is that oxlint is
  faster; identical wall-clock time is not the goal.
- Plugin loading semantics. ESLint's flat config and oxlint's TOML
  config differ; we do not unify those, we document the equivalence.
- Engine-specific suggestions that are not autofixes. Suggestions are
  best-effort UX, not contract.

### How drift is detected

A fixture suite under `packages/<plugin>/test/fixtures/<rule>/` is run
under both engines on every PR. The fixture format is a directory of
`.ts`/`.tsx`/`.js`/`.jsx` files plus an `expected.json` that captures
the canonical diagnostic shape. The CI step asserts that **both
engines emit the canonical output**. Either engine drifting fails the
build.

The parity cache at `.agent/oxlint-parity-cache.json` is the
historical record of these runs. It is never edited by hand.

---

## Severity & config interop

The compatibility contract covers diagnostics. This section covers the
user-facing knobs that decide whether a diagnostic is emitted at all.

### Severity precedence

Each engine reads its own config — flat config for ESLint,
`oxlint.json` / TOML for oxlint, `biome.json` for Biome. **We do not
unify the config formats.** Instead:

- A rule's severity in each engine is whatever the user's config for
  that engine says. We make no attempt to mirror severity across
  engines at lint time.
- When a rule is `off` in one engine and `error` in another, both
  states are valid. The user owns their own configuration drift; we
  document equivalent stanzas on the rule's docs page so the drift is
  intentional, not accidental.
- **Presets are mirrored across engines.** A rule that is
  `recommended` in our ESLint config is `recommended` in our oxlint
  config. The severity a preset assigns may differ if the engine's
  preset taxonomy differs; *presence* in the preset is portable.

### Disable comments

The most-portable thing a user can do — silence a rule on one line —
must work identically across engines:

- `// eslint-disable-next-line <plugin>/<rule>` is the canonical form.
  Every runtime that hosts the rule must recognize it.
- Engine-specific syntaxes (`// oxlint-disable-next-line ...`) are
  recognized by their native engine. We don't ask users to write them
  and we don't render them in our docs.
- A disable directive for a rule that does not exist in one engine is
  a no-op in that engine, not an error. The user shouldn't be punished
  for a runtime-coverage gap they didn't create.

### Engine-neutral config format

We do not adopt one. The community is mid-experiment and committing
today is premature. When a neutral format emerges with three credible
engine implementations, we adopt it and document migration. Until then,
the docs page is the bridge.

---

## Rule metadata schema

Every rule's `meta` block must declare its position in the
interop world. Schema, expressed against our rule type:

```ts
type RuleMeta = {
  // ...standard ESLint meta fields...

  interop: {
    tier: 'fast' | 'deep';
    typeAware: boolean;
    runtimes: Array<'eslint' | 'oxlint' | 'biome'>;
    runtimesPlanned?: Array<'oxlint' | 'biome' | 'tsc7'>;
    parityFixture?: string;  // path to fixture dir, required when runtimes.length > 1
  };
};
```

Hard invariants enforced by `rule-doc-conformance`:

- `typeAware: true` implies `tier: 'deep'`. Type-aware fast-tier rules
  are forbidden.
- `runtimes.length > 1` implies `parityFixture` is set.
- `tier: 'fast'` implies `'oxlint'` appears in either `runtimes` or
  `runtimesPlanned`. A fast rule that cannot, even in principle, run
  on a native engine is mis-tiered.
- `runtimes` must always include `'eslint'`. ESLint is our floor;
  rules never drop the floor.

---

## Backfill for existing rules

The schema above is the destination, not the current state. As of this
document's publication, ~397 rules ship without `meta.interop`. The
transition is governed, not blanket.

- **Grandfather inference.** A rule without `meta.interop` is treated
  as `{ tier: 'deep', typeAware: <inferred>, runtimes: ['eslint'] }`.
  `typeAware` is inferred by scanning the rule's parser-services usage
  — conservative by design (over-classify rather than under-classify;
  a wrongly-deep rule is a missed optimization, a wrongly-fast rule
  is a parity bug).
- **No campaign PR.** We do not block on a 397-rule backfill. The
  metadata is added opportunistically: when a rule is edited for any
  reason, `meta.interop` is populated as part of the same change.
- **Flagship rules first.** The ten flagship rules
  (see flagship_rules.md (planned)
  and `.agent/flagship-rules.md`) get their `meta.interop` populated
  in a single dedicated PR before any opportunistic backfill begins.
  They are the rules whose interop story we cite externally; they
  must be exemplars.
- **Warn-then-fail.** The conformance check warns on missing
  `meta.interop` until 2026-09. After that, missing metadata is a
  build error on **touched rules only** — never a retroactive failure.
- **Promotion-gate immunity during backfill.** The shared-rule count
  that drives the parity-gate promotion is calculated against
  *declared* runtimes only. A rule that hasn't yet declared
  `runtimes: ['eslint', 'oxlint']` is invisible to the count. Backfill
  velocity cannot accidentally trip the gate flip.

---

## Runtime support matrix

The current state, declared explicitly. This table is the source of
truth for the support badges that appear on every rule docs page.

| Runtime    | Status              | What this means                                                                 |
| ---------- | ------------------- | ------------------------------------------------------------------------------- |
| ESLint     | **floor**           | Every rule runs here. Every rule's tests are authored against this engine.      |
| oxlint     | **automated peer**  | Shared rules have CI-enforced parity. Drift fails the build (advisory → blocker, see below). |
| Biome      | **reserved peer**   | First-class target in principle; parity automation pending. Manual spot-checks. |
| TSC 7 host | **watching**        | Re-evaluated when TSC 7 ships stable. No commitment before then. See "Vision".  |
| swc        | **not a target**    | swc is a compiler, not a lint host. Out of scope.                               |
| deno_lint  | **not a target**    | Forked from a separate rule corpus. Not on our portability path.                |

A rule's docs page renders the matrix entries it has declared via
`runtimes` / `runtimesPlanned`. Authors do not write the badges by
hand; the validator generates them.

### Asymmetry, named

oxlint and Biome are equal as portability targets in this philosophy.
They are not equal in our infrastructure today: the fixture runner
ships an oxlint adapter, and the Biome adapter is on the roadmap.
This is deliberate sequencing, not a preference. When the Biome
adapter lands, Biome graduates to **automated peer** through the
same promotion path defined below for oxlint — identical gate,
identical conditions, identical CI semantics. Until then, Biome
support on any individual rule is best-effort and lives in
`runtimesPlanned`, never `runtimes`.

---

## Editor surface

The portability contract is incomplete if it only covers the CLI.
Users meet our rules in their editor, not in a terminal — through the
language server. Every entry in the support matrix has an LSP
component or is folded into one: ESLint's LSP for ESLint, the Oxc
language server for oxlint, the Biome daemon, the TypeScript language
server for TSC 7 plugins. **Portability must hold across these
surfaces too.**

### Per-rule guarantees on every LSP

- **Same diagnostic surface.** A rule that emits a squiggle in
  ESLint's LSP emits a squiggle in oxlint's LSP. Same range, same
  severity, same `messageId`.
- **Same hover content.** The hover points at the canonical docs
  page — `/docs/<plugin>/<rule-slug>` — not an engine-specific
  anchor. The URL is the contract; the renderer is not.
- **Same code action.** A rule that exposes an autofix as a code
  action in one editor exposes it in the other. Action *title* may
  differ in wording; action *effect* must not.
- **No engine-exclusive quick-fixes.** A suggestion that exists only
  because one engine's plugin API supports something another's
  doesn't is not shipped. The contract is "what the user sees in any
  editor," not "what each engine can express."

### What we do not promise

- **Hover render quality.** Editors style hovers differently. We
  don't control that.
- **Performance parity in-editor.** The fast tier is faster
  end-to-end in the editor; that is its point. We promise
  *correctness* parity, not *speed* parity.
- **Code-action discoverability.** Editor UIs surface code actions
  differently (lightbulb, hotkey, palette). We promise the action
  *exists*, not how the user finds it.
- **Editor-specific extensions.** If a new editor or LSP host
  emerges, it inherits the contract by hosting one of the runtimes
  in the matrix. We do not write editor-specific plugins.

---

## When the parity gate becomes blocking

A mechanical promotion path. No vibes.

**Today (2026-05):** the parity check is **advisory**. It runs on every
PR, surfaces drift in the PR comment, and updates
`.agent/oxlint-parity-cache.json`. It does not fail CI.

**Promotion conditions, both required:**

1. **oxlint ships a stable 1.0** (or a public statement of equivalent
   maturity from the Oxc team).
2. **Our shared-rule count reaches ≥ 20.** This is a signal-to-noise
   call, not a round number. Below 20, a single regression is ≥ 5% of
   the shared corpus — a population so small that drift is handled
   case-by-case in PR review. Above 20, drift is a *population*
   signal worth automating against, and individual regressions stop
   reading as anomalies. The threshold is revisited (not necessarily
   moved) when we cross 10.

When both are true, parity drift becomes a **build failure** for any
rule listed in `runtimes`. The change is announced in the changelog
and gets a minor-version bump.

We do not lower the gate after raising it. If oxlint regresses, we
narrow `runtimes` on the affected rule and ship a tombstone-style
note on the docs page; we do not relax the contract.

---

## Vision: how we read the next 24 months

This section is the *why* behind the mechanics. It is opinionated.
The community is mid-transition and we are choosing a side.

### TSC 7 is the bigger story than oxlint

The Go port of the TypeScript compiler, announced by Anders Hejlsberg
in 2024 and tracking toward a stable release, is the single most
consequential change to JavaScript tooling in the last decade — bigger
than oxlint, bigger than Biome, bigger than swc. A type-checker that
runs ~10× faster does not just make type-checking faster; it makes
**type-aware static analysis cheap enough to be the default**.

Today, our policy in feedback_type_awareness_policy.md (planned)
is "prefer type-unaware; go type-aware only when quality genuinely
demands it." This is correct *for 2026*. The cost of a type-aware
rule today is high enough that the bar must be high.

**We commit to re-evaluating that policy when TSC 7 ships stable, and
no later than end of 2027 regardless.** When the type-checker is
sub-second on a 50k-LOC project, the cost calculus inverts. Rules
that are currently in the deep tier because they need types may
become fast-tier once the type lookup is free. We will not pretend
this change isn't coming; we will not migrate before the evidence
demands it either.

### The convergence point is the AST + type graph, not the runtime

The runtime wars (ESLint vs. oxlint vs. Biome vs. TSC plugins) are
the visible churn. The invisible convergence is that all four engines
operate on a recognizably similar substrate: an AST with positions,
a scope map, and — increasingly — a type graph. The plugin author
who treats their rule as "an opinion about a pattern on this
substrate" can hop runtimes with finite work. The plugin author who
treats their rule as "an ESLint plugin" is locked in.

We are betting on the substrate, not the runtime.

### Our position: we are the rule library, not the engine

There is a clear specialization happening:

- **Engine specialists** (the Oxc team, the Biome team, the TS team,
  the ESLint team) compete on speed, ergonomics, and platform
  integration.
- **Rule specialists** (us, typescript-eslint, eslint-plugin-import,
  eslint-plugin-react-hooks, the security-focused plugins) compete on
  correctness, coverage, and domain expertise.

These are different businesses. Engine speed is roughly a solved
problem within two years; rule correctness in domains like
`crypto`, `jwt`, `pg`, `vercel-ai-security` is a moving target tied
to the security landscape and the framework ecosystem. We win by
specializing on the harder, slower-moving problem and letting the
engine layer commoditize underneath us.

This is the strategic version of the core rule. *Rules portable,
runtimes commodity.*

### What we will not do

- We will not ship an "oxlint-only" rule. Engine-exclusivity locks
  out users we already have.
- We will not gate features on a runtime that hasn't shipped stable.
  TSC 7 plugin support is not a pre-condition for any rule we ship
  in 2026.
- We will not pick a side between oxlint and Biome at the philosophy
  level. Their roadmaps and rule corpora differ; both deserve first-
  class portability targets.
- We will not let benchmark-chasing dictate rule design. A type-aware
  rule that exists because it's the right rule, not because it's
  fast, is more valuable than a fast rule that's the wrong rule.

---

## Forbidden patterns

Hard bans. CI fails on these.

- **Type-aware rule in the fast tier.** Mis-tiered. Either drop the
  type lookup or re-tier as deep.
- **`runtimes` includes `oxlint` without a parity fixture.** Either
  add the fixture or move oxlint to `runtimesPlanned`.
- **Rule that imports from an engine-specific API outside the
  designated adapter layer.** ESLint-specific APIs are confined to
  the runtime adapter; the rule's core logic operates on the
  abstract AST.
- **Silent engine fallback.** A rule that runs in oxlint with a
  reduced check set and pretends it ran fully. Either run fully or
  do not declare oxlint support.
- **Engine-specific autofix divergence.** Two engines that both fix
  must produce the same fix. If only one engine can fix, the other
  emits no fix — not a different one.
- **Engine-exclusive quick-fix or suggestion.** A code action that
  exists only because one engine's plugin API supports it is not
  shipped. Drop the action or implement it on the other engine.
- **Preset asymmetry.** A rule that is `recommended` in one engine's
  preset config but absent from the equivalent preset in another. The
  *severity* may differ per engine taxonomy; *presence* must not.
- **Engine-specific hover or docs link.** Hover content must resolve
  to the canonical `/docs/<plugin>/<rule-slug>` URL — not to an
  engine-specific docs anchor, README section, or GitHub link.
- **Hand-edited parity cache.** The cache is a CI artifact. Hand
  edits fail the conformance check.

---

## CI enforcement

The rules above only hold if they're enforced. The repo carries:

- **Parity fixture runner.** For every rule with `runtimes.length > 1`,
  the fixture suite is executed under each declared engine on every PR.
  Output is canonicalized and diffed.
- **Tier-invariant lint.** `rule-doc-conformance` enforces the
  metadata invariants above (type-aware ⇒ deep, multi-runtime ⇒
  fixture, etc).
- **Support-matrix renderer.** Docs pages cannot hand-author their
  support badges; they read from `meta.interop`. PRs that mutate
  badges without mutating metadata fail.
- **Parity cache drift detection.** Manual edits to
  `.agent/oxlint-parity-cache.json` fail the conformance check.
- **Promotion-gate watcher.** A CI job reads the parity cache and the
  oxlint release feed; when the promotion conditions are met, it
  opens a PR flipping the gate from advisory to blocker. The flip is
  a human-approved change, not an automatic one.
- **Preset-mirror check.** Diff our `recommended` / `recommended-
  strict` rule lists across the engine configs we ship. Asymmetry in
  *presence* (a rule in one preset, absent from the other) fails CI.
  Asymmetry in *severity* is allowed but reported in the PR comment.
- **Code-action snapshot tests.** For rules with autofix, the
  generated edit is snapshotted per engine and diffed. This catches
  the autofix-divergence forbidden pattern without requiring full LSP
  emulation. Full LSP behavior (hover, diagnostic ranges) is covered
  by the parity fixture runner; quick-fix UI surfaces are not in CI
  scope today and rely on manual spot-checks.

Interop drift is treated the same way URL drift is treated in
`URL_PHILOSOPHY.md`: a build failure, not a deploy-time warning.

---

## How this gets used

When authoring or reviewing a rule, walk this checklist:

1. **Tier**: fast or deep? If the rule needs type info or cross-file
   resolution, it is deep. No exceptions.
2. **Runtimes — known**: which engines is the rule actually proven to
   behave identically on today? Set `runtimes` to that list.
3. **Runtimes — planned**: which engines should the rule eventually
   support? Set `runtimesPlanned`. If neither list contains a native
   engine for a fast rule, the rule is mis-tiered.
4. **Parity fixture**: if `runtimes.length > 1`, the fixture exists
   and the parity CI step is green. No exceptions.
5. **Metadata**: `meta.interop` is fully populated. The validator
   has run locally and passed.
6. **Docs**: the rule's MDX page does not name an engine in its
   description. "This rule flags X" is correct;  "This ESLint rule
   flags X" is wrong — the engine is an implementation detail.
7. **Autofix**: if the rule fixes, the fix is engine-independent. The
   parity fixture exercises the fix.
8. **Presets**: if the rule belongs in `recommended` for one engine,
   it belongs in `recommended` for every engine in `runtimes`.
   Severity can differ; presence cannot.
9. **Editor surface**: if the rule emits a code action, the action's
   effect is identical across engines. Hover content links to the
   canonical docs URL, not an engine-specific anchor.
10. **Backfill check** (for pre-schema rules): if this rule is being
    edited and lacks `meta.interop`, this PR populates it. Touched
    rules are not allowed to leave the conformance check warning.

If any answer is no, the rule is not yet shippable in its declared
runtime set. Narrow the set, or fix the gap.

---

## Revisit triggers

Every conditional commitment in this document, in one place. When any
row's trigger fires, the corresponding change is enacted via a PR that
edits this document first, then changes the implementation. This table
is the operational summary of the doc — not its source of truth.

| Trigger                                                  | What changes                                                                                                |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Today (2026-05, baseline)                                | Parity check is **advisory**. Backfill conformance check is **warn-only**.                                  |
| 2026-09                                                  | Backfill warn-window closes. Missing `meta.interop` on a **touched** rule becomes a build error.            |
| Shared-rule count reaches 10                             | Revisit (not necessarily move) the ≥ 20 promotion threshold; sanity-check the signal-to-noise rationale.    |
| Shared-rule count reaches 20 **and** oxlint ships 1.0    | Parity gate flips **advisory → blocker** via a human-approved PR opened by the watcher job.                 |
| Biome fixture adapter ships                              | Biome graduates `reserved peer` → `automated peer`. Same promotion path as oxlint runs from that point.     |
| TSC 7 ships stable                                       | Re-evaluate the type-awareness policy in `feedback_type_awareness_policy.md`. Type-aware tier rules may re-tier as fast. |
| End of 2027                                              | Hard re-evaluation of the type-awareness policy regardless of TSC 7 state. Document the decision either way.|
| A new credible engine emerges                            | Add a matrix row (status: `watching`). Define its promotion conditions in this section before any rule declares support. |
| oxlint regression on a rule we ship as `runtimes: oxlint`| Narrow `runtimes` on the affected rule; ship a tombstone-style docs note. The gate does not lower.          |

The watcher job that opens the promotion PR reads this table — adding
or amending a row is the canonical way to change a trigger. Triggers
in prose elsewhere in the document are mirrors of these rows, not
independent statements.

---

## Living document

The static-analysis platform is mid-transition. When a new runtime
becomes credible, when oxlint or Biome ships a stable major, when
TSC 7 lands, when our shared-rule count crosses a threshold —
**edit this document first**, then change the gate. The contract is
the document; the CI is its enforcement.
