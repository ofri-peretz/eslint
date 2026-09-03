# docs

All notable changes to `docs` are documented here.

Entries below `## <version>` are generated from [changesets](https://github.com/changesets/changesets);
the format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [SemVer](https://semver.org/spec/v2.0.0.html).

## 1.2.0

### Minor Changes

- **✨ Feature** — plugin changelogs render from build-time data, not a runtime fetch ([#679](https://github.com/ofri-peretz/eslint/pull/679))

  Every plugin's docs page already had a changelog tab, and it showed the reader
  the raw file. On the live site `plugin-jwt-security/changelog` opened each entry
  with `#635 0d30b1c Thanks @ofri-peretz ! -` — roughly 120 characters of
  `@changesets/changelog-github` plumbing before the first word of prose. The same
  content on `/changelog` had none of it, so the higher-intent surface — someone
  researching _that plugin_ — got the worse rendering.

  `<PluginChangelog>` replaces `<RemoteChangelog>` on all 26 pages and reads
  `src/data/changelog.json`, the source `/changelog` already uses. Both surfaces
  now render identically, and three problems go with the old component:

  - **No runtime network dependency.** GitHub being slow or rate-limiting turned a
    docs page into an amber "unable to load" box.
  - **No two-hour staleness.** It fetched from `main`, so the page could describe a
    version the deployed docs don't, or lag one that just shipped.
  - **No raw plumbing.** Entries render with the same badges, inline code and PR
    links as the cross-package view.

  Also collapses a legacy artifact worth 16% of the corpus: 248 of 1554 entries
  were a `Updated dependencies [...]` wall of commit links, up to 622
  characters whose entire information content is "internal
  dependencies moved". They normalise to `Updated internal dependencies`under the
  Dependencies badge — matching what the current formatter emits — in the shared
  parser, so`/changelog` gets it too.

  The now-orphaned `remote-changelog.tsx` is removed; `RemoteReadme` is untouched
  and still used by 26 pages.

### Patch Changes

- **🐛 Fix** — the changelog API returned `"date": "Unknown"` for every modern release ([#682](https://github.com/ofri-peretz/eslint/pull/682))

  `/api/changelog` is a documented public endpoint — `advanced/changelog.mdx`
  publishes curl examples for it. Its parser reads the release date out of the
  version heading, which works for the legacy keep-a-changelog format. Changesets
  writes `## 1.4.1` with no date at all, so from the day this repo adopted
  changesets every entry the endpoint returned carried `"date": "Unknown"`.

  The real date is the release's git tag, which `sync-changelog.ts` already
  resolves for all 458 releases. The route consults the tag first, falls back to the heading date, and only
  then admits `"Unknown"` — the same precedence `sync-changelog.ts` uses, since a
  hand-written heading date records when someone edited the changelog rather than
  when the release shipped. For
  `eslint-plugin-jwt-security`: 8 of 10 entries gain a date; the two that remain
  unknown have no tag.

  `type` gets the same treatment. It was a substring guess —
  `content.includes('fix')` fires on any entry whose prose happens to contain the
  word — where the changeset's own conventional-commit prefix says what the author
  declared. The guess stays as the fallback for entries with no declared kind.

  Response shape is unchanged; only the values improve.

## 1.1.0

### Minor Changes

- **✨ Feature** — a `/changelog` page for the whole ecosystem ([#670](https://github.com/ofri-peretz/eslint/pull/670))

  Releases were recorded in four places — per-package `CHANGELOG.md`, git tags,
  GitHub Releases, and npm — and every one of them requires the reader to already
  know it exists. None answers "what has changed lately across the things I
  install" without opening thirty tabs.

  `/changelog` is that page: 449 releases across 32 packages, newest first,
  filterable by package, with entries linked to the pull request that shipped them
  where one is recorded, and every published version showing the exact install
  command.

  Three things it does that a naive version would not:

  **Dates come from git tags.** Changesets writes `## 1.4.1` with no date at all;
  only the legacy keep-a-changelog headings carry one, and those are a shrinking
  minority. A page whose primary axis is time cannot be built from the changelog
  files alone, so the sync reads every tag's `creatordate` in one
  `git for-each-ref`.

  **Entry titles render their markdown.** 857 of 1537 titles contain `inline
code` and 263 a `[link](url)` — as plain text, most of the page shows a reader
  raw backticks. A focused inline renderer handles code, bold and http(s) links
  and treats everything else as literal, so nothing can inject markup.

  **The filter is one scrolling row on mobile.** Wrapped, 32 package chips stack
  to roughly 900px at 375px wide — two and a half screens of filter before the
  first release.

  Deliberately no "filter by kind": 1489 of 1537 entries classify as `other`,
  because kind is derived from the conventional-commit prefix the release-notes
  overhaul introduced and almost the whole corpus predates it. A facet that hides
  97% of the page is worse than no facet. Kind renders per entry where it is
  known.

## 1.0.0

### Major Changes

- **💥 Breaking** — categorised changelogs, a cross-package rollup, and versioned apps ([#660](https://github.com/ofri-peretz/eslint/pull/660))

  Release notes were three separate problems, all invisible because nothing asserted the shape of the
  output.

  **Twenty of twenty-two CHANGELOGs were silently corrupt.** changesets picks its insertion point with
  `/^#{1,6}\s+\d+\.\d+/.test(fileData)`. Our legacy files opened with `## [1.4.0] - 2026-05-03`, and
  the `[` sits where `\d` must be — so changesets read that version heading as the file's _title_ and
  filed every subsequent release underneath it. The result: a stale version pinned to line 1 of nearly
  every package, the `# Changelog` H1 buried (line 1264 in `eslint-devkit`), and version sections out
  of order. `scripts/normalize-changelogs.ts` repairs and re-sorts them, preserving the release dates
  the changesets format drops, and runs inside `changeset:version` so a release cannot reintroduce the
  drift.

  **Entries said how big a change was, never what it was.** `@changesets/changelog-github` led every
  line with link plumbing and `Thanks @<repo-owner>!` before the first word of prose, and grouped only
  by semver level. `.changeset/changelog.cjs` replaces it: a kind badge derived from the
  conventional-commit prefix (with `!` and `BREAKING CHANGE:` escalating to breaking), prose first and
  links last, self-attribution dropped, and graceful degradation to unlinked entries when there is no
  `GITHUB_TOKEN` instead of a hard failure. It also stops truncating titles at the first newline,
  which silently cut wrapped one-sentence summaries mid-clause.

  **A 19-package release produced 19 disconnected pages.** `scripts/release-notes.ts` adds the missing
  rollup: everything one release shipped, grouped by kind rather than by package, with a change that
  touched 19 packages collapsed to one line instead of repeated 19 times. It posts as a preview
  comment on the Version PR — so the notes are reviewed before the merge that publishes them — and
  again as a rollup GitHub Release afterwards.

  **Apps are now part of releases.** `apps/docs` sat at `0.0.0` with no changelog and no tag while
  serving production — which is why this changeset carries a `major` bump for it: the release
  machinery, not a hand-edit, mints `docs@1.0.0` as the site's first real version, which is also the
  proof that apps now flow through the same path as packages. `privatePackages.version` is on, so apps and private packages version and
  generate changelogs like everything else; production deploys tag the shipped version (`docs@1.2.0`)
  and record it as a PostHog annotation alongside npm releases — so a trend break on any chart can be
  attributed to a release without reading Actions history.

  **The "needs a changeset?" gate asked the wrong question.** `changeset status` marks a package as
  changed when _any_ file under it differs — including `CHANGELOG.md`, so editing a changelog demanded
  a changeset, which when consumed edited the changelog again. CI already worked around this with the
  right rule inlined in a YAML `run:` block, which meant the pre-push hook and CI disagreed about
  whether the same branch was releasable. `scripts/check-changeset-coverage.ts` is that rule extracted
  — consumer-visible paths only — and both callers now share it.

  **Nothing enforced that a changeset was worth publishing.** `changeset-validity.test.ts` asserted a
  changeset parses and names real packages; nothing asked whether the text was any good.
  `scripts/lint-changesets.ts` adds eight rules, five blocking. The one that earns the gate is CS002: a
  breaking change to a published package must ship an upgrade path with a code example. A major bump
  breaks someone's build, npm has no undo after 72 hours, and the changeset text is the whole of what a
  consumer gets — there is no later step where that quality gets added.

  **The notes never answered the question a reader arrives with.** A changelog says what changed; it
  does not say whether upgrading is safe, so readers infer it from the version digits — exactly the
  inference semver communicates worst on its own. Both release surfaces now lead with the verdict, in
  identical wording, derived from the entries themselves rather than asserted separately:

  > ✅ **Safe to upgrade.** No breaking changes: existing configs keep working as-is.
  >
  > ⚠️ **This release contains 1 breaking change.** Read the 💥 section below before upgrading.

  Per-package notes also drop the version heading the Release title already shows, and close with the
  exact `npm install --save-dev <pkg>@<version>` line — omitted for private workspaces, where it could
  not work. The rollup additionally parses the `@changesets/changelog-github` entries that predate the
  new formatter, so the next release — which contains both dialects — reads as one document instead of
  mixing clean prose with 120 characters of inline link plumbing.

  **Changelog markdown style was consistent only by luck.** Nothing in CI formats markdown inside
  `CHANGELOG.md`, and changeset bodies arrive verbatim from whatever a contributor typed — so bullet
  markers, emphasis, table padding and wrapping drift entry by entry. The canonical form now includes a
  Prettier pass, so `changelog:check` fails on style drift as well as structural drift, and every
  changelog matches every other markdown file in the repo.

  Also adopted: prerelease trains (`changeset:pre:enter`) and snapshot builds (`changeset:snapshot`)
  wired to the dist-tag input `release.yml` already had; a machine-readable `rollup.json` attached to
  the rollup release; and an immediate tag/npm/Release reconciliation after publish, closing the
  up-to-seven-day window that `release-hygiene.yml`'s weekly schedule left open.

  No published npm package changes behaviour here — the only version this produces is the docs app's
  first.

### Patch Changes

- **🐛 Fix** — Correct the published rule count. It was overstated by 58 rules (513 → 455). ([#399](https://github.com/ofri-peretz/eslint/pull/399))

  `sync-plugin-stats.ts` derived every plugin's rule count by regex-matching
  `/^\s+'[a-z-]+'\s*:/gm` against the whole of `index.ts`. That also matched
  `plugins: { 'x-security': plugin }` inside every preset, so each plugin was
  over-counted by roughly one per config it ships — 21 of 30 published plugins,
  68 phantom rules.

  Fixing the scope surfaced two errors in the other direction:

  - `eslint-plugin-import-next` writes its keys unquoted (`named: named,`), which
    a quoted-only pattern missed entirely — undercounting it by 7.
  - `order: enforceImportOrder` is an alias, a second id for an implementation
    already counted. The oxlint shim generator has always treated aliases that way
    ("12 flat + 12 aliased"); counting distinct implementations makes the two
    agree.

  These numbers feed `interlace-numbers.json`, which is the single source for
  every count on the docs site, the READMEs and the badges.

  Nothing caught this because nothing compared the parse against an independent
  source. `.agent/oxlint-jsplugins-manifest.json` is one — the shim generator
  builds it by `require()`-ing each plugin's built output and reading
  `Object.keys(rules)`. All 30 published plugins now agree with it, and a new lock
  asserts exactly that comparison.

- **🔗 Dependencies** — updated workspace dependencies: `@interlace/ui@0.1.0`
