# `@interlace/eslint-config` — repo-internal, not published

> **This is not a package you install.** It is `private: true`, it is not
> published to npm, and it is not recommended to consumers. It exists only so
> this monorepo can lint itself with a shared `componentApi` preset and so the
> flagship-rule list has a structural lock.

## If you are looking for how to use the Interlace eslint-plugins

There is no meta-config package. **ESLint config is composed per repository from
the individual plugins**, taking only the ones that repo actually needs — a
project with no Postgres has no reason to pull in `eslint-plugin-pg`.

```js
// eslint.config.mjs
import secureCoding from 'eslint-plugin-secure-coding';
import jwt from 'eslint-plugin-jwt';

export default [
  ...secureCoding.configs.recommended,
  ...jwt.configs.recommended,
];
```

Each plugin publishes unscoped (`eslint-plugin-jwt`, not
`@interlace/eslint-plugin-jwt`) and ships its own `recommended` preset. See the
[root README](https://github.com/ofri-peretz/eslint#-available-packages) for the
full list, and [`.agent/flagship-rules.md`][flagship-spec] for the flagship-only
CI-gate compose.

## What this package is used for internally

- `eslint.config.mjs` at the repo root imports its `componentApi` preset.
- `.github/workflows/component-api-lint.yml` builds it to lint the design-system
  component API.
- [`src/index.test.ts`](./src/index.test.ts) pins the flagship array against the
  10-rule list in [`.agent/flagship-rules.md`][flagship-spec] — a change to
  either side fails CI.

## License

[MIT](./LICENSE) © Ofri Peretz.

[flagship-spec]: https://github.com/ofri-peretz/eslint/blob/main/.agent/flagship-rules.md
