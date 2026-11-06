# ADR 0009 — GitHub Releases are per package only

- **Status:** accepted
- **Date:** 2026-11-06
- **Deciders:** @ofri-peretz

## Context

Every `release.yml` run created two kinds of GitHub Release:

- one `<name>@<version>` release per published package, created with
  `--latest=false`, and
- one cross-package rollup, `release-<date>-<sha>`, titled
  "Release … · N package(s)", created with `--latest` so it held the badge.

Since each `eslint-plugin-X` ships together with its `oxlint-plugin-X`
(changesets `fixed` groups), a typical release produced three pages for one
change: two package releases and a rollup repeating them. The releases page
interleaved the two tag namespaces, and the "Latest" badge pointed at the
rollup rather than at any package someone can install.

`ofri-peretz/burgee` publishes per-package releases only, and the owner wants
the two repos to read the same way.

## Decision

Drop the rollup, keep the pairs.

- `release.yml` creates only per-package `<name>@<version>` GitHub Releases.
  The rollup steps (`release-notes.ts` into a release body, the `rollup.json`
  asset, the optional `RELEASE_DISCUSSION_CATEGORY` thread) are gone.
- The newest per-package release a run created carries "Latest". The publish
  matrix still passes `--latest=false`, because its jobs race; the summarize job
  marks the newest of that run's releases with `gh release edit --latest`, once.
  Pre-release dist-tags and dry runs never move the badge.
- The changesets `fixed` pairs in `.changeset/config.json` stay. They keep each
  ESLint plugin and its oxlint twin on one version; that is a versioning
  guarantee, not a release-page one.
- The grouped cross-package view still exists where it is read before a
  release: the release preview comment on the Version Packages PR
  (`changesets-pr.yml`, `scripts/release-notes.ts`).

`scripts/__tests__/release-workflow-lock.test.ts` locks this shape.

## Consequences

- One page per installable artifact; the badge points at a package with an
  `npm install` line.
- No GitHub page answers "what shipped in this run" after the fact. The Version
  PR's preview comment and the run summary answer it; each package's
  `CHANGELOG.md` remains the source of truth.
- Existing `release-*` rollup releases are left in place as history.
  `scripts/verify-release-notes.ts` still tolerates them, because `--latest=N`
  audits can reach them.
- Unlike burgee's current workflow, which passes `--latest=false` everywhere and
  never reassigns the badge, this workflow assigns it on purpose. Without that,
  "Latest" stays on whatever release last held it.

## Alternatives considered

**Keep the rollup, drop the per-package releases.** Rejected: release tooling,
OpenSSF Scorecard and `release-hygiene.yml` reconcile per-package tags against
npm, and a rollup has no install line.

**Let each per-package create claim `--latest`.** Rejected: the matrix jobs run
in parallel, so the badge would land on whichever job finished last.
