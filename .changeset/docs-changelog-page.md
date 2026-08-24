---
'docs': minor
---

feat(docs): a `/changelog` page for the whole ecosystem

Releases were recorded in four places — per-package `CHANGELOG.md`, git tags,
GitHub Releases, and npm — and every one of them requires the reader to already
know it exists. None answers "what has changed lately across the things I
install" without opening thirty tabs.

`/changelog` is that page: 449 releases across 32 packages, newest first,
filterable by package, with every entry linked to the pull request that shipped
it and every published version showing the exact install command.

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
