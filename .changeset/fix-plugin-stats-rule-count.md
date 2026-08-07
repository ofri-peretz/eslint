---
'docs': patch
---

Correct the published rule count. It was overstated by 58 rules (513 → 455).

`sync-plugin-stats.ts` derived every plugin's rule count by regex-matching
`/^\s+'[a-z-]+'\s*:/gm` against the whole of `index.ts`. That also matched
`plugins: { 'x-security': plugin }` inside every preset, so each plugin was
over-counted by roughly one per config it ships — 21 of 30 published plugins,
68 phantom rules.

Fixing the scope surfaced two errors in the other direction:

- `eslint-plugin-import-next` writes its keys unquoted (`named: named,`), which
  a quoted-only pattern missed entirely — undercounting it by 7.
- `order: enforceImportOrder` is an alias, a second id for an implementation
  already counted. The oxlint shim generator has always treated aliases that way
  ("12 flat + 12 aliased"); counting distinct implementations makes the two
  agree.

These numbers feed `interlace-numbers.json`, which is the single source for
every count on the docs site, the READMEs and the badges.

Nothing caught this because nothing compared the parse against an independent
source. `.agent/oxlint-jsplugins-manifest.json` is one — the shim generator
builds it by `require()`-ing each plugin's built output and reading
`Object.keys(rules)`. All 30 published plugins now agree with it, and a new lock
asserts exactly that comparison.
