# Scorecard & Stats — page vision

> How we envision the three public "numbers" surfaces. Each proves something
> different to a different reader, and each now ends a section with a quiet,
> proof-first call-to-action (⭐ star / `npm install` + try). This doc is the
> canonical layout reference; the regression-lock tests
> (`src/__tests__/stats-page-lock.test.tsx`, `scorecard-lock.test.ts`, and the
> blog's `scorecard-lock.test.tsx`) pin the structure so it can't silently drift.

## The three surfaces

| Page | URL | Job | Reader |
|---|---|---|---|
| **Flagship Scorecard** | `eslint.interlace.tools/scorecard` | Per-rule latency / findings / head-to-head benchmark on real OSS repos | Skeptical engineer evaluating rule quality + speed |
| **Stats** | `eslint.interlace.tools/stats` | Ecosystem adoption — Impact, downloads, full plugin catalog | Someone gauging ecosystem health |
| **Impact Scorecard** | `ofriperetz.dev/scorecard` | Personal impact ledger — North Star (contributions + engagement) + momentum | Recruiter / peer / investor |

(The blog Impact Scorecard lives in the **agents** repo at
`apps/blog/src/app/scorecard/page.tsx`; its components are auto-generated from
`apps/interlace-docs-baseline/`. The other two live here in `apps/docs`.)

## Design principles — "elegant, not pushy"

1. **Proof before ask.** A CTA sits *after* the credibility (below the hero, at
   the end of a card, a trailing table column) — never an interrupting banner.
2. **One primary action per surface.** Everything else is quiet (ghost /
   underline).
3. **Contextual, not global.** Per-plugin / per-rule install lives *on the row*
   where the interest already is.
4. **Outcome language**, not begging: "Add the rule", "Get started".
5. **Social proof is the nudge** — the live ⭐ count doubles as the CTA, so the
   ask never shouts.
6. **Followers = audience reach, never a total.** dev.to + GitHub followers are
   shown as context and are *not* summed into the North Star (the impact vision's
   "no vanity follower ratchet" rule). Sources are null-guarded — a failed fetch
   hides the stat rather than showing a wrong/zero number.

## ① Flagship Scorecard — `/scorecard` (eslint)

```
 Flagship Scorecard
 Per-rule numbers for the 10 flagship rules · ILB-Flagship bench
 ⭐ Star on GitHub      npm i -D eslint-config-interlace   Get started ▸   ← quiet CTA row
 ──────────────────────────────────────────────────────────────
 Provenance   Generated <date> · ESLint · oxlint · Node · source.json ↗
 ──────────────────────────────────────────────────────────────
 Latency (cold→warm) + findings
 ┌────────────┬──────┬───┬──────┬──────┬───────┬──────────┐
 │ Rule       │ Repo │⭐ │ Ours │ Comp │ Finds │ Try      │
 │ pg/no-…    │ next │80K│ 42ms │ 91ms │  17   │ npm i·docs│  ← per-row install + rule docs
 └────────────┴──────┴───┴──────┴──────┴───────┴──────────┘
 ──────────────────────────────────────────────────────────────
 Cache effectiveness (median)   ·   How to read this
 ┌ Convinced? Add the flagship config →  npm i -D eslint-config-interlace · Get started ┐
 └──────────────────────────────────────────────────────────────────────────────────────┘
```

- **Per-rule "Try"** derives the package + rule-docs link from the rule id
  (`<plugin-slug>/<rule>` → `eslint-plugin-<slug>` + the GitHub rule markdown) —
  no pillar lookup. Install copies `npm i eslint-plugin-<slug>`.
- The natural conversion is adopting the **whole flagship config**, so the
  header + closing CTA both offer `eslint-config-interlace`.
- The benchmark numbers *are* the proof; the star button shows no count here
  (the page is static and doesn't fetch repo stars).

## ② Stats — `/stats` (eslint)

```
 Stats   How the Interlace ESLint ecosystem is doing
 <N> rules across <M> plugins.
 ⭐ <stars> · Star on GitHub      Get started ▸                   ← quiet CTA row
 ──────────────────────────────────────────────────────────────
 Impact   Reach · Engagement rate
 Audience (reach, not part of any total): <gh> GitHub followers · <dt> dev.to followers
 ──────────────────────────────────────────────────────────────
 Top packages by downloads          [bar chart]
 ──────────────────────────────────────────────────────────────
 Plugins
 ┌──────────────────────┬─────────┬────┬───────┬─────┬─────────┐
 │ Plugin → docs        │ Cat.    │Rule│ DL/wk │ Cov │ Get it  │
 │ node-security ↗      │ security│ 42 │ 70.3K │ 94% │ npm i·docs│  ← name LINKED + install
 └──────────────────────┴─────────┴────┴───────┴─────┴─────────┘
 ──────────────────────────────────────────────────────────────
 Catalog generated <date> · live fetched <date>
```

- Plugin rows **link to their docs** (`/docs/<category>/plugin-<slug>` — internal
  nav, so **no UTM**) and carry a per-row `npm i` + docs affordance.
- The **Audience** line shows GitHub followers (live GitHub user API) + dev.to
  followers (the canonical Supabase number, read from the blog's public stats
  API). Either is hidden if its source is unavailable.
- Star count is live (`getStatsPageData().impact.github.totalStars`).

## ③ Impact Scorecard — `/scorecard` (blog, agents repo)

```
                     NORTH STAR
                      <ticker value>
                ▲ +<delta> (<%>) · 30d   ·   ∿ sparkline ∿
       a public ledger of our mutual contribution…
       since <date> · <N> days of receipts
 ⭐ <stars> · Star on GitHub        Browse the plugins ▸          ← quiet CTA row under hero
 ──────────────────────────────────────────────────────────────
 Momentum   ▲ rising …   ▼ cooling …
 ──────────────────────────────────────────────────────────────
 Engagement (how the world responds)   — each card: value · Δ30d · source ↗
 Contributions (what we ship)          — "<N> rules across <M> OWASP categories"
 ──────────────────────────────────────────────────────────────
 Audience (reach, not summed): <gh> GitHub followers · <dt> dev.to followers
 ──────────────────────────────────────────────────────────────
 Per-plugin downloads
   node-security ████████ 70.3K    npm i · docs ↗      ← per-plugin install + UTM docs
 ──────────────────────────────────────────────────────────────
 Where the numbers come from   [provenance links] · updated <relative>
```

- Cross-property links to the eslint docs carry
  `utm_source=ofriperetz_dev&utm_medium=referral&utm_campaign=scorecard`.
- **Audience followers** come from Supabase (`v_creator_latest`), shown as
  context — never added to the North Star total.
- A per-section **freshness stamp** ("updated <relative>") and a visible
  "data unavailable" state (instead of silent zeros when Supabase env is
  missing) keep the numbers honest.

## Measurement

Every CTA fires a typed analytics event (colon-form, satisfies
`conventions/analytics-event-naming`):

- `stats:cta_click` — `{ action: 'star' | 'get_started' | 'plugin_install' | 'plugin_docs', plugin? }`
- `flagship:cta_click` — `{ action: 'star' | 'install_config' | 'rule_install' | 'rule_docs', rule? }`
- (blog) `scorecard:cta_click` — `{ action, plugin? }`

These feed a scorecard/stats → adoption conversion tile on the PostHog
"Blog & Community Intelligence" dashboard, so we can see whether the proof
actually drives stars + installs as traffic grows.
