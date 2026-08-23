# Changesets

This directory holds [changesets](https://github.com/changesets/changesets) — small markdown files
describing what changed in a PR and which workspaces should bump (and at what semver level).

A changeset is the **only** input to release notes. Nothing is derived from commit messages, so a
change with no changeset is invisible in the changelog, in the rollup release, and to anyone reading
npm — regardless of how well the commit was written.

## Writing one

```bash
npm run changeset
```

It asks which workspaces changed, at what level, and for a summary. That writes
`.changeset/<random-name>.md`; commit it with the PR. Rename the file to something descriptive if you
like — the name is never published.

### Summary format

Start the summary with a [conventional-commit](https://www.conventionalcommits.org/) prefix. It is
what `changelog.cjs` turns into the entry's kind badge, and what `release-notes.ts` groups the
cross-package rollup by:

| Prefix                 | Badge          |
| ---------------------- | -------------- |
| `feat:`                | ✨ Feature     |
| `fix:`                 | 🐛 Fix         |
| `perf:`                | ⚡ Performance |
| `security:`            | 🔒 Security    |
| `docs:`                | 📚 Docs        |
| `refactor:` `chore:`   | 🧹 Maintenance |
| `build:` `ci:` `test:` | 🏗 🔧 🧪        |
| any + `!`              | 💥 Breaking    |

No prefix is fine — the badge then falls back to the bump level. A `!` before the colon
(`feat(devkit)!:`) or a `BREAKING CHANGE:` line in the body escalates to 💥 regardless of the level,
which is the one thing a reader must never miss.

The shape:

```markdown
---
'eslint-plugin-node-security': minor
---

feat(node-security): add `no-dynamic-algorithm-selection` (CWE-327)

Everything from here down is the body: what the rule catches, why it matters,
what a consumer has to do. It shows up indented under the entry in the package
CHANGELOG, and is deliberately left out of the cross-package rollup.
```

The **first paragraph** is the title (wrapped lines are joined, so wrapping at 80 columns is safe).
The first blank line ends it. Everything after is the body.

Guidelines:

- **One changeset per logical change**, not per package. A change touching six plugins is one file
  listing six packages — the rollup collapses it to one line naming them all.
- **Major bumps need a body.** A one-line summary is not a migration path.
- **Write for a consumer**, not for the reviewer of the PR. "Widen the `mongodb` peer range to
  include v7" beats "fix peers".

## What gets versioned

Everything in `packages/*` and `apps/*` with a `package.json`, including private ones —
`privatePackages.version` is `true`. That is deliberate: `apps/docs` is a production website whose
deploys need to be as traceable as an npm release, and an unversioned app cannot be referenced in a
changelog, a tag, or an analytics annotation. Private workspaces are versioned but never published;
`release.yml` skips them explicitly.

## The pipeline

1. **Feature PR** — you add a changeset.
2. **Merge to main** → `changesets-pr.yml` opens/refreshes the **Version Packages PR**. It runs
   `npm run changeset:version`, which bumps every affected `package.json`, regenerates each
   `CHANGELOG.md`, normalizes their shape, syncs source versions, and refreshes the lockfile. It also
   posts a **release preview** comment on that PR — the grouped rollup of everything about to ship,
   reviewable before the merge that publishes it.
3. **Merge the Version PR** → `release.yml` diffs each local version against npm, builds, runs the
   dist-integrity gate, and publishes the changed packages in parallel via Trusted Publishers (OIDC).
   Each package gets its own tag and GitHub Release; the run also creates one **rollup release**
   bundling everything, and annotates the release in PostHog.
4. **App deploys** — `auto-deploy.yml` / `deploy-docs.yml` ship affected apps, tag the deployed
   version (`docs@1.2.0`), and annotate the deploy in PostHog.

## What a reader gets

Both release surfaces lead with the same verdict, derived from the entries rather than asserted
separately — so they can never disagree with the list underneath them:

- **Per-package GitHub Release** (`scripts/extract-changelog.ts`) — the version's entries, then
  either "✅ Safe to upgrade" or "⚠️ Breaking release", then the exact `npm install` line. Private
  workspaces get the verdict but no install line.
- **Rollup GitHub Release** (`scripts/release-notes.ts`) — the verdict, the workspace counts, then
  every change grouped by kind with breaking first, then the full version table.

The verdict comes from `### Major Changes` and the 💥 badge, both written by the release machinery
from the changeset's declared bump. When a version cannot be found at all, the fallback stub carries
**no** verdict — guessing one and presenting it as fact is worse than saying nothing.

## Prereleases and snapshots

```bash
npm run changeset:pre:enter next   # start a prerelease train (next/beta/rc/alpha)
npm run changeset                  # …accumulate changesets as usual
npm run changeset:pre:exit         # back to stable
```

Publish under a matching dist-tag with `gh workflow run release.yml -f dist-tag=next`; release.yml
marks non-`latest` releases as prereleases so they stay off the default release page.

For a throwaway build to test an unreleased change from npm without spending a version number:

```bash
npm run changeset:snapshot   # 0.0.0-canary-<timestamp>
```

## Local commands

```bash
npm run changeset:status     # what's queued for the next release
npm run release:status       # queued bumps + recent tags per package
npm run release:rollup       # preview the grouped rollup notes
npm run changelog:check      # assert every CHANGELOG.md is canonical
npm run changelog:normalize  # …and fix the ones that aren't
```

## Formatting internals

`changelog.cjs` is a custom changesets changelog formatter (the `changelog` key in `config.json`).
It replaced `@changesets/changelog-github` to categorise entries, put the prose before the link
plumbing, drop self-attribution noise, and degrade to unlinked entries instead of throwing when
there is no `GITHUB_TOKEN`.

Two invariants are worth knowing before editing anything here, both locked by
`scripts/__tests__/changelog-format.test.ts`:

- **Every `CHANGELOG.md` must start with an H1.** changesets picks its insertion point with
  `/^#{1,6}\s+\d+\.\d+/.test(fileData)`; a file starting with a version heading it can't parse (our
  old `## [1.4.0] - 2026-05-03`) got treated as a title, and every later release was filed
  underneath it. That silently corrupted 20 of 22 changelogs before it was caught.
- **The badge strings are a protocol.** `changelog.cjs` emits them; `release-notes.ts` parses them
  back out to group the rollup. Renaming one without the other drops entries into "Other changes".

## Quality gate

`npm run changeset:lint` runs on every changeset, in the pre-push hook and as a **blocking** PR
check. Five rules block and three warn:

| Rule  | Level | What it catches                                                          |
| ----- | ----- | ------------------------------------------------------------------------ |
| CS001 | error | A version bump with no summary — publishes an empty entry                |
| CS002 | error | A breaking change to a **published** package with no upgrade path        |
| CS003 | error | A major bump with a title and nothing else                               |
| CS004 | error | Placeholder summaries — `TODO`, `WIP`, `update deps`, `fix stuff`        |
| CS005 | error | A summary under 10 characters                                            |
| CS006 | warn  | No conventional-commit prefix — the badge falls back to the semver level |
| CS007 | warn  | A title over 120 characters — the rollup shows titles only               |
| CS008 | warn  | Two changesets with the same summary; it renders twice                   |

CS002 is the one that earns the gate. A major bump on a published plugin breaks someone's build on
upgrade, npm has no undo after 72 hours, and the changeset text is the whole of what a consumer gets.
It is satisfied by a migration cue (`## Migration`, `## Upgrading`, a bolded before/after) **and** a
fenced code block — prose reliably explains what broke without ever showing what to type instead:

````markdown
---
'eslint-plugin-node-security': major
---

feat(node-security)!: `no-weak-hash` now flags SHA-1 by default

SHA-1 collisions are practical; the previous default only flagged MD5.

## Migration

```diff
  rules: {
-   'node-security/no-weak-hash': 'error',
+   'node-security/no-weak-hash': ['error', { algorithms: ['md5'] }],
  }
```

Keep the old behaviour with the explicit `algorithms` option, or accept the new default.
````

Private workspaces (`apps/*`) are exempt from CS002/CS003 — nobody installs an app, so there is no
consumer with a build to migrate.

## When one is required

`npm run changeset:coverage` (pre-push hook + the PR advisory) asks whether the branch touched
anything a consumer can observe:

- `packages/*/src/**` and `packages/*/package.json`
- `apps/*/src/**` and `apps/*/package.json`

Everything else — CHANGELOGs, READMEs, tests, fixtures, configs, workflows, scripts — needs no
changeset.

This deliberately replaced `changeset status`, which asks whether _any_ file under a package
changed. That included `CHANGELOG.md`, so editing a changelog demanded a changeset, which when
consumed edited the changelog again. The rule was circular, and it disagreed with the CI advisory
(which had the right rule inlined in YAML). Both now call
`scripts/check-changeset-coverage.ts`.

## Skipping

Add the `skip-changeset` label for internal-only work (build scripts, tests, repo docs). The
check is advisory in both places — it warns and comments, it doesn't block.
