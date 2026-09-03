# Oxlint stock corpus — overlap map with Interlace plugins

> Oxlint (Rust, Oxc project) ships a built-in rule corpus organized into
> namespaces, most of which port a subset of a popular ESLint plugin's
> rules into Rust. As of Oxlint 1.x (audited against `oxc-project/oxc`
> commit `3b46a8d`, 2026-05-14) the corpus is **790 rule files across
> 15 namespaces**. Per-namespace counts in the "Authoritative counts"
> table below.
>
> This document maps **each Oxlint stock namespace** against
> **Interlace plugins that share territory with it**, so we can answer:
>
> 1. **Where Oxlint stock already covers a need well** — we point users
>    there and don't duplicate.
> 2. **Where our plugin extends Oxlint stock with depth, framing, or
>    metadata** — we ship under Oxlint host via the JS-plugin tier and
>    add the value the stock corpus doesn't carry.
> 3. **Where Oxlint stock has no presence** — domain security, AI/agent
>    integration, the verticals we lead on.
>
> Companion docs: `ECOSYSTEM_LANDSCAPE.md` (per-plugin map),
> `EVALUATION_METRICS.md` (measurement axes), `INTEROP_PHILOSOPHY.md`
> (engine-portability contract).
>
> Last updated: 2026-05-14 (counts re-audited against
> `oos/oxc@3b46a8d`). Refresh the audit when bumping Oxlint in
> `.oxlintrc.json` / `.oxlintrc.flagship.json` — re-run the file
> walk in `oos/oxc/crates/oxc_linter/src/rules/<ns>/`.

## Authoritative counts (audited 2026-05-14)

Counts produced by walking `oos/oxc/crates/oxc_linter/src/rules/<ns>/`
on commit `3b46a8d` and counting `*.rs` files excluding `mod.rs`.

| Oxlint namespace | Rules | Upstream ported from | Interlace plugin(s) sharing space |
| :--- | ---: | :--- | :--- |
| `eslint` | 178 | ESLint core | `secure-coding`, `reliability`, `modernization` (tiny subset) |
| `import` | 32 | `eslint-plugin-import` | `import-next`, `modularity` |
| `jest` | 60 | `eslint-plugin-jest` | (none — we don't ship a test-framework plugin) |
| `jsdoc` | 20 | `eslint-plugin-jsdoc` | (none — closest is `reliability`, very partial) |
| `jsx_a11y` | 36 | `eslint-plugin-jsx-a11y` | `react-a11y` |
| `nextjs` | 21 | `@next/eslint-plugin-next` | (none — closest is `react-features`) |
| `node` | 6 | `eslint-plugin-n` | (`node-security` is **adjacent-different-scope**, see below) |
| `oxc` | 26 | Oxc team's native ruleset | small overlap with `reliability`, `maintainability` |
| `promise` | 16 | `eslint-plugin-promise` | `reliability` |
| `react` | 59 | `eslint-plugin-react` | `react-features` |
| `react_perf` | 4 | `eslint-plugin-react-perf` | `react-features` (partial) |
| `typescript` | 109 | `typescript-eslint` (AST-only subset) | (none directly — see "Cross-cutting" in `ECOSYSTEM_LANDSCAPE.md`) |
| `unicorn` | 129 | `eslint-plugin-unicorn` | `modernization`, `conventions`, parts of `maintainability` |
| `vitest` | 71 | `eslint-plugin-vitest` | (none — we don't ship a test-framework plugin) |
| `vue` | 23 | `eslint-plugin-vue` | (none — out of scope, no Vue plugin) |
| **Total** | **790** | | |

**Notable observation (corrected from the 2026-05-13 qualitative draft):**
Oxlint has **no `security` namespace**. Across the entire 790-rule
corpus, the only genuinely-security rules are:

- `eslint/no-eval`
- `typescript/no-implied-eval`

(plus a handful of escape-correctness rules — `no-useless-escape`,
`no-nonoctal-decimal-escape`, `no-unescaped-entities` — that are
syntactic correctness, not security framing).

Our 10 security plugins (221 rules) share **two rule slugs** with
Oxlint stock: `no-eval`. All other domain-security territory — JWT,
SQL injection, NoSQL injection, Express middleware, Lambda IAM, Vercel
AI SDK, browser web platform — is **uncontested by Oxlint stock**.

## Authoritative exact-name overlap (audited 2026-05-14)

Counting how many of our 384 unique rule slugs (un-namespaced) appear
verbatim in Oxlint stock's 732 unique slugs (un-namespaced) — produced
by `npm run audit:stock-overlap` against `oos/oxc@3b46a8d`. Full data
at [`benchmark-results/stock-corpus-overlap.json`](../benchmark-results/stock-corpus-overlap.json).

- **Overlapping slugs: 116** (30% of our slug set).

**Overlap by our plugin** (every Interlace plugin that shares ≥1 slug
with Oxlint stock):

| Our plugin | Overlapping slugs | Comment |
| :--- | ---: | :--- |
| `eslint-plugin-import-next` | 34 | Intentional re-implementations + naming-convention matches. See `competitor_study_2026-05-09.md` for the `no-cycle` performance rationale. |
| `eslint-plugin-react-a11y` | 35 | Same rule names, different element-type coverage (see `alt-text` article). |
| `eslint-plugin-react-features` | 33 | Foundational React rules; includes our `hooks-exhaustive-deps` re-implementation. |
| `eslint-plugin-conventions` | 5 | unicorn-style naming/style. |
| `eslint-plugin-maintainability` | 5 | Mostly unicorn-derived. |
| `eslint-plugin-modernization` | 3 | Curated subset. |
| `eslint-plugin-reliability` | 2 | `error-message`, `no-await-in-loop`. |
| `eslint-plugin-browser-security` | 1 | `no-eval` — 60-year ESLint mainstay. |
| `eslint-plugin-node-security` | 1 | `no-dynamic-require` — generic Node best-practice. |
| `eslint-plugin-operability` | 1 | `no-process-exit` — generic correctness. |

**Interpretation — the security-vertical position is even cleaner
than the qualitative draft claimed.** Of our ten security plugins, only
three share ANY slug with Oxlint stock, and the slugs they share are
single foundational rules (`no-eval`, `no-dynamic-require`,
`no-process-exit`) that have been ESLint mainstays for years —
zero domain-security overlap at all. The other seven security plugins
(`secure-coding`, `jwt`, `express-security`, `lambda-security`,
`mongodb-security`, `nestjs-security`, `vercel-ai-security`, `pg`)
have **zero** rule-slug overlap with Oxlint stock.

The 116-slug overlap is concentrated overwhelmingly in three
general-purpose plugins (`import-next`, `react-a11y`, `react-features`
= 102 of the 116, or 88%). These are exactly the neighborhoods our
2026-05-09 competitor audit identified as deliberate re-implementations
with measurable correctness or performance gains.

---

## Method

For every Oxlint namespace we record:

- **Stock source** — which upstream ESLint plugin the namespace ports
  from (where applicable).
- **Approximate rule count in Oxlint** — order of magnitude, not exact.
  Authoritative count: run `oxlint --rules | grep '^<namespace>/'`.
- **Interlace plugin that shares territory** — the plugin in our
  ecosystem whose scope overlaps.
- **Overlap shape** — *full*, *partial-shared-rule-names*,
  *adjacent-different-scope*, or *no-overlap*.
- **Where we add depth** — specific axes (metadata, deeper sinks,
  framework awareness, MCP integration, type-aware tier, autofix
  determinism, etc.).

When a row says *"Oxlint stock covers this; we don't duplicate"*
that's a deliberate choice and a community-positive stance.

---

## Per-namespace overlap

### `eslint` (core ESLint rules)

- **Stock source:** ESLint core, ported subset.
- **Audited count:** 178 rules (`no-debugger`, `no-eval`,
  `prefer-const`, `eqeqeq`, etc.).
- **Interlace plugins that share territory:** very small overlap with
  `secure-coding` (`no-eval` is in both, `no-implied-eval`); larger
  overlap with `reliability` (promise / async patterns) and
  `modernization` (modern-idiom preferences).
- **Overlap shape:** partial-shared-rule-names on a handful of rules;
  mostly adjacent-different-scope.
- **Where we add depth:** our rules carry CWE / CVSS mapping where
  applicable; ESLint core does not. Where the stock rule is
  sufficient (`no-debugger`, `prefer-const`, `eqeqeq`), we enable the
  stock rule in our `.oxlintrc.json` and **do not** duplicate. See
  the current `.oxlintrc.json` for our consumption pattern.

### `typescript` (subset of `typescript-eslint`)

- **Stock source:** typescript-eslint's AST-only / non-type-aware
  rules.
- **Audited count:** 109 rules — much bigger than initially estimated.
  Includes `adjacent-overload-signatures`, `array-type`,
  `consistent-type-imports`, `consistent-return`,
  `explicit-function-return-type`, `no-array-delete`, `no-deprecated`,
  `no-confusing-non-null-assertion`, etc. Covers the bulk of
  typescript-eslint's AST-only (non-type-aware) corpus.
- **Interlace plugins that share territory:** none of our security
  plugins; small overlap with `conventions` and `modernization` on
  the syntactic-preference rules.
- **Overlap shape:** adjacent-different-scope.
- **Where we add depth:** none here — this is typescript-eslint's
  shelf and we point users at it (see
  `ECOSYSTEM_LANDSCAPE.md` →
  "Cross-cutting neighbor: typescript-eslint").
  Our deep-tier type-aware rules (e.g. `pg/no-unsafe-query`) sit on
  *top* of the type information typescript-eslint surfaces; they're a
  superset by domain, not a competitor.

### `unicorn` (subset of `eslint-plugin-unicorn`)

- **Stock source:** eslint-plugin-unicorn, ported subset.
- **Audited count:** 129 rules — the largest stock namespace.
  Modernization (`prefer-array-flat`, `prefer-string-replace-all`,
  `prefer-node-protocol`), naming, consistency.
- **Interlace plugins that share territory:** `modernization` (3
  rules), `conventions` (11 rules), some of `maintainability` (12
  rules), some of `reliability` (9 rules).
- **Overlap shape:** *largest stock overlap with our general-purpose
  plugins*. Many things our `modernization` plugin could lint are
  already in Oxlint's `unicorn/*` namespace.
- **Where we add depth:** intentionally narrow. Our `modernization`
  ships only 3 rules — a curated subset where we believe Oxlint's
  upstream is silent or wrong on a specific JS idiom. We point users
  to `unicorn/*` for the broad modernization shelf and do not
  duplicate.
  - **Strategic implication:** the general-purpose plugins
    (`modernization`, `conventions`, parts of `maintainability` /
    `reliability`) compete against a 100-rule stock corpus that's
    free. Our value here is metadata + engine-portability, not
    rule volume.

### `import` (subset of `eslint-plugin-import`)

- **Stock source:** eslint-plugin-import, ported subset.
- **Audited count:** 32 rules (`no-duplicates`, `no-cycle`,
  `first`, `extensions`, `consistent-type-specifier-style`,
  `no-relative-parent-imports`, `no-anonymous-default-export`, etc.).
- **Interlace plugins that share territory:** `import-next` (55
  rules), `modularity` (5 rules — the cycle / boundary pieces).
- **Overlap shape:** partial-shared-rule-names with `import-next`
  (we have parity on the foundational rules); adjacent-different-scope
  on architectural rules.
- **Where we add depth:**
  - `import-next/no-cycle` is faster on large monorepos than the
    upstream eslint-plugin-import implementation (see
    `competitor_study_2026-05-09.md` and
    `apps/docs/content/articles/no-cycle-cache-poisoning-at-scale.mdx`).
  - `import-next` is designed flat-config-native + Oxlint-host
    native.
  - `modularity` adds *layered-architecture* enforcement on top of
    import resolution — Oxlint stock does not.

### `jsx-a11y` (subset of `eslint-plugin-jsx-a11y`)

- **Stock source:** eslint-plugin-jsx-a11y, ported subset.
- **Audited count:** 36 rules (`alt-text`, `anchor-is-valid`,
  `aria-props`, `aria-role`, etc.).
- **Interlace plugins that share territory:** `react-a11y` (37 rules).
- **Overlap shape:** partial-shared-rule-names. The
  `react-a11y/alt-text` story (see
  `apps/docs/content/articles/alt-text-the-element-types-jsx-a11y-checks-that-most-eslint-rules-skip.mdx`)
  is one explicit case where our rule covers element types Oxlint's
  stock `jsx-a11y/alt-text` misses.
- **Where we add depth:** wider element-type coverage on the rules
  where we've audited the upstream and found gaps; integration with
  `react-features` rules for cross-rule context.

### `react` (subset of `eslint-plugin-react`)

- **Stock source:** eslint-plugin-react, ported subset.
- **Audited count:** 59 rules (`jsx-key`, `jsx-no-undef`,
  `no-deprecated`, `no-direct-mutation-state`, etc.).
- **Interlace plugins that share territory:** `react-features` (53
  rules).
- **Overlap shape:** partial-shared-rule-names on the most
  foundational React rules.
- **Where we add depth:** advanced patterns the upstream
  `eslint-plugin-react` doesn't cover well: concurrent-rendering
  pitfalls, suspense-boundary patterns, performance anti-patterns.

### `react-hooks` (subset of `eslint-plugin-react-hooks`)

- **Stock source:** eslint-plugin-react-hooks (official React team).
- **Audited count:** No dedicated `react-hooks` namespace in current
  oxc tree; the hooks rules ship under `react/`. Cross-check `react/`
  namespace for `rules-of-hooks` / `exhaustive-deps` / `set-state-in-effect`.
- **Interlace plugins that share territory:** `react-features`.
- **Overlap shape:** specifically — `react-features` ships
  `hooks-exhaustive-deps` which is a re-implementation that closes
  the non-array-deps silent-skip gap (see the article in
  `apps/docs/content/articles/hooks-exhaustive-deps-non-array-deps-gap.mdx`).
  We *intentionally duplicate* this rule because the upstream's
  silent-skip behavior costs detection in a class of real bugs.
- **Where we add depth:** non-array-deps reporting, TSAsExpression
  handling, additional dependency-shape edge cases.

### `nextjs` (subset of `@next/eslint-plugin-next`)

- **Stock source:** @next/eslint-plugin-next, ported subset.
- **Audited count:** 21 rules (`no-html-link-for-pages`,
  `no-img-element`, etc.).
- **Interlace plugins that share territory:** none directly. Our
  closest is `react-features` for general React patterns.
- **Overlap shape:** no-overlap.
- **Where we add depth:** N/A. This is Next.js team's shelf. Users
  who pick Next should run both, configured independently.

### `node` (subset of `eslint-plugin-n`)

- **Stock source:** eslint-plugin-n, ported subset.
- **Audited count:** **just 6 rules** — `global-require`,
  `handle-callback-err`, `no-exports-assign`, `no-new-require`,
  `no-path-concat`, `no-process-env`. **Smaller than initially
  estimated.** Generic Node best-practice only; zero security framing.
- **Interlace plugins that share territory:** `node-security` (33
  rules incl. crypto).
- **Overlap shape:** adjacent-different-scope. `eslint-plugin-n` is
  Node *best practices*; `node-security` is Node *security*. They
  share fewer than 3 rule names by intent.
- **Where we add depth:** security framing — every rule has a CWE
  mapping. Examples Oxlint stock doesn't have:
  `no-hardcoded-crypto-key`, `no-key-reuse`,
  `require-authenticated-encryption`, `no-predictable-salt`.

### `promise` (subset of `eslint-plugin-promise`)

- **Stock source:** eslint-plugin-promise, ported subset.
- **Audited count:** 16 rules.
- **Interlace plugins that share territory:** `reliability` (9
  rules) — adjacent.
- **Overlap shape:** partial-shared-rule-names. The widely-relied-on
  promise patterns are in Oxlint stock; our `reliability` adds
  defensive-programming patterns beyond the promise lens.
- **Where we add depth:** error-handling framing (try / catch /
  result-type patterns) that's broader than the promise-API focus.

### `jest` (subset of `eslint-plugin-jest`)

- **Stock source:** eslint-plugin-jest, ported subset.
- **Audited count:** 60 rules.
- **Interlace plugins that share territory:** none.
- **Overlap shape:** no-overlap.
- **Where we add depth:** N/A. This is jest's shelf and Oxlint covers
  the basics. We do not ship a test-framework plugin.

### `vitest` (subset of `eslint-plugin-vitest`)

- **Stock source:** eslint-plugin-vitest, ported subset.
- **Audited count:** 71 rules — close in size to the `jest` namespace.
- **Interlace plugins that share territory:** none.
- **Overlap shape:** no-overlap.
- **Where we add depth:** N/A.

### `react_perf` (eslint-plugin-react-perf, ported)

- **Stock source:** eslint-plugin-react-perf.
- **Audited count:** 4 rules
  (`jsx-no-new-object-as-prop`, `jsx-no-new-array-as-prop`, etc.).
- **Interlace plugins that share territory:** `react-features` —
  partial.
- **Overlap shape:** partial-shared-rule-names.
- **Where we add depth:** broader performance anti-patterns beyond
  inline-prop allocation.

### `jsdoc` (subset of `eslint-plugin-jsdoc`)

- **Stock source:** eslint-plugin-jsdoc, ported subset.
- **Audited count:** 20 rules.
- **Interlace plugins that share territory:** none directly; closest
  is `reliability` for documentation-as-correctness patterns.
- **Overlap shape:** no-overlap.
- **Where we add depth:** N/A. JSDoc maintenance is its own shelf.

### `vue` (subset of `eslint-plugin-vue`)

- **Stock source:** eslint-plugin-vue, ported subset.
- **Audited count:** 23 rules.
- **Interlace plugins that share territory:** none. Interlace does
  not ship a Vue plugin.
- **Overlap shape:** no-overlap.
- **Where we add depth:** N/A. Vue ecosystem is out of our current
  scope.

### `oxc` (Oxc's own native ruleset)

- **Stock source:** Oxc team's own rules (some are AST-based
  performance and correctness rules that don't exist upstream).
- **Audited count:** 26 rules — includes `no-async-endpoint-handlers`,
  `no-barrel-file`, `no-accumulating-spread`, `bad-char-at-comparison`,
  `const-comparisons`, `missing-throw`, `no-async-await`.
- **Interlace plugins that share territory:** some overlap with
  `reliability` (correctness rules) and `maintainability`.
- **Overlap shape:** adjacent-different-scope.
- **Where we add depth:** none here — when Oxc ships a correctness
  rule that subsumes one of ours, that's a successful community
  outcome and we drop the duplicate.

---

## Where Oxlint stock has no presence

These are the verticals where Oxlint's stock corpus has zero coverage
today and where Interlace has the open path to lead. Listed here as
the complement to the table above.

| Vertical | Interlace plugin | Stock coverage |
| :--- | :--- | :--- |
| Browser-platform security (XSS, postMessage, CSP) | `browser-security` (45 rules) | None |
| JWT correctness | `jwt` (13 rules) | None |
| Express security | `express-security` (10 rules) | None |
| AWS Lambda security | `lambda-security` (14 rules) | None |
| MongoDB / NoSQL injection | `mongodb-security` (16 rules) | None |
| NestJS security | `nestjs-security` (6 rules) | None |
| Vercel AI SDK / LLM safety | `vercel-ai-security` (19 rules) | None |
| PostgreSQL / SQL injection | `pg` (13 rules) | None |
| Operability / observability | `operability` (6 rules) | None |
| Generic OWASP-mapped security | `secure-coding` (27 rules) | None |

This is **the security vertical** plus operability. Across all of
these, the rule volume on the Interlace side is **221 rules across
10 plugins** with zero overlap with Oxlint stock. This is where the
ecosystem-leadership opportunity is most concrete.

---

## Strategic implications

Reading this table the strategic shape becomes clear.

1. **The general-purpose plugins** (`modernization`, `conventions`,
   `maintainability`, `reliability`, `react-features`, `react-a11y`,
   `import-next`, `modularity`) all sit in shelf-territory where
   Oxlint stock ports something useful from upstream. Our value here
   is metadata, engine portability, and the specific gaps where we've
   *deliberately* re-implemented a rule (the article-backed
   `exhaustive-deps`, `no-cycle`, `alt-text`,
   `no-hardcoded-credentials`, `no-redos-vulnerable-regex`
   re-implementations are the canonical examples — `competitor_study_2026-05-09.md`).
2. **The security verticals + operability** are open space. Oxlint
   stock has no comparable corpus. This is where Interlace already
   leads and where investment compounds.
3. **The general-purpose plugins should optimize for**
   *engine-portable, well-documented, metadata-rich* additions to the
   shelf — not duplicating Oxlint stock for the sake of count. The
   `modernization` plugin's intentional 3-rule footprint is the right
   shape: a curated subset, not a clone.
4. **A flat-tier rule we ship that exists verbatim in Oxlint stock**
   is a smell — it means either the user runs both (waste) or
   we're carrying a rule that ought to be retired. Every duplicate
   should either have a written justification (article, audit) or be
   removed.

---

## How to refresh this document

When the Oxlint version we pin bumps (`.oxlintrc.json` plugin set or
the version in `.agent/oxlint-jsplugins-manifest.json`):

1. Update the `../oos/oxc` clone (`git pull origin main`).
2. Re-walk the rule files:

   ```bash
   for ns in $(ls oos/oxc/crates/oxc_linter/src/rules/); do
     if [ -d "oos/oxc/crates/oxc_linter/src/rules/$ns" ]; then
       count=$(find "oos/oxc/crates/oxc_linter/src/rules/$ns" -maxdepth 1 -name "*.rs" -not -name "mod.rs" | wc -l)
       printf "%-20s %s\n" "$ns" "$count"
     fi
   done
   ```

3. Recompute the exact-name overlap against our manifest:

   ```bash
   node -e "
     const m = require('./.agent/oxlint-jsplugins-manifest.json');
     const our = new Set();
     m.plugins.forEach(p => p.rules.forEach(r => our.add(r.name.replace(/^[^/]+\//, ''))));
     const fs = require('fs'), path = require('path');
     const base = 'oos/oxc/crates/oxc_linter/src/rules';
     const oxlintRules = new Set();
     fs.readdirSync(base).forEach(ns => {
       const dir = path.join(base, ns);
       if (fs.statSync(dir).isDirectory()) {
         fs.readdirSync(dir).forEach(f => {
           if (f.endsWith('.rs') && f !== 'mod.rs') {
             oxlintRules.add(f.replace(/\.rs$/, '').replace(/_/g, '-'));
           }
         });
       }
     });
     console.log('Overlap:', [...our].filter(n => oxlintRules.has(n)).length);
   "
   ```

4. Update the "Authoritative counts" + "Authoritative exact-name
   overlap" tables.
5. Where a new duplicate appeared: open an audit issue (either retire
   our rule, write a justification article like
   `competitor_study_2026-05-09.md`, or add the rule to the
   parity-fixture set).

Cross-cutting refresh: when we audit a competitor's source (as in
`competitor_study_2026-05-09.md`), add the conclusion here, not just
in the memory.
