---
slug: cli-floor-rules
opened: 2026-09-24
packages:
  - eslint-plugin-cli-floor
  - eslint-devkit
  - docs
cases: []
---

# Intent — the lint half of burgee's F3, O3 and P1 lives here

**Status:** review · **Opened:** 2026-09-24 · **Owner:** @ofri-peretz

---

## What is wanted

A published `eslint-plugin-cli-floor` whose rules hold the three burgee requirements whose stated
behaviour _is_ a lint rule, over any CLI built on commander, yargs or burgee:

| burgee | Requirement                                                                                  | Rule                                                     |
| :----- | :------------------------------------------------------------------------------------------- | :------------------------------------------------------- |
| F3     | every command declares a description and ≥1 example; examples are single-line copy-pasteable | `require-command-description`, `require-command-example` |
| O3     | command code writes through the output layer, never `console.*`                              | `no-console-in-command`                                  |
| P1     | every prompt is backed by a flag; a flag value skips the prompt                              | `no-prompt-without-flag`                                 |

## Why now

burgee decision D-124 (2026-09-23) placed the lint half of F3, O3 and P1 in this repository —
the one where this family's lint plugins are built, published and benchmarked. burgee's spec
marks all three rows `Not built`, "held by `L` only; `eslint-plugin-cli-floor` is not a package",
and its GAPS row C5 names this work. `npm view eslint-plugin-cli-floor` returns 404, so the name
burgee's intent recorded is free.

## Affected users and systems

- New package `packages/eslint-plugin-cli-floor` (quality pillar, `cli` scope environment).
- `@interlace/eslint-devkit`: one `PLUGIN_DOCS_CATEGORY` entry.
- `docs`: plugin pages, rule pages generated from the `.md` SSOT, the stats generator's category.
- The registries every new plugin joins (codecov, ecosystem inventory, oxlint shim, scope audit,
  type-awareness scan, artifact size, name map, benchmark config, by-rule fixtures).

## Constraints

1. Rules decide by evidence — a binding resolved to the host's export — never by a name. The
   `lint:name-inference` gate holds this; so does the per-rule "renamed to foo/bar" case.
2. Precision over recall: where the source cannot be read (a spread, a description in a
   variable, an imported builder or command module), the rule abstains.
3. No `@interlace/eslint-config`.
4. `no-prompt-without-flag` is `strict` only, as burgee's intent for this plugin decided, until a
   precision study on real CLIs.

## Success criteria

- Four rules, each with valid and invalid cases per host, including false-positive traps where
  the host is absent or the receiver is not the host's; 100% statement/branch coverage.
- Each rule's check, removed, turns named cases red.
- A first run over real CLIs (burgee's demos, and commander/yargs CLIs in `node_modules`)
  reports only true findings, recorded in the PR.
- burgee flips F3, O3 and P1 once this merges.

## Open questions

- The precision study that would promote `no-prompt-without-flag` into `recommended` has not
  run: the first real-code sweep contained no prompts at all.
