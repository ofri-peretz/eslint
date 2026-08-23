---
'docs': major
---

chore(release): categorised changelogs, a cross-package rollup, and versioned apps

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

Also adopted: prerelease trains (`changeset:pre:enter`) and snapshot builds (`changeset:snapshot`)
wired to the dist-tag input `release.yml` already had; a machine-readable `rollup.json` attached to
the rollup release; and an immediate tag/npm/Release reconciliation after publish, closing the
up-to-seven-day window that `release-hygiene.yml`'s weekly schedule left open.

No published npm package changes behaviour here — the only version this produces is the docs app's
first.
