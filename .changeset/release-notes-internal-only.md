---
---

fix(release): say when a release publishes nothing to npm

The first Version PR under the new release notes (#667) came out like this:

> ✅ **Safe to upgrade.** No breaking changes: existing configs keep working as-is.
>
> ### 💥 Breaking changes
>
> - categorised changelogs… — `docs` _(internal — not published)_

Every entry in that release is internal, and the notes still read like a
customer release. "Safe to upgrade" is true and useless — there is nothing to
upgrade — and a reader only discovers that by noticing each entry is marked
internal, four sections down.

There are three answers to "can I take this release?", not two: it breaks you,
it doesn't, or none of it reaches you. The third now says so up front:

> ℹ️ **Nothing published to npm in this release.** Only internal packages and
> apps changed — no installed dependency is affected.

Same source as the other two (`scripts/release-verdict.ts`), so the wording
cannot drift between the rollup and the per-package notes.

No published package behaviour changes.
