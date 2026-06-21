## [0.1.0] - 2026-05-16

## 0.1.1

### Patch Changes

- [#194](https://github.com/ofri-peretz/eslint/pull/194) [`55d5c0a`](https://github.com/ofri-peretz/eslint/commit/55d5c0ab90bfaaecf01be5146a91a2e4b14e1d41) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Fix a hard crash (`Error: Unknown class name: exit`) that aborted the entire ESLint run on ESLint 9 whenever the `recommended` or `strict` config was enabled.

  Three rules — `require-timeout-handling`, `no-missing-authorization-check`, and `no-unbounded-batch-processing` — registered their function-exit listener as a single comma-joined selector key:

  ```
  'ArrowFunctionExpression:exit, FunctionExpression:exit, FunctionDeclaration:exit'
  ```

  ESLint only strips a **trailing** `:exit` before handing a selector to esquery, so the earlier `:exit` tokens survived into the parser and threw `Unknown class name: exit` for every linted file. Each listener is now registered as one key per node type, which is the only esquery-safe form.

  A config-level regression test (`src/index.test.ts`) now boots the real ESLint engine against both shipped configs, so any future comma-joined `:exit` — or any other unparseable selector in any rule — fails in CI instead of in a consumer's editor.

  `@interlace/eslint-config` re-exports the `recommended` config and is republished against the fixed plugin.

- Updated dependencies [[`90b970c`](https://github.com/ofri-peretz/eslint/commit/90b970c547f867ee79ec393ecb4da3f3e22f11f0), [`fcb6d8e`](https://github.com/ofri-peretz/eslint/commit/fcb6d8ed6c6f531fe11427508673a31fe754a2e6), [`a56da52`](https://github.com/ofri-peretz/eslint/commit/a56da525d90d233310c5329fdd006af5b3fd675c), [`736a5fe`](https://github.com/ofri-peretz/eslint/commit/736a5fed47e673f6157ea900b29fe2a54e4bc7df), [`8843ce7`](https://github.com/ofri-peretz/eslint/commit/8843ce7fbb465caad161b97032467b3a37a49319), [`ae39ec5`](https://github.com/ofri-peretz/eslint/commit/ae39ec52bf619351e6217a823014fc05bb97d618), [`38ab670`](https://github.com/ofri-peretz/eslint/commit/38ab670a0221684f4fd3d5dc3c05ddec7458ca2b), [`55d5c0a`](https://github.com/ofri-peretz/eslint/commit/55d5c0ab90bfaaecf01be5146a91a2e4b14e1d41), [`edf208d`](https://github.com/ofri-peretz/eslint/commit/edf208d67ac2357312c97d8964fcf6a462e407eb), [`82718c2`](https://github.com/ofri-peretz/eslint/commit/82718c282895710d42c36d4679fb24d47f1c35c7), [`62e67a1`](https://github.com/ofri-peretz/eslint/commit/62e67a154a858b284899e17cfe39606e6bc08427), [`213cde1`](https://github.com/ofri-peretz/eslint/commit/213cde190ff2aea49ca7c1b533170940f879d9b4), [`82718c2`](https://github.com/ofri-peretz/eslint/commit/82718c282895710d42c36d4679fb24d47f1c35c7), [`5650ecd`](https://github.com/ofri-peretz/eslint/commit/5650ecde72b6157f94a2accef18f48c33e9b5605), [`82718c2`](https://github.com/ofri-peretz/eslint/commit/82718c282895710d42c36d4679fb24d47f1c35c7), [`4cbf3ed`](https://github.com/ofri-peretz/eslint/commit/4cbf3ed8aed113f6aed7cef3a2ed060601b927ce)]:
  - eslint-plugin-conventions@4.1.0
  - eslint-plugin-react-features@1.2.0
  - eslint-plugin-secure-coding@3.3.0
  - @interlace/eslint-devkit@1.4.1
  - eslint-plugin-lambda-security@1.2.4
  - eslint-plugin-node-security@4.3.0
  - eslint-plugin-vercel-ai-security@1.3.6
  - eslint-plugin-express-security@1.3.0
  - eslint-plugin-browser-security@1.2.4
  - eslint-plugin-import-next@2.3.7
  - eslint-plugin-reliability@3.1.4
  - eslint-plugin-jwt@2.2.4
  - eslint-plugin-mongodb-security@8.2.4
  - eslint-plugin-nestjs-security@1.2.4
  - eslint-plugin-pg@1.4.4
  - eslint-plugin-react-a11y@2.1.6
  - eslint-plugin-modernization@2.1.0
  - eslint-plugin-modularity@2.1.0

### Features

- Initial release. One-extends meta-config for the Interlace ESLint ecosystem.
- `flagship` preset — composes the 9 flagship-hosting plugins (10 rules total) from `.agent/flagship-rules.md`.
- `security` preset — composes the 11 security plugins (`secure-coding`, `node-security`, `browser-security`, `jwt`, `pg`, `mongodb-security`, `express-security`, `lambda-security`, `nestjs-security`, `vercel-ai-security`).
- `quality` preset — composes the 7 code-quality plugins (`import-next`, `conventions`, `maintainability`, `reliability`, `operability`, `modularity`, `modernization`).
- `react` preset — composes the 2 React plugins (`react-features`, `react-a11y`).
- `recommended` preset — full default; security + quality + react.

Replaces the manual 11-plugin compose previously documented in `.agent/flagship-rules.md`.
