# ilb-app-h2h: graded head-to-head on vulnerable apps

Our plugins (local build) against `eslint-plugin-security` on an app whose vulnerabilities are
documented by its own maintainers. **Stages so far: OWASP NodeGoat (two revisions) and DVNA.** Draft; no number here is
published or cited in the docs.

## Run it

```bash
# from the repo root, with the four plugins built (npx turbo run build --filter=eslint-plugin-secure-coding ...)
node benchmarks/suites/ilb-app-h2h/run.mjs --app nodegoat            # clones at the pin, lints A/A-all/B/C, labels, writes the JSON
node benchmarks/suites/ilb-app-h2h/run.mjs --app dvna --out benchmarks/results/ilb-app-h2h/dvna.json
node benchmarks/suites/ilb-app-h2h/freeze-check.mjs nodegoat         # (or dvna) exits 1 if truth/class-map/configs were not frozen before the run
node benchmarks/suites/ilb-app-h2h/diagnose.mjs <clone-dir> --app dvna   # diagnostic only: every class-map rule on, to explain misses
```

Results: `benchmarks/results/ilb-app-h2h/`. `nodegoat.json` is revision 1 (labels corrected in 1b); `nodegoat.rev2.json` is the re-run after the rule-gap fixes landed on `main`; `dvna.json` is DVNA. Old revisions are kept beside new ones.

## What is in it

- `apps.json` (NodeGoat) and `apps.<name>.json` (later apps): repo, pinned commit, licence, truth source, lint globs.
- `truth/nodegoat.json`: the ground truth, built from the app's tutorial before any run (file, line ranges, CWE, source page, `lintable`).
- `truth/class-map.json` plus `truth/class-map.<app>.json`: truth class to the rule IDs that count as the right reason, per plugin set.
- `configs/`: `A` (their recommended), `A-all` (every rule at error), `B` (our recommended presets), `C` (B plus the driver plugin: mongodb-security for NodeGoat, in `ours.config.mjs`; sequelize-security for DVNA, in `ours.dvna.config.mjs`).
- `labels/nodegoat.manual.json`: written verdicts for findings that need judgement.
- `run.mjs`: aborts on an unpinned checkout, a stale or `node_modules`-resolved plugin, a wrong `eslint-plugin-security` version, or silently ignored files.

## Honest limits (read before citing)

- Single author for the truth table and the labels; not blind, no second labeller, no kappa yet.
- Truth lines are judgement from tutorial prose.
- Textbook vulnerabilities in a training app: this measures recall on those and precision on code written to be vulnerable, not production code.
- `freeze-check.mjs` reads commit order; a squash-merge erases it, so run it on the PR branch.
