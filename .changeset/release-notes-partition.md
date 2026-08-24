---
---

fix(release): lead release notes with what reaches consumers

The first rollup the new system published opened like this:

> ✅ **Safe to upgrade.** No breaking changes: existing configs keep working as-is.
>
> ### 💥 Breaking changes
>
> - categorised changelogs… — `docs` _(internal — not published)_

The banner and the first heading contradict each other. The per-line
`(internal)` marker resolves it, but only after the reader has read the line —
and a heading is read before its contents. In that release four of five entries
were internal app churn, so the one fix a consumer actually cared about was
buried under three sections that could not affect them.

Consumer-facing entries now lead; everything internal is collapsed into a
`<details>` at the end. Nothing is dropped — the release record stays complete,
under a heading that says what it is.

Also adds `scripts/verify-release-notes.ts`, which reads back the GitHub
Release bodies a run just created and checks them: not the fallback stub, an
upgrade verdict present, a correct install line, no raw link plumbing leading a
bullet, no split code spans. Everything upstream of the publish was
unit-tested; nothing tested the artifact — and every defect found in this
system so far was found by opening the published page and reading it. Run
against the last six releases it flagged 12 real issues, all in pre-#660 notes,
and passed both releases the new system produced.

No published package behaviour changes.
