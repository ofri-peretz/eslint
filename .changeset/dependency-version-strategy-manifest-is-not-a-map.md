---
'eslint-plugin-conventions': patch
---

fix(conventions): `prefer-dependency-version-strategy` no longer reads a manifest as a dependency map

Any object literal holding one version-like string was checked as if every property were a dependency:

```ts
writeFileSync(
  'package.json',
  JSON.stringify({ name: 'x', version: '1.0.0', main: 'index.js' }),
);
// reported: Dependency "version" should use caret version
```

A dependency map is keyed by package name and every value is a version specifier. The object-literal fallback now stands down when any value is not one — a name, a path, a date, a number, an array — so package.json fixtures in tests and records that carry a `version` beside other fields are left alone. Homogeneous maps (`{ react: '18.0.0', lodash: '^4.17.21' }`), maps with dist-tags or `*`, and the `dependencies` block inside a manifest still report.
