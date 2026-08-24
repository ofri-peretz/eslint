---
'docs': minor
---

feat(docs): plugin changelogs render from build-time data, not a runtime fetch

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
