---
'eslint-plugin-conventions': patch
---

fix: `prefer-dependency-version-strategy` no longer rewrites objects that are not dependency maps

The `ObjectExpression` fallback decided "is this a dependency map" from the
VALUES alone, never the keys — despite its own comment stating the contract as
"keyed by package name AND every value is a version specifier". Only the second
conjunct was implemented, so the guard passed vacuously whenever no
disqualifying sibling was left, and the rule offered a `fixable: 'code'`
rewrite on data that is not a dependency anywhere:

- an npm `dist-tags` map (`{ latest: '2.1.0' }`) — keys are TAG names and a
  dist-tag resolves to one exact version, so `^2.1.0` is not a thing npm accepts
- a manifest's own `version` field (`{ version: '1.0.0' }` → `'^1.0.0'`, an
  unpublishable package.json)

`{ name: 'x', version: '1.0.0', main: 'index.js' }` was already exempt; narrowing
it to one property brought the report back.

The fallback now also reads keys: a key naming a package.json manifest field
says the object is a manifest, and a block whose parent key is a known
non-dependency block (`dist-tags`, `versions`, `engines`, …) is skipped
outright. `dependencies` / `devDependencies` / `peerDependencies` are
deliberately absent from that list. A block key chosen at runtime names nothing
and is still read, so the fix buys no new false negative.

Found by the burgee FP/FN sweep at `packages/compat-oracle/src/registry.test.ts:74`
and `packages/compat-oracle/src/watch.test.ts:99`.
