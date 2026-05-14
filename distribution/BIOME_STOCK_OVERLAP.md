# Biome stock rules — overlap map with Interlace plugins

> Biome (Rust, biomejs.dev) ships a built-in linter with rules organized
> into **functional groups** rather than per-plugin namespaces. As of
> Biome 1.x the rule set sits around **300–400 rules across 9 groups**.
> Authoritative count: `biome rage` and `biome explain <rule>` against
> the version we pin.
>
> Biome is currently a **reserved peer** in our engine matrix
> (`INTEROP_PHILOSOPHY.md`) — first-class portability target, parity
> adapter on the roadmap. Until the adapter ships, this document is
> the **best-effort, doc-only** view of where Biome's stock corpus
> meets ours. When the parity adapter lands, every claim here gets a
> CI-enforced fixture, the same as `oxlint-parity.yml`.
>
> Companion docs: `OXLINT_STOCK_OVERLAP.md` (sister document for the
> automated-peer engine), `ECOSYSTEM_LANDSCAPE.md`,
> `EVALUATION_METRICS.md`, `INTEROP_PHILOSOPHY.md`.
>
> Last updated: 2026-05-13.

---

## Method

Biome organizes rules into **functional groups** (a11y, complexity,
correctness, performance, security, style, suspicious, nursery,
source). For each group we record:

- **Approximate count** in current Biome stable.
- **Closest Interlace plugin(s).**
- **Overlap shape** — same definitions as
  `OXLINT_STOCK_OVERLAP.md`: *full*, *partial-shared-rule-names*,
  *adjacent-different-scope*, *no-overlap*.
- **Where we add depth** — when the answer is "we don't, Biome
  covers it well" that is the right answer.

---

## Per-group overlap

### `lint/a11y`

- **Approximate count:** ~30 rules (`useAltText`,
  `useValidAnchor`, `useAriaPropsForRole`, etc.).
- **Closest Interlace plugin:** `react-a11y` (37 rules).
- **Overlap shape:** partial-shared-rule-names. Biome's a11y group
  is React/JSX-aware but smaller than `eslint-plugin-jsx-a11y` and
  our `react-a11y`.
- **Where we add depth:** wider element-type coverage on
  `alt-text` (see
  `apps/docs/content/articles/alt-text-the-element-types-jsx-a11y-checks-that-most-eslint-rules-skip.mdx`);
  integration with `react-features` for cross-rule context.

### `lint/complexity`

- **Approximate count:** ~30 rules (`noExcessiveCognitiveComplexity`,
  `noStaticOnlyClass`, `useSimplifiedLogicExpression`, etc.).
- **Closest Interlace plugin:** `maintainability` (12 rules), parts
  of `modernization` (3 rules).
- **Overlap shape:** adjacent-different-scope. Biome ships
  complexity as a first-class group; our `maintainability` does the
  same.
- **Where we add depth:** narrower opinion (we ship 12 rules
  deliberately); per-rule CWE / quality-attribute metadata Biome
  does not include in its rule schema.

### `lint/correctness`

- **Approximate count:** ~60 rules — `noUnusedVariables`,
  `noUnreachable`, `useExhaustiveDependencies` (React hooks),
  `noConstantCondition`, etc.
- **Closest Interlace plugin:** `reliability` (9 rules) is closest;
  `react-features` overlaps on
  `useExhaustiveDependencies` ↔ `hooks-exhaustive-deps`.
- **Overlap shape:** partial-shared-rule-names on
  `hooks-exhaustive-deps` (re-implementation territory, see
  `competitor_study_2026-05-09.md`).
- **Where we add depth:** the non-array-deps reporting gap we close
  in `react-features/hooks-exhaustive-deps` — same shape of value-add
  as against Oxlint's `react-hooks/exhaustive-deps` namespace.

### `lint/performance`

- **Approximate count:** ~10 rules (`noAccumulatingSpread`,
  `noDelete`, `useTopLevelRegex`, etc.).
- **Closest Interlace plugin:** parts of `react-features` (perf
  anti-patterns), `maintainability`.
- **Overlap shape:** adjacent-different-scope.
- **Where we add depth:** framework-specific perf anti-patterns
  (React render allocation, async waterfalls) Biome's generic
  performance group doesn't reach.

### `lint/security`

- **Approximate count:** ~5 rules (`noDangerouslySetInnerHtml`,
  `noGlobalEval`, `noDangerouslySetInnerHtmlWithChildren`, etc.).
- **Closest Interlace plugin:** `secure-coding` (27 rules),
  `browser-security` (45 rules), and the 8 other security verticals
  (177 more rules).
- **Overlap shape:** ours is a **superset by ~50×**. Biome's
  security group covers the most foundational web XSS sinks; our
  ten security plugins cover the OWASP Top 10 + JWT, MongoDB,
  PostgreSQL, Express, NestJS, AWS Lambda, Vercel AI SDK, plus the
  full Node-security and browser-security surface.
- **Where we add depth:** the entire security shelf except for
  the few foundational sinks Biome covers.

### `lint/style`

- **Approximate count:** ~70 rules (`useShorthandArrayType`,
  `useNamingConvention`, `useImportType`, etc.).
- **Closest Interlace plugin:** `conventions` (11 rules), parts of
  `modernization` (3 rules).
- **Overlap shape:** Biome's biggest group. Adjacent /
  partial-shared-rule-names with `conventions` on a handful of
  rules.
- **Where we add depth:** intentionally narrow opinion. Where
  Biome covers a style preference well, we should not duplicate.
  This is a community-positive deferral.

### `lint/suspicious`

- **Approximate count:** ~60 rules (`noConsole`,
  `noDoubleEquals`, `noEmptyInterface`, etc.).
- **Closest Interlace plugin:** parts of `reliability`,
  `modernization`, `secure-coding` (`no-eval`-style).
- **Overlap shape:** partial-shared-rule-names on a few foundational
  rules; mostly adjacent-different-scope.
- **Where we add depth:** none on the foundationals where Biome's
  rule subsumes ours; we add the metadata layer.

### `lint/nursery`

- **Approximate count:** moving target — experimental / pre-stable
  rules. Biome promotes nursery rules into other groups as they
  stabilize.
- **Closest Interlace plugin:** varies by rule.
- **Overlap shape:** treat each promoted rule individually when it
  graduates. Don't pre-mirror.

### `source` (formatter rules, not lint)

- **Approximate count:** the formatter half of Biome — not lint.
- **Overlap shape:** no-overlap. Interlace does not ship a
  formatter. Biome's formatter coexists with our linter peacefully
  the same way Prettier does today.

---

## Where Biome stock has no presence

The same shape as the Oxlint table — Biome's `lint/security` group is
the only thing that touches our security verticals, and it covers the
most foundational sinks plus a few rules around dangerous-HTML in
JSX. Beyond that, the entire domain-security shelf is open.

| Vertical | Interlace plugin | Biome coverage |
| :--- | :--- | :--- |
| Browser-platform security beyond XSS basics | `browser-security` (45) | `noDangerouslySetInnerHtml` family only |
| JWT correctness | `jwt` (13) | None |
| Express security | `express-security` (10) | None |
| AWS Lambda security | `lambda-security` (14) | None |
| MongoDB / NoSQL injection | `mongodb-security` (16) | None |
| NestJS security | `nestjs-security` (6) | None |
| Vercel AI SDK / LLM safety | `vercel-ai-security` (19) | None |
| PostgreSQL / SQL injection | `pg` (13) | None |
| Operability / observability | `operability` (6) | None |
| Node-core security (fs, child_process, crypto) | `node-security` (33) | None |

---

## Strategic implications

Three notes specific to Biome (the Oxlint doc covers the general
strategy):

1. **Biome is a "reserved peer" today, automated peer once the
   adapter ships.** Per `INTEROP_PHILOSOPHY.md` we don't make hard
   claims about Biome support until the parity-fixture infrastructure
   matches Oxlint's. This document is the qualitative bridge.
2. **Biome's `lint/style` is the biggest single group** and overlaps
   most with our `conventions` plugin. The right move when the
   adapter lands is to **point `conventions` users at Biome's style
   group when they pick Biome as host** and ship the few
   `conventions` rules that go beyond Biome's coverage.
3. **The security gap is the same shape as the Oxlint security gap.**
   Both engines' stock corpora cover the foundational sinks
   (`no-eval`, dangerous-HTML, hardcoded-secret in a generic shape)
   and leave every domain-specific security vertical open. Whichever
   engine a user picks, they reach for Interlace for the domain depth.

---

## How to refresh this document

When the Biome adapter lands:

1. Mirror the structure of `oxlint-parity.yml` to a `biome-parity.yml`
   workflow.
2. Move Biome from **reserved peer** → **automated peer** in
   `INTEROP_PHILOSOPHY.md` (the watcher job opens the PR).
3. Add Biome's per-group rule list to the
   `.agent/biome-jsplugins-manifest.json` (mirror of
   `oxlint-jsplugins-manifest.json`).
4. Convert this document's overlap claims from qualitative to
   citing-the-manifest the same way `OXLINT_STOCK_OVERLAP.md` does.

Until then this is best-effort, but kept accurate enough that a
buyer reading it gets the right shape of the answer.
