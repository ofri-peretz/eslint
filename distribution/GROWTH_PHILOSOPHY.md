# GROWTH_PHILOSOPHY.md

> The contract for how the Interlace ESLint ecosystem grows as an open-source
> **brand and community leader** — for humans and agents making concurrent changes.
> Lives in `distribution/` alongside [`STRATEGY.md`](./STRATEGY.md),
> [`ECOSYSTEM_LANDSCAPE.md`](./ECOSYSTEM_LANDSCAPE.md), and
> [`EVALUATION_METRICS.md`](./EVALUATION_METRICS.md). Locked by
> `apps/docs/src/__tests__/growth-conversion-lock.test.ts`.

## North Star

**Convert silent adoption into visible community leadership.**

Downloads prove people *run* our rules. Leadership is measured by the signals a
community actually rallies around — **GitHub stars, Dev.to followers, contributors,
citations, and inbound integrations**. Downloads are necessary but not sufficient;
the brand's job is to turn the install base into visible advocates.

The motivating data point (see `agents/footprint/metrics/surge-analysis-2026-05.md`):
in May 2026 the ecosystem ran at ~29K downloads/month against **10 GitHub stars** — a
~2,900:1 download-to-star ratio (healthy OSS sits at 50:1–500:1). The latent base
already exists. Growth work is conversion, not acquisition.

## Principles (stable IDs — cite these in PRs)

- **G1 — Conversion over acquisition.** Before chasing new reach, capture the demand
  already present. The download-to-star ratio is the headline health metric; drive it down.
- **G2 — Every surface carries the next CTA.** An npm README must invite a GitHub star
  and a Dev.to follow; the docs site must invite a star; an article must invite a follow.
  No terminal surfaces. Links to **owned properties** (`*.interlace.tools`, `ofriperetz.dev`)
  are UTM-tagged per `UTM_PHILOSOPHY.md`; links to GitHub/Dev.to are not (the conversion
  event is measured on their side, not in PostHog).
- **G3 — Distribution is a required publish step, not optional.** A formula-correct article
  at ~0 views is a *distribution* failure, not a content failure. No article is "done" until
  it has had a distribution pass (Show HN + ≥1 subreddit + an X/LinkedIn post). See the
  distribution kit and the publishing-queue contract in the agents repo.
- **G4 — Publish by impact, not by sequence.** The corpus is unambiguous: research /
  benchmark / named-target-provocative pieces pull 200–1,000 views; "Getting Started"
  tutorials average ~78 views with ~0 engagement. Tutorials are SEO-fill — never the
  headline cadence.
- **G5 — Honesty gate before any public number.** Download spikes must be *attributed*
  (release re-install vs. genuine discovery) before they become a public claim. A vanity
  "we crossed N" post that misreads release traffic as discovery damages credibility more
  than silence. Lead with the engineering/research; let the number be supporting proof.
- **G6 — Landscape framing, never threat framing.** In all external-facing copy use
  *peers / the landscape / where we specialize / community leadership*. Never
  "competitor / threat / beat / win / moat". Enforced alongside
  `landscape-framing-lock.test.ts`. (Internally, engine portability — "rules portable,
  runtimes commodity" — is the durable advantage; it surfaces externally as positioning,
  not as a "moat" claim.)
- **G7 — Engine portability stays above the fold.** Per `INTEROP_PHILOSOPHY.md`. Never
  claim "TSC 7 compatible" or "Oxlint fully compatible" — the canonical statuses are
  `watching` / `automated peer`.
- **G8 — Lock every growth surface.** A CTA or social-proof element that isn't asserted by
  a test will silently regress when a baseline sync or refactor runs. Per CLAUDE.md, the
  fix is half-done without the lock.
- **G9 — Domain vocabulary over generic metrics.** "Rules shipped", "OWASP coverage %",
  "download-to-star ratio" — not "page views". Vocabulary is marketing (mirrors
  `impact_vision`).
- **G10 — Ratchets, not vanity peaks.** Track monotonic, provenance-backed counts over
  time (the snapshot time-series, the impact stack). "We kept showing up" is the story;
  one good week is not.

## The conversion funnel (the contract G2 enforces)

```
search / npm  →  npm README (★ star CTA + Dev.to follow)         [G2]
              →  GitHub repo (★ star, 👀 watch, social proof)      [G2, G8]
              →  Dev.to (follow + writeups)                        [G3, G4]
              →  docs site (star CTA + live metrics, UTM-tagged)   [G2]
              →  contributor / integrator                          (the goal)
```

Each arrow is a measured step. The npm→GitHub arrow is the widest leak today (G1).

## The content formula (corpus-validated)

Wins: **named target + concrete number + provocative-but-true claim**, framed as
research/value (e.g. "I Benchmarked 17 ESLint Security Plugins. Only One Found Every
Vulnerability"). Self-critical engineering deep-dives ("a bug in our *own* rule") are
strong on Hacker News. Flops: "Getting Started", "The X Standard", undated milestones,
internal post-mortems without fresh data.

## Channel ladder

| Now (active) | Per-piece (opportunistic) | Next (build toward) |
| --- | --- | --- |
| Dev.to · npm · GitHub | Hacker News · Reddit | X / LinkedIn · conferences · GitHub Sponsors |

Advance a channel only when the tier below is consistently executed (distribution pass
on every publish before scaling to new channels).

## Metrics

- **Headline:** download-to-star ratio (drive down). Tracked in the snapshot `github` block.
- **Conversion:** PostHog funnel events on owned-property CTAs (README→docs, docs→GitHub).
- **Reach:** per-article views/reactions/comments and post-distribution lift.
- All feed the Supabase impact stack as ratchets (`/ofri-impact-add`), never hand-edited.

## Enforcement

- `growth-conversion-lock.test.ts` — root README carries the star/follow CTA + stars badge;
  every `eslint-plugin-*` README carries the `INTERLACE:STAR_CTA` block; this file exists
  and states the North Star + G6 framing rule.
- `publishing-queue.md` — distribution-mandatory + impact-ranked (agents repo).
- `weekly-snapshots.json` — `github` block + download-to-star ratio per capture.

## Non-goals (what this is NOT)

- **Not a follower farm.** No engagement-bait; anti-bot limits on Dev.to (≤5 comments/hr,
  never two sessions/day) are hard rules.
- **Not a leaderboard.** We do not rank ourselves against peers (G6); we map a landscape.
- **Not real-time.** Daily granularity; we optimize the trend, not the dashboard.
- **Not growth-at-the-cost-of-trust.** No CSP/security regressions, no loosened headers,
  no wildcard image hosts to make a CTA work (per CLAUDE.md).
