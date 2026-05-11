# UX Philosophy

This is the foundational document for every UI/UX decision in this repo —
the docs site, the `@interlace/ui` package, OG images, link metadata, the
plugin READMEs themselves. Every component, page, and link decision should
be traceable to one of these ten principles. If you're about to ship a UX
choice and can't point to the principle behind it, reconsider.

The principles are ordered by **leverage** — the earlier ones, when
violated, do the most damage. The later ones compound on top.

---

## 1. Adoption is friction subtraction

Every click between a problem and a solution costs adoption. Our job is to
remove clicks, not add features. Cutting one step from a 4-step install is
roughly +25% conversion. Cutting one Google query from a "how do I fix
this?" path is roughly the same. **The most valuable UX work is usually
deletion.**

**Mechanics**

- **One-click install snippets** with copy-button and a package-manager
  switcher (npm/pnpm/yarn/bun). No manual rewriting.
- **Search-first navigation.** Pressing `/` anywhere opens a command palette.
  Fumadocs ships this — keep it pristine.
- **Zero gates.** No login walls, no email popups blocking first paint, no
  cookie banners that intercept reading.
- **Time-to-first-useful-line ≤ 2s.** Static pages, optimized images,
  pre-rendered routes.

**Measure**: search-bar usage, copy-button click rate, bounce rate on
landing pages, INP/LCP from `web-vitals`.

---

## 2. Every URL is a contract

Once a URL exists, it must keep working. Breaking a deep link breaks every
blog post, Slack message, PR comment, and Stack Overflow answer that ever
referenced it. URL stability compounds; URL churn destroys.

**Mechanics**

- **URLs encode meaning, not implementation**:
  `/docs/security/jwt/no-none-algorithm`, never `/docs/v2/articles/12345`.
- **Redirects, never deletes.** Renaming a rule adds a permanent
  redirect. Removing a deprecated rule keeps the URL alive with a
  "removed in vX, see Y" page.
- **Stable section anchors.** Headings keep the same `id` even when copy
  around them is rewritten — Google snippets stay valid.
- **`latest` is the canonical link.** Time-anchored versions live at
  `/v/X.Y.Z/...` but `latest` is what we publish.

**Measure**: 404 logs, broken-link reports, internal-link audit script run
in CI.

---

## 3. Sharing is the activation function

The most viral path to adoption is not ads — it's a developer pasting a
link into Slack and saying "this is what we should do." If the link
preview looks bad, that paste never happens. **Treat link previews as a
first-class surface.**

**Mechanics**

- **Per-page OG images.** Generated at build time via the existing
  [`/og`](apps/docs/src/app/og/) route. Title + plugin badge + brand chrome.
- **Full Open Graph + Twitter Card metadata** on every route — `og:title`,
  `og:description`, `og:image`, `og:image:width`, `og:image:height`,
  `twitter:card="summary_large_image"`.
- **Hierarchy mapping.** Page H1 → `og:title`. Page intro paragraph →
  `og:description`. Heading anchors → fragments that survive the share.
- **Copy-link button on every section anchor.** Hover a heading → copy
  icon appears → click puts the deep link on the clipboard. Removes the
  "scroll to URL bar, find the URL, append the fragment" friction entirely.

**Measure**: incoming-from-twitter / linkedin / hn referrer share, share-link
copy-button clicks.

---

## 4. Momentum is the second-best content

A reader who finishes one page and bounces is half a win. A reader who
finishes one and reads the next is a full win. **Recommend; don't
dead-end.**

**Mechanics**

- **"What's next" block on every page**: for rule docs, related rules in
  the same plugin and adjacent CWE; for guides, the next guide in the series.
- **Cross-link the article corpus**: when one of our Dev.to articles
  references a rule, the rule page reciprocates with a "Mentioned in"
  sidebar pointing back. (Two-way linking is what makes a corpus.)
- **Breadcrumbs above + cross-links beside.** Readers always know where
  they are and what's adjacent.
- **Newsletter / RSS — never popups.** Bottom-of-page subscribe, never
  interrupt.

**Measure**: pages-per-session, "next" CTA click rate, RSS subscriber
count, time-on-site.

---

## 5. Discoverability beats memory

Don't make readers remember the structure of the site — show them. If they
can't find something in 10 seconds they'll Google, and then our SERP
ranking is the bottleneck, not our navigation.

**Mechanics**

- **Sidebar TOC always visible.** Fumadocs ships this; don't reorganize
  the tree without redirects (see #2).
- **Cross-cutting indices.** Not just the file-tree sidebar, but
  cards-by-CWE, cards-by-OWASP, "rules to enable for a Node app", "rules
  to enable for a React app." A reader's mental index is *not* the
  filesystem hierarchy.
- **Inline TOC at the top of long rule docs**
  ([`fumadocs-ui/components/inline-toc`](node_modules/fumadocs-ui/dist/components/inline-toc.js)).
- **Search with metadata in results.** Typing "sql" should surface CWE-89
  rules with the CWE badge visible in autocomplete, not just titles.
- **Tag URLs.** Every tag, every CWE code, every OWASP code has a page
  listing matching rules.

**Measure**: search-result CTR, navigation-depth distribution, CWE/OWASP
tag-page views.

---

## 6. Ease of use is performance

Readers do not separate "this site is slow" from "this site is bad." Every
100ms of perceived lag costs measurable engagement. **Performance is a UX
feature.**

**Mechanics**

- **Server components by default.** Package primitives render on the
  server; `'use client'` only when interactive.
- **Skeletons during ISR cold-start** so the content area never flashes
  blank. (Currently a gap — addressed in our `<RemoteMarkdownSkeleton>`
  work.)
- **Next.js `<Image>` with explicit `sizes`** for cover images.
- **Static-render where possible.** Currently 1137 prerendered routes —
  protect that number; treat regressions as bugs.

**Measure**: LCP / INP / CLS via `web-vitals`, Lighthouse scores in CI,
cache-hit ratio on Vercel edge.

---

## 7. Technical content is long-tail SEO

A blog post written today drives traffic in 3 years if Google still ranks
it. A docs site that links to those posts — and those posts link back —
compounds. **Treat the article corpus and the docs as one product.**

**Mechanics**

- **Every Dev.to article is a card on `/articles`.** Already wired.
- **Every blog post that references a rule appears on that rule's page** —
  "Mentioned in" block. Bidirectional linking is what raises both
  rankings.
- **Schema.org structured data** on each rule (`TechArticle`) and article
  (`Article`) for rich SERP results.
- **`<link rel="canonical">`** to prevent the docs-site copy and the
  Dev.to mirror from cannibalizing each other in search.

**Measure**: Search Console impressions/clicks, organic landing-page
distribution, article→rule referral count.

---

## 8. Open the side door, not just the front door

Most readers don't enter at `/`. They enter via Google → a rule page.
**Side-door entry must feel intentional, not accidental.**

**Mechanics**

- **Every page has rich page-level chrome**: plugin name, version,
  install snippet, "from the docs of X" header — not just an H1 dumped
  into a generic shell.
- **Sticky breadcrumbs** so the reader sees the page in context within
  the first paint.
- **"You are here" microcopy** — never assumptive ("as the last chapter
  said"). Every page has to stand alone.

**Measure**: bounce rate on rule pages, install-snippet copy rate from
side-door entries.

---

## 9. The docs site is the showcase

We sell our ESLint plugins by demonstrating them. The docs site itself
should be linted by our plugins, ship our patterns, conform to our rules.
**Walking the talk is the strongest marketing we have.**

**Mechanics**

- **Eat the dogfood.** `apps/docs` uses our plugins. Visible in `eslint.config.mjs`.
- **Benchmark scorecards on the homepage** — our competitive edge
  becomes the docs site's centerpiece.
- **"With our rule" vs "without" diff comparisons** as code samples on
  landing.
- **Source code link on every component example.**

**Measure**: GitHub stars, plugin install counts, "demo → install"
funnel.

---

## 11. Build with the ecosystem, not against it

We sit inside an ecosystem that has already solved hard problems —
fumadocs, Base UI, Tailwind, Next.js, MDX. Re-implementing what they
ship is rework; ignoring their conventions is friction for everyone who
already knows their patterns. **Adoption order is mandatory:**

1. **Leverage** — if fumadocs / Base UI / Tailwind ships it, use it.
2. **Inspire** — if they don't ship it but their source documents the
   pattern, build ours mirroring their conventions and link to the
   source recipe.
3. **Reinvent** — only when the gap is real and no ecosystem precedent
   exists. Document why.

**Mechanics**

- **Fumadocs first for docs surfaces.** TOC, search, sidebar, callouts,
  code blocks, MDX components, type tables, file trees, banners — these
  are theirs. Don't re-implement.
- **Base UI first for headless behavior.** Keyboard, focus, ARIA, portal
  positioning. Use `useRender` over rolling our own slot.
- **Tailwind first for styling.** No CSS-in-JS, no `styled()`, no
  inline-style objects unless dynamic.
- **Our additions fill ecosystem gaps:**
  - `<Mermaid>` — fumadocs documents the recipe but doesn't ship it; we
    package the canonical pattern.
  - `<RemoteMarkdown>` — fumadocs ships `@fumadocs/mdx-remote`'s
    `createCompiler` but doesn't wrap it; we package fetch, ISR caching,
    TOC extraction, and `<AnchorProvider>` wrapping as one component.
  - Brand patterns (`<HeroCosmic>`, `<ArticleCard>`) — outside the
    fumadocs scope.
- **Cross-link the inspiration.** Every component file that mirrors a
  fumadocs/Base UI recipe links to the upstream source in a header
  comment. New contributors arriving at our component find the canon.

**Forbidden**: implementing a Tabs / Accordion / Callout / Steps /
TypeTable / Files / InlineTOC / ImageZoom / Banner from scratch.
Fumadocs ships them; use those.

**Measure**: dependency-graph audit — every primitive in `@interlace/ui`
either wraps `@base-ui-components/react` or `fumadocs-*`, or is
explicitly justified as a gap-fill in its file header.

---

## 10. Every component answers "would this travel?"

A component belongs in the package only if an *unrelated* docs site
would adopt it. `<HeroCosmic>` travels — any OSS landing page wants it.
`<RulesTable>` doesn't — it parses *our* README. The `@interlace/ui`
package is a portfolio: only travel-worthy work ships there.

**Mechanics**

- **Honest "reuse signal"** on every promotion candidate — high / medium
  / low / none. Aspirational ratings are forbidden.
- **App-specific stays app-specific.** Domain-coupled components
  (RulesTable, plugin-stats) live in the app, not in the package.
- **Generic stays generic.** `<ArticleCard>` doesn't know about Dev.to —
  it accepts a shape.
- **Subpath telegraphs opinion level.** `primitives/` (no opinion) →
  `blocks/` (purposeful composition) → `patterns/` (full preset) →
  `mdx/` / `fumadocs/` (ecosystem-specific). Path tells you what you're
  getting.

**Measure**: external-consumer adoption count (when other docs sites
start to depend on `@interlace/ui`); package-internal vs app-internal
dependency-direction (the package never imports from the app).

---

## How this gets used

When designing a new component or page, ask:

For CTA buttons specifically — primary/secondary pair, animation budget,
size tokens, sibling-parity contract — see
[`CTA_PHILOSOPHY.md`](CTA_PHILOSOPHY.md).

For keyboard accessibility — skip links, focus-visible, Tab order,
Safari Full Keyboard Access — see
[`KEYBOARD_PHILOSOPHY.md`](KEYBOARD_PHILOSOPHY.md).

1. **#1 Adoption** — does this remove a click, or add one?
2. **#2 URL** — is the URL stable, meaningful, and redirected if renamed?
3. **#3 Share** — what does it look like in a Slack/Twitter/LinkedIn link
   preview?
4. **#4 Momentum** — what's the next step from this page?
5. **#5 Discoverability** — can a reader find this without the sidebar?
6. **#6 Performance** — is this server-rendered? Does it ship a skeleton?
7. **#7 SEO** — does it cross-link with the article corpus? Has structured
   data?
8. **#8 Side door** — does it stand alone for a Google entry?
9. **#9 Showcase** — does this demonstrate our plugins?
10. **#10 Travel** — would another docs site adopt this?

If a feature scores poorly across most of these, it's the wrong feature.

When in doubt: **what would a reader who arrived from a 3-year-old Stack
Overflow link expect?** Their experience is the SLA.

---

## Living document

This philosophy is the source of truth. When a UX decision is made that
this doc didn't anticipate, **update this doc first**, then make the
change. Drift between principle and practice is the failure mode.
