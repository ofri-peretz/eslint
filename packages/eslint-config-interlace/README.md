# `@interlace/eslint-config`

> One-extends meta-config for the [Interlace ESLint ecosystem][monorepo].
> Replaces the manual 11-plugin compose previously documented in
> [`.agent/flagship-rules.md`][flagship-spec].

ESLint 8 / 9 / 10 — **flat-config only**. If you're still on
`.eslintrc.js`, see [ESLint's flat-config migration guide][migrate].

---

## Install

```sh
npm install --save-dev eslint @interlace/eslint-config
```

This package depends on every Interlace plugin. One install brings them all.

---

## Use

```js
// eslint.config.mjs
import interlace from '@interlace/eslint-config';

export default [
  ...interlace.recommended,
];
```

That's it. Nineteen plugins, hundreds of rules, one import.

### Presets

| Preset         | Plugins | Use when                                                                                          |
| -------------- | ------: | ------------------------------------------------------------------------------------------------- |
| `flagship`     |       9 | CI gate that should fail on the highest-signal 10 rules only. See [`flagship-rules.md`][flagship-spec]. |
| `security`     |      10 | All security plugins' recommended presets.                                                        |
| `quality`      |       7 | All code-quality plugins' recommended presets (`import-next`, `maintainability`, etc.).           |
| `react`        |       2 | `react-features` + `react-a11y` recommended.                                                      |
| `recommended`  |      19 | The full default. Equivalent to `[...security, ...quality, ...react]`.                            |

Every preset is a `readonly FlatConfig[]` — spread it into your config array.

### CI-gate (flagship only)

```js
// eslint.config.mjs
import { flagship } from '@interlace/eslint-config';

export default [
  ...flagship,
];
```

The flagship preset enables exactly the 10 rules in
[`.agent/flagship-rules.md`][flagship-spec] § "The 10", all at `error`. No
opinionated extras, no `recommended`-tier noise — drop it into a release
gate and it'll fail closed on real bugs only.

### React only on JSX/TSX

The React presets bind globally by default. To scope them:

```js
import interlace from '@interlace/eslint-config';

export default [
  ...interlace.security,
  ...interlace.quality,
  ...interlace.react.map(c => ({ ...c, files: ['**/*.{jsx,tsx}'] })),
];
```

### Overrides

Flat config is order-sensitive — later entries win. Place your overrides
after the preset spread:

```js
import interlace from '@interlace/eslint-config';

export default [
  ...interlace.recommended,
  {
    files: ['**/*.test.ts'],
    rules: {
      'secure-coding/no-hardcoded-credentials': 'off',
      'maintainability/max-lines-per-function': 'off',
    },
  },
];
```

---

## What's inside

### Security (10)

`eslint-plugin-secure-coding` · `eslint-plugin-node-security` ·
`eslint-plugin-browser-security` · `eslint-plugin-jwt` ·
`eslint-plugin-pg` · `eslint-plugin-mongodb-security` ·
`eslint-plugin-express-security` · `eslint-plugin-lambda-security` ·
`eslint-plugin-nestjs-security` · `eslint-plugin-vercel-ai-security`

Covers OWASP Web Top 10 2021, OWASP LLM Top 10 2025 (partial), and a
broad MITRE CWE map. Domain-vertical depth where the generic
`eslint-plugin-security` stops.

### Code quality (7)

`eslint-plugin-import-next` · `eslint-plugin-conventions` ·
`eslint-plugin-maintainability` · `eslint-plugin-reliability` ·
`eslint-plugin-operability` · `eslint-plugin-modularity` ·
`eslint-plugin-modernization`

### React (2)

`eslint-plugin-react-features` · `eslint-plugin-react-a11y`

---

## ESLint version support

Peer dep: `eslint@^8.0.0 || ^9.0.0 || ^10.0.0`. The ESLint 10 compat
matrix runs on every PR in the parent monorepo — see
[`.github/workflows/eslint-version-matrix.yml`][matrix].

---

## Engine portability

Every rule in every preset has an oxlint manifest entry in
[`.agent/oxlint-jsplugins-manifest.json`][oxlint-manifest] (currently
398/398 compatible). Once oxlint flat-config consumes ESLint configs
directly, this preset will work there unchanged. See
[`INTEROP_PHILOSOPHY.md`][interop].

---

## License

[MIT](./LICENSE) © Ofri Peretz.

[monorepo]: https://github.com/ofri-peretz/eslint
[flagship-spec]: https://github.com/ofri-peretz/eslint/blob/main/.agent/flagship-rules.md
[migrate]: https://eslint.org/docs/latest/use/configure/migration-guide
[matrix]: https://github.com/ofri-peretz/eslint/blob/main/.github/workflows/eslint-version-matrix.yml
[oxlint-manifest]: https://github.com/ofri-peretz/eslint/blob/main/.agent/oxlint-jsplugins-manifest.json
[interop]: https://github.com/ofri-peretz/eslint/blob/main/INTEROP_PHILOSOPHY.md
