---
'eslint-plugin-import-next': patch
---

fix(import-next): architecture and ecosystem rules read every import spelling and decide by the path an import resolves to, found by fidelity models.

- Every way a module is loaded is checked: `export … from` / `export * from` (no-nodejs-modules, prefer-node-protocol, no-relative-parent-imports, max-dependencies, no-restricted-paths, no-legacy-imports, require-import-approval, prefer-modern-api, no-cross-domain-imports, enforce-dependency-direction, enforce-team-boundaries), `import x = require()` (the same rules, plus no-internal-modules and no-full-package-import), and `require()` / `import()` where a rule skipped them (no-restricted-paths, no-cross-domain-imports, enforce-dependency-direction, no-full-package-import).
- Type-only imports load nothing: no-nodejs-modules, no-full-package-import and prefer-tree-shakeable-imports no longer report `import type`.
- Node's own builtin list replaces short hand-written lists: prefer-node-protocol (no longer reports `FS`, `events/foo` or `punycode/`, which are not builtins), max-dependencies (no longer counts `fs/promises`, `worker_threads`, `#` imports or absolute paths as packages), enforce-import-order (`crypto`, `zlib`, `fs/promises` are builtins), require-import-approval (builtins, `#` imports and `@/` / `~/` aliases are not packages).
- no-cross-domain-imports, enforce-dependency-direction and enforce-team-boundaries resolve a relative import against the importing file: `../billing/service` from `src/domains/user/` is another domain whatever it is named, and `../../auth/x` from `src/platform/` is the auth team's code. enforce-dependency-direction's `allowSameLayer: false` now works.
- no-relative-parent-imports normalises the path (`./../x` climbs out, `./a/../b` does not); no-restricted-paths matches whole path segments (`server` no longer matches `./observer`); no-internal-modules counts `./utils/` as `./utils`; prefer-modern-api matches a deprecated subpath exactly; enforce-import-order puts `..`, `./` and `./index.js` in the right groups, honours a `type` group and `caseInsensitive: false`.
