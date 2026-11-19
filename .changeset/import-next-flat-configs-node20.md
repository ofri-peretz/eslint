---
'eslint-plugin-import-next': minor
'oxlint-plugin-import-next': minor
'@interlace/eslint-devkit': minor
---

feat(import-next): `flatConfigs`, key for key with eslint-plugin-import, and Node 20.19 support

A config written for eslint-plugin-import now works when only its import line changes:

```diff
- import importPlugin from 'eslint-plugin-import';
+ import importPlugin from 'eslint-plugin-import-next';

  export default [importPlugin.flatConfigs.recommended, importPlugin.flatConfigs.typescript];
```

- `flatConfigs` has eslint-plugin-import 2.32.0's seven keys (`recommended`, `errors`, `warnings`, `react`, `react-native`, `electron`, `typescript`), with the same `import/…` rule IDs, severities, `settings`, `languageOptions` and `name`, and registers the plugin as `import`. Before this, `importPlugin.flatConfigs.errors` was `undefined` and such a config failed to load. A test compares every key with the installed eslint-plugin-import and lints a fixture with both through ESLint, expecting the same findings (rule, line, severity).
- The default export is now the module itself, the object `require()` and an `eslint.config.mjs` default import already returned, plus a top-level `meta`. Every loader (Node ESM, CommonJS, TypeScript/jiti) now gets one object, so `{ plugins: { import: importPlugin } }` next to `importPlugin.flatConfigs.errors` loads instead of throwing `Cannot redefine plugin "import"`. `meta`, `rules`, `configs` and `plugin` are unchanged.
- `engines.node` is now `^20.19.0 || ^22.13.0 || >=24`, ESLint 10's range, for eslint-plugin-import-next, oxlint-plugin-import-next and `@interlace/eslint-devkit`. Both packages' unit suites pass on Node 20.19.0 on the ESLint side; oxlint's own `RuleTester` does not start below Node 22, so the oxlint-engine cases are not run there. A Node 20.19.0 cell is added to the nightly node-version matrix (ADR 0013).
