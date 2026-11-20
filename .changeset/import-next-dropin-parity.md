---
'eslint-plugin-import-next': patch
'@interlace/eslint-devkit': patch
---

fix: match eslint-plugin-import where five rules were louder on real repos (apollo-server, lynx-stack)

- `extensions`: `./x.js` that resolves to `x.ts` (and `.jsx`/`.tsx`, `.d.ts`) is judged by the extension as written, as upstream does. Was 95 false "Missing file extension" findings on apollo-server.
- `consistent-type-specifier-style`: with no options the rule is `prefer-top-level`, upstream's behaviour (its schema says `prefer-inline`, its code does not). Was 1,619 findings on lynx-stack from a bare `'warn'`. Pass `'prefer-inline'` to keep the old default.
- `no-unresolved`: `./App.jsx` to `App.tsx`, `./x.js` to `x.d.ts`, and `@/x.js` through tsconfig `paths` now resolve.
- `no-commonjs`: no longer reports `__dirname` and `__filename`, which upstream does not.
- `no-cycle` (via `@interlace/eslint-devkit`): the import scanner no longer merges two statements in a file written without semicolons, which made an `import type` look like a runtime edge and could drop an edge.
- `order`: an import that resolves through the configured resolvers (a tsconfig `paths` alias such as `@/App.js`) is ranked by where it resolves, as upstream does, so it no longer produces order findings upstream does not.
