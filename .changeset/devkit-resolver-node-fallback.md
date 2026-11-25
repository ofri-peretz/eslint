---
'@interlace/eslint-devkit': minor
---

fix(eslint-devkit): resolve imports without `oxc-resolver` instead of throwing

`oxc-resolver` stays an optional peer and is used exactly as before when installed. When it cannot be loaded, `resolveModule` now falls back to a dependency-free resolver (tsconfig `baseUrl`/`paths` including `extends`, then `module.createRequire().resolve`, then a package.json `exports`/`module`/`main`/`types` read) instead of throwing `MissingResolverPeerError`. The fallback does not cover tsconfig `references`, `#imports` maps or Yarn PnP; those return `null` until `oxc-resolver` is installed. `MissingResolverPeerError` stays exported but is `@deprecated` and never thrown.
