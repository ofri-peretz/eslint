# imports-first

❌ This rule is deprecated. It was replaced by [`first`](first.md).

<!-- end auto-generated rule header -->

Deprecated alias of `first`: replaced by `import-next/first`

`imports-first` is the old name of [`first`](first.md). eslint-plugin-import 2.32.0 still exports it, deprecated, as `first` with a deprecated `meta`; this plugin does the same. It reports what `first` reports, for the same options. Use `first` in new configs.

## Rule Details

| Aspect         | Details                                                               |
| :------------- | :-------------------------------------------------------------------- |
| **Status**     | Deprecated (`meta.deprecated: true`), replaced by [`first`](first.md) |
| **Reports**    | Exactly what `first` reports, with the same options                   |
| **In presets** | No preset enables it                                                  |
| **Options**    | The same as `first`: `"absolute-first"` or `"disable-absolute-first"` |

## Why it exists

A config that registers this plugin under the `import` key and names `import/imports-first`, or a `// eslint-disable-next-line import/imports-first` comment, would otherwise stop ESLint with "Could not find rule". With this entry it loads and behaves as `first`.

## Configuration

```javascript
// eslint.config.js
import importNext from 'eslint-plugin-import-next';

export default [
  {
    plugins: { import: importNext },
    rules: { 'import/imports-first': 'error' },
  },
];
```

Prefer the replacement:

```javascript
rules: { "import/first": "error" }
```

## Further Reading

- [`first`](first.md)
- [eslint-plugin-import imports-first](https://github.com/import-js/eslint-plugin-import/blob/v2.32.0/src/rules/imports-first.js)
