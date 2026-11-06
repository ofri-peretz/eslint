# ADR 0010 — Published packages require Node 22.13; CI tests 22, 24 and 26

- **Status:** accepted
- **Date:** 2026-11-06
- **Deciders:** @ofri-peretz

## Context

Every published package declared `engines.node: ">=18.0.0"`, but CI ran
only the `.nvmrc` Node (24). Node 18 and 20 were claimed and never tested,
and both are end-of-life upstream: 18 on 2025-04-30, 20 on 2026-04-30. Node
26 was promoted to Active LTS in October 2026 and was not tested either.

`ofri-peretz/burgee` makes the same change on the same day
(`D-20261106-node-22-24-26`), and the owner wants the two repos to state the
same support.

## Decision

- Every published package declares `engines.node: ">=22.13.0"`. 22.13 is
  where `require(esm)` loads without an ExperimentalWarning on the 22 line
  (22.12 still prints one), so it is the lowest 22 a CommonJS consumer can
  use cleanly. The `oxlint-plugin-*` aliases copy the field from their
  `eslint-plugin-*` (`scripts/generate-oxlint-aliases.mts`).
- Released as a **major** on every published package. Dropping a Node line
  breaks a consumer still on it, whatever the code does. The changesets
  `fixed` pairs move each `oxlint-plugin-X` with its `eslint-plugin-X`.
- Pull requests keep running on the `.nvmrc` Node only, so a PR costs what
  it did. `node-version-matrix.yml` runs the node-lane unit tests on exactly
  22.13.0 and on 26, nightly and on `workflow_dispatch`, with a failure issue
  from an aggregate job (ADR 0006). 24 is not repeated there: Quality (Full)
  runs the whole battery on it on every push to main.
- Each matrix cell installs on its own Node rather than restoring the shared
  `node_modules` archive, because that archive is keyed on the lockfile alone
  and a native addon built on 24 does not load on 22 or 26.
- Private packages and tools (`interlace-monorepo` on `24.x`,
  `oxlint-plugin-security`, which mirrors the incumbent's range, and the
  private `>=18.0.0` workspaces) are not published and are left as they are.

## Consequences

- A consumer on Node 18 or 20 stays on the previous major of each package.
- Node 22.13, 24 and 26 are each run by some job, so every supported major
  is a tested claim rather than a declared one.
- Code written to keep Node 18 or 20 working stays until a test shows it is
  dead; none was removed with this change.
- A break that only shows on 22.13 or 26 surfaces the next night, not on the
  PR that caused it. Run the workflow by hand when a change plausibly depends
  on the Node version.

## Alternatives considered

**Run 22, 24 and 26 on every pull request.** Rejected: it triples the unit
test jobs on every PR against a 20-job concurrency budget, for drift that a
nightly run catches within a day.

**Keep `>=18.0.0` and test 18 and 20 too.** Rejected: both lines are
end-of-life, so a bug found there would not be fixed upstream.

**`^20.19.0 || >=22.13.0`.** Rejected: Node 20 is end-of-life, and burgee
drops it in the same change.
