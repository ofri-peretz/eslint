# Design — an oxlint user installs our rules by an oxlint name, and gets no ESLint

Intent: [`intent.md`](./intent.md). **Status:** draft.

---

## Requirements

- **R1** Every non-private `packages/*` package that declares an `eslint` peer
  marks it `peerDependenciesMeta.eslint.optional: true`. That covers 32 plugins
  plus `@interlace/eslint-devkit`. The version range doesn't change.
- **R2** For each `packages/eslint-plugin-<name>` there is a
  `packages/oxlint-plugin-<name>/` containing exactly these files:
  - `package.json`:
    - `name` is `oxlint-plugin-<name>`.
    - `version` is the plugin's version.
    - `dependencies` is `{ "eslint-plugin-<name>": "<that exact version>" }`.
    - `main` is `index.js`.
    - `files` is `["index.js", "index.d.ts", "README.md", "LICENSE"]`.
    - `keywords` includes `oxlint`, `oxlint-plugin`, `vite-plus`, plus the
      plugin's own keywords.
    - `license`, `repository` (with `directory`), `homepage`, `bugs` and `author`
      are copied from the plugin.
    - No peers.
  - `index.js`: `module.exports = require('eslint-plugin-<name>/oxlint');`
  - `index.d.ts`: `export = require('eslint-plugin-<name>/oxlint')`, written in a
    form that typechecks.
  - `README.md`: what the package is, the install command, a working
    `.oxlintrc.json` snippet and a `vite.config.ts` `lint` snippet, plus a link
    to the plugin's README for the rule list. It does not copy the rule list.
  - `LICENSE`: copied from the plugin.
- **R3** One generator writes all of R2: `scripts/generate-oxlint-aliases.ts`.
  `--check` exits non-zero and names every file that is missing, extra or
  differs. It is wired as `oxlint:aliases` / `oxlint:aliases:check` and added to
  `quality` next to `oxlint:shims:check`.
- **R4** `.changeset/config.json` `fixed` holds one
  `["eslint-plugin-<name>", "oxlint-plugin-<name>"]` pair per plugin. The
  generator writes it, and `--check` covers it.
- **R5** Each alias resolves through oxlint's `jsPlugins` with the IDs
  `<name>/<rule>`, and its rule set equals the plugin's `rules` keys. The IDs
  come from `meta.name`, so this lock also catches a future edit to `meta.name`
  in a plugin. That edit would silently rename every rule for oxlint users.
- **R6** The aliases land with `"private": true` until Ofri flips them (open
  question 1). The generator takes this as one constant, so flipping it is a
  one-line diff that regenerates 32 manifests.

## Design

**Order:** R1 → generator (R2, R3, R4) → locks (R5, R1 lock) → absorb the
repo-wide gates.

1. **Optional peer (R1).** Edit the 33 manifests with a one-off `node -e` pass;
   the devkit gets the same edit. Add a case to
   `scripts/__tests__/eslint-peer-floor.test.ts`, which already walks every
   manifest's eslint peer. The new case asserts
   `peerDependenciesMeta.eslint.optional === true`. No new test file.
2. **Generator (R2–R4).** Use the same idiom as `generate-oxlint-shims.ts`. It
   lists `packages/eslint-plugin-*`, renders each file as a string, and then
   either writes it or compares in `--check` mode. Each alias's `version` and
   dependency come from the plugin's current `package.json`. The changesets
   `fixed` array is rebuilt from the same list, and other config keys are left
   alone.
3. **Version lockstep.** `changeset version` with
   `updateInternalDependencies: "patch"` rewrites the exact dependency
   `"2.6.4"` to `"2.6.5"`. Changesets keeps the range type, and an exact version
   stays exact. The `fixed` group bumps both packages to the same version.
   `oxlint:aliases:check` catches anything that slips past
   (`version !== plugin.version`).
4. **Parity lock (R5).** Add `scripts/__tests__/oxlint-aliases.lock.test.ts`. For
   each alias:
   - Write a temp `.oxlintrc.json` with `"jsPlugins": ["oxlint-plugin-<name>"]` and
     every `<name>/<rule>` from `require('eslint-plugin-<name>').rules` set to
     `"off"`, plus one sentinel `<name>/__no_such_rule__`.
   - Run the installed `oxlint` on an empty fixture.
   - Assert that the real IDs are accepted and the sentinel is rejected as
     unknown. This proves oxlint does reject unknown IDs, so acceptance actually
     means something.
   - Also assert that the keys of `require('oxlint-plugin-<name>').rules` deep-equal
     the plugin's. This needs a built `dist/`, so the test goes in the same tier as
     the existing `published-entry-points-are-produced` lock. It runs one oxlint
     process per alias, 32 processes at ~0.2s each.
5. **Repo-wide gates.** 24 scripts and locks loop over `packages/*` without
   filtering to `eslint-plugin-*`. Examples: `check-version-alignment`,
   `check-changeset-coverage`, `lint-publish-warnings`,
   `codecov-measures-what-ships`, `ts7-solution-graph-lock`, `stamp-utm-links`.
   Build runs `npm run ci:local`. For each one that fails, we choose one of two
   fixes:
   - **Participate**, when the gate is right about aliases. Examples: version
     alignment and changeset coverage.
   - **Skip**, by name prefix `oxlint-plugin-`, when the gate is about source
     code the aliases don't have. Examples: codecov components, the tsbuildinfo
     graph, rule docs.

   No shared predicate module unless three or more gates need it. Each skip
   carries a one-line comment naming this intent.

**Files:**

| Path                                                                           | Change                                               |
| :----------------------------------------------------------------------------- | :--------------------------------------------------- |
| `packages/oxlint-plugin-*/`                                                    | 32 directories, 5 generated files each               |
| `scripts/generate-oxlint-aliases.ts`                                           | new                                                  |
| `scripts/__tests__/oxlint-aliases.lock.test.ts`                                | new                                                  |
| `scripts/__tests__/eslint-peer-floor.test.ts`                                  | one new case                                         |
| `packages/eslint-plugin-*/package.json`, `packages/eslint-devkit/package.json` | `peerDependenciesMeta.eslint`                        |
| `.changeset/config.json`                                                       | `fixed`                                              |
| `package.json`                                                                 | 2 scripts, plus `quality`                            |
| `package-lock.json`                                                            | 32 workspace links                                   |
| `.changeset/*.md`                                                              | one patch changeset for the 33 peer edits            |
| whatever step 5 surfaces                                                       | skips or participation                               |
| `docs/oxlint-integration.md`                                                   | one paragraph: install by the `oxlint-plugin-*` name |

## Verification

- **The loop:**

  ```bash
  npm run oxlint:aliases:check && npx vitest run --config scripts/__tests__/vitest.config.mts oxlint-aliases eslint-peer-floor
  ```

- **Prove each check fails on the unfixed state** (rule 4):
  - Run the parity lock with `packages/oxlint-plugin-postgresql-security`
    deleted. It must fail on resolution.
  - Run it with one alias's `index.js` pointing at the wrong plugin. It must fail
    on rule-set equality.
  - Run it with the `eslint-peer-floor` case against `origin/main`'s manifests.
    It must report 33 violations.
  - Run `--check` with one README hand-edited. It must fail and name the file.
- **The gate:** `npm run ci:local`, which is the full pre-push suite, must be
  green before the PR opens.

## Rejected alternatives

- **Rename or re-publish the plugins under `oxlint-plugin-*`.** That breaks every
  ESLint user's config and doubles the source.
- **A `@interlace/oxlint-plugin-<name>` scope.** The IDs would still be `<name>/`,
  because they come from `meta.name`. But nobody searching npm for
  `oxlint-plugin-<thing>` finds a scoped name. It is also not the name a user
  would guess from the `eslint-plugin-<name>` they already know.
- **Copy `dist/` into each alias with no dependency.** That duplicates the logic
  and breaks version lockstep.
- **Migrate rules to `createOnce` / `eslintCompatPlugin` from
  `@oxlint/plugins` now.** No measurement says the `create` path is slow. Reopen it
  only if the parity benchmarks show that.
- **Hand-write 32 READMEs.** They drift. The generator plus `--check` is cheaper
  than reviewing 32 copies.
- **Put the aliases outside `packages/`.** That would dodge the 24 enumerating
  gates, but `release.yml` only publishes `packages/*`. It would fork the release
  path and the baseline tooling just to save a one-time pass over the gates.
- **Make the eslint peer optional only in the aliases.** npm resolves peers
  through the dependency, so the plugin's required peer would still install ESLint
  under the alias.
- **Declare `oxlint` as a peer of the aliases.** Vite+ bundles its own oxlint, so a
  required peer would install a second copy. An optional peer adds nothing that
  oxlint's own loader doesn't already check.

## Out of scope

- Publishing to npm, and flipping `private`. That happens at the Deploy gate, by
  Ofri.
- Trusted Publishing setup for the 32 new names (intent, open question 2).
- Docs-site pages, logos, or comparison-table entries for the aliases.
- Vite+-specific presets, such as a `vite-plus` config export. Add them when a user
  asks.
- `createOnce` migration and performance work.
