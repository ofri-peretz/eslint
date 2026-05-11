# Changesets

This directory holds [changesets](https://github.com/changesets/changesets) — small markdown files
describing what changed in a PR and which packages should bump (and at what semver level).

## Workflow

1. **In your feature PR**, run:

   ```bash
   npm run changeset
   ```

   It asks:
   - Which packages changed?
   - Major / minor / patch?
   - A summary line (lands in the CHANGELOG).

   This writes a file like `.changeset/spicy-llamas-dance.md`. Commit it with the PR.

2. **CI opens a "Version Packages" PR** automatically (via `version-pr.yml`).
   It accumulates every changeset since the last release, bumps versions in
   each affected `package.json`, regenerates `CHANGELOG.md`, and deletes the
   consumed changeset files.

3. **Merge the Version Packages PR.** That push to `main` triggers
   `release.yml`, which detects the version diff vs npm and publishes the
   affected packages in parallel via Trusted Publishers (OIDC).

## What goes in a changeset?

- **One changeset per logical change.** A PR can have multiple changesets if
  it touches multiple unrelated packages.
- **Skip the changeset** if the PR is internal-only (refactor of build
  scripts, doc fixes, test-only). The `lint:changesets` gate is advisory —
  it warns but doesn't block.
- **Major bumps** require an explanation in the changeset body, not just
  the summary line.

## Editing a changeset later

Just edit the file by hand. Empty changesets (`---\n---\n`) are valid and
will be consumed without bumping anything (useful for "release notes only"
entries — though we usually prefer to drop them).

## Config

See `config.json`. Highlights:
- `access: "public"` — every package publishes publicly to npm.
- `commit: false` — the bot opens a PR rather than committing directly to main.
- `changelog: @changesets/changelog-github` — generates CHANGELOG entries
  with PR + author backlinks.
