---
'eslint-plugin-conventions': patch
---

fix(conventions): `prefer-dependency-version-strategy` reads manifests, not shapes

The rule treated any object of package names to version strings as a
dependency map, so a table of exact versions a compatibility oracle graded got
one report per entry, and the autofix would have rewritten those pins to
ranges. It now reads only objects under a `dependencies`, `devDependencies`,
`peerDependencies` or `optionalDependencies` key. Other objects of that shape
are no longer reported.

Two false negatives are fixed on the way, so some projects will see new
findings:

- `optionalDependencies` is now checked.
- The documented `**/package.json` setup through `jsonc-eslint-parser` reported
  nothing, because the rule only matched ESTree `Property` nodes. It now also
  matches `JSONProperty`, so a real `package.json` is linted.

A quoted `"dependencies"` block in source is no longer reported twice, and an
unquoted `dependencies:` key is matched by name rather than by the removed
shape fallback.
