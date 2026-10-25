# oxlint-plugin-security

> An independent package, not affiliated with eslint-community, eslint-plugin-security or oxc.

A drop-in replacement for [`eslint-plugin-security`](https://www.npmjs.com/package/eslint-plugin-security)@4.2.0 on [oxlint](https://oxc.rs/docs/guide/usage/linter/js-plugins) and [Vite+](https://viteplus.dev/guide/lint). It answers to the same `security/<rule>` IDs, so your existing rule configuration keeps working, and each ID is backed by an [Interlace](https://eslint.interlace.tools) security rule.

## Install

```bash
npm install oxlint-plugin-security --save-dev
```

Swap the plugin name and keep everything else:

```json
{
  "jsPlugins": ["oxlint-plugin-security"],
  "rules": {
    "security/detect-object-injection": "warn",
    "security/detect-non-literal-fs-filename": "warn"
  }
}
```

In Vite+, the same goes in `vite.config.ts` under `lint.jsPlugins` and `lint.rules`. On ESLint, `security.configs.recommended` mirrors the incumbent's preset (all 15 rules at `warn`). The pinned options below need ESLint 9.15 or later, because they travel as `meta.defaultOptions`.

## Don't load both plugins

Both packages call themselves `security`, and oxlint silently keeps only one of them. To run the two side by side while you compare, give the incumbent another name:

```json
{
  "jsPlugins": [
    "oxlint-plugin-security",
    { "name": "security-legacy", "specifier": "eslint-plugin-security" }
  ]
}
```

## Rule mapping

| Incumbent ID                              | Backed by                                                                                                   | Pinned options                      |
| :---------------------------------------- | :---------------------------------------------------------------------------------------------------------- | :---------------------------------- |
| `security/detect-bidi-characters`         | [`secure-coding/no-bidi-characters`](https://www.npmjs.com/package/eslint-plugin-secure-coding)             |                                     |
| `security/detect-buffer-noassert`         | [`node-security/no-buffer-overread`](https://www.npmjs.com/package/eslint-plugin-node-security)             |                                     |
| `security/detect-child-process`           | [`node-security/detect-child-process`](https://www.npmjs.com/package/eslint-plugin-node-security)           |                                     |
| `security/detect-disable-mustache-escape` | [`secure-coding/no-disabled-template-escaping`](https://www.npmjs.com/package/eslint-plugin-secure-coding)  |                                     |
| `security/detect-eval-with-expression`    | [`node-security/detect-eval-with-expression`](https://www.npmjs.com/package/eslint-plugin-node-security)    |                                     |
| `security/detect-invisible-characters`    | [`secure-coding/no-invisible-characters`](https://www.npmjs.com/package/eslint-plugin-secure-coding)        |                                     |
| `security/detect-new-buffer`              | [`node-security/no-deprecated-buffer`](https://www.npmjs.com/package/eslint-plugin-node-security)           |                                     |
| `security/detect-non-literal-fs-filename` | [`node-security/detect-non-literal-fs-filename`](https://www.npmjs.com/package/eslint-plugin-node-security) | `{"reportWholeProcessValues":true}` |
| `security/detect-non-literal-regexp`      | [`secure-coding/detect-non-literal-regexp`](https://www.npmjs.com/package/eslint-plugin-secure-coding)      |                                     |
| `security/detect-non-literal-require`     | [`node-security/no-dynamic-require`](https://www.npmjs.com/package/eslint-plugin-node-security)             |                                     |
| `security/detect-object-injection`        | [`secure-coding/detect-object-injection`](https://www.npmjs.com/package/eslint-plugin-secure-coding)        |                                     |
| `security/detect-possible-timing-attacks` | [`node-security/no-timing-unsafe-compare`](https://www.npmjs.com/package/eslint-plugin-node-security)       | `{"reportLiteralComparands":true}`  |
| `security/detect-unsafe-regex`            | [`secure-coding/no-redos-vulnerable-regex`](https://www.npmjs.com/package/eslint-plugin-secure-coding)      |                                     |

## Stricter than the incumbent

These are cases the incumbent's own tests call safe, which we report on purpose:

- **`security/detect-child-process`** (11 cases): `spawn(cmd)` / `child.spawn(cmd)` with a command that cannot be resolved to a literal. The incumbent treats spawn without `shell: true` as safe; a non-literal EXECUTABLE is still CWE-78, because whoever chooses the string chooses the program that runs.
- **`security/detect-new-buffer`** (1 case): `new Buffer('test')`: the Buffer constructor is deprecated (DEP0005) for every argument, not only for numbers, so the call is reported whatever it is given.

## Retired IDs

These IDs still load, as deprecated no-ops, so an existing config never breaks:

- **`security/detect-no-csrf-before-method-override`**: Matches only express.csrf() and express.methodOverride(), the Express 3 built-ins. On Express 4.22.3 reading express.csrf throws ("Most middleware (like csrf) is no longer bundled"); on 5.3.0 both are undefined. The defect cannot be written against a supported Express.
- **`security/detect-pseudoRandomBytes`**: crypto.pseudoRandomBytes === crypto.randomBytes on every supported Node (measured true on 24 versions from 18.16.1 to 26.10.0, 2026-10-25): the API is the CSPRNG, so the defect cannot occur.

## Parity

Measured 2026-10-25 against eslint-plugin-security@4.2.0's own 219 test cases: **104/104** live invalid cases detected, 12/112 valid cases reported (12 declared below), ESLint and oxlint agree on every case. Gate: **green**.

## License

MIT © [Ofri Peretz](https://github.com/ofri-peretz). Test cases used for parity measurement come from eslint-plugin-security (Apache-2.0).
