# Pre-Publish Ecosystem-Integrity Gate

> **Status:** Active
> **Owner:** Interlace ESLint Team
> **Purpose:** Make it impossible to publish a plugin whose configs/rules throw
> when a consumer lints — the failure mode that shipped broken `recommended`
> builds of `eslint-plugin-maintainability`, `-operability`, and
> `-react-features` to npm.

## The failure mode this closes

A plugin's `recommended` preset declared a plugin **key** that didn't match its
rule **prefix** — e.g. the plugin was registered under
`@interlace/maintainability` while its rule keys stayed `maintainability/…`. In
ESLint flat-config, `maintainability` is then an **undefined plugin namespace**,
so the moment a consumer lints a matching file ESLint throws:

```text
Key "rules": Key "maintainability/cognitive-complexity":
Could not find plugin "maintainability" in configuration.
```

The source was fixed in the 2026-05-16 namespace cleanup, but two plugins were
never re-published — so **npm kept serving the broken builds**. The bug was a
property of the _published artifact_, not the source.

## Why source-only tests didn't catch it

`packages/eslint-config-interlace/src/ecosystem-integrity.test.ts` is the lock:
it loads every published plugin's every config preset into a real ESLint and
asserts the rule→plugin references resolve. But under vitest it runs against
**workspace SOURCE** — its `vitest.config.mts` aliases every `eslint-plugin-*`
to its `src/index.ts`. Source is always current, so the suite locks the source
against regression but is **blind to a stale or mis-built `dist/`**.

Two independent gaps had to be closed:

1. **Run the same assertions against the built `dist/`** (not source), so a
   stale/broken artifact fails _before_ `npm publish`.
2. **Exercise the resolution under every supported ESLint major.** The
   "Could not find plugin" error fires under ESLint 8, 9, and 10 alike — but
   **only when the probe config actually matches the probe file** (see the next
   section).

### Subtlety the lock now encodes: the `files` matcher is load-bearing

Every Interlace preset is a bare `{ plugins, rules }` object with **no `files`
key**. In flat-config, a config block only _activates_ — and therefore only
resolves its `rules` → `plugins` references — for a file that some block
**positively matches** via `files`. With no matcher anywhere in the array,
ESLint reports _"File ignored because no matching configuration was supplied"_
and **never resolves the rules**, so the namespace bug sails straight through a
naive `lintText` probe.

Both the vitest lock and the dist gate therefore **prepend a
`files: ['**/\*.{js,jsx,ts,tsx,cjs,mjs}']`matcher**, strip any preset-internal`files`/`ignores`, and additionally assert the probe file was **not** ignored —
so the resolution check can never silently degrade back into a no-op.

> Verified empirically (2026-06): under both `eslint@9.39` and `eslint@10.4`,
> the original bug shape throws "Could not find plugin" **only** with the
> matcher present; without it the probe file is ignored and the check passes
> vacuously. All 69 presets across the 19 published plugins are bare
> `{ plugins, rules }` objects, so before this change **every** config-load
> assertion in the lock was a vacuous pass.

## The gate

`scripts/verify-dist-integrity.ts` imports each plugin from its **built `dist/`
entry** (`dist/package.json#main` → `dist/src/index.js`; the published tarball
root _is_ `dist/`) and runs the same two assertions as the vitest lock:

1. every preset loads into a real ESLint with **no throw** and a matching probe
   file (full rule→plugin resolution);
2. every rule is a well-formed `RuleModule` (`meta.type` + `create()`).

It uses whatever `eslint` is installed, so CI can run it once per supported
major. Any `eslint-plugin-*` directory without a local `package.json` is a
stale/manifest-less leftover, not a real package, and is skipped.

```bash
npm run build                          # produce packages/*/dist
npm run verify:dist-integrity          # gate, current eslint
npm run verify:dist-integrity:release  # gate + FAIL if any published plugin is unbuilt
```

Exit codes: `0` clean · `1` a preset threw / a rule was malformed / (release
mode) a published plugin had no `dist/` · `2` setup error.

## CI wiring (implemented)

`.github/workflows/release.yml` runs a **`integrity`** job between `build` and
`publish`:

- `needs: [detect, build]`; `publish` now `needs: [detect, build, integrity]`,
  so **a failed integrity check blocks the entire publish fan-out**.
- It downloads the `dist` artifact STAGE 2 built and runs
  `npm run verify:dist-integrity:release`.
- It is a **matrix over `eslint: ['8', '9', '10']`** — every major in
  `docs/ESLINT_VERSION_SUPPORT.md`. Each cell installs its ESLint with
  `npm install --no-save eslint@^<major>`, which leaves the lockfile
  **hash-identical and git-clean** (verified) — same mechanism
  `eslint-version-matrix.yml` already uses. No second ESLint is pinned in
  `package.json`, so there is **zero lockfile churn**.

This is exactly the gate the
`.changeset/fix-maintainability-operability-namespace.md` note asked for:

> Run it against the built `dist/` in the release pipeline (pre-publish) to also
> catch a stale-artifact publish — the failure mode that let these two ship
> broken.

## Recommended CI step to stop recurrence (summary)

If re-implementing from scratch, the one job that stops this class of bug is:

```yaml
# after `turbo run build`, before `npm publish`
integrity:
  needs: [detect, build]
  strategy:
    matrix:
      eslint: ['8', '9', '10'] # docs/ESLINT_VERSION_SUPPORT.md
  steps:
    - uses: actions/checkout@v6
    - uses: ./.github/actions/setup
    - uses: actions/download-artifact@v8 # the dist built above
      with: { name: dist, path: packages/ }
    - run: npm install --no-save "eslint@^${{ matrix.eslint }}" # no lockfile churn
    - run: npm run verify:dist-integrity:release
# and: publish.needs must include `integrity`
```

## Relationship to `verify:artifact`

`scripts/verify-published-artifact.ts` (`npm run verify:artifact:all`) is a
complementary, deeper check: it `npm pack`s a plugin + the workspace devkit,
installs into a clean temp project, and diffs ESLint **and** oxlint findings
against a per-plugin baseline fixture. It is stronger per-plugin (it catches
`files:[]` omissions, devkit resolution, oxlint-shim drift) but **fixture-gated**
— today only `eslint-plugin-secure-coding` ships a
`test/artifact-smoke/fixture.js`, so it covers **1 of 19** plugins, and it pins
`eslint@9` only.

`verify:dist-integrity` is the breadth complement: **all 19 plugins × all 69
presets × every supported ESLint major**, no per-plugin fixture required. Run
both — `verify:artifact:all` for depth where fixtures exist, `verify:dist-integrity:release`
for the ecosystem-wide no-throw floor. Extending artifact-smoke fixtures to the
other 18 plugins is the natural follow-up that would let `verify:artifact` reach
the same breadth.
