# no-unresolved

💼 This rule is enabled in the following configs: `recommended`, `typescript`.
💡 This rule is manually fixable by editor suggestions.

<!-- end auto-generated rule header -->

Ensures imports point to resolvable modules

## Rule Details

Reports a static module specifier that resolves to no file. Resolution
follows Node and TypeScript: relative paths with or without an extension,
index files, the NodeNext `.js` spelling of a `.ts` file, `node_modules`
packages (scoped too), a package's `exports` map (a subpath it does not export
does not resolve), the package.json `imports` map (`#util`) and tsconfig
`paths` aliases.

Not reported:

- Node builtins (`fs`, `fs/promises`, `node:fs`);
- a specifier with a URL scheme (`virtual:routes`, `bun:test`,
  `https://...`): a module a bundler or runtime provides, which a file
  resolver cannot judge;
- a computed specifier (`import(name)`, `require(path)`);
- a specifier listed in `ignore` (exactly, or as a path prefix; `*` matches
  any run of characters; an entry written as a regular expression, such as
  `'\\.svg$'` or `'^@/'`, is matched as one);
- a name in the `import/core-modules` setting (`electron`);
- anything, when `allowUnresolved` is `true`.

`extensions` replaces the file extensions tried for an extensionless relative
specifier (default `.ts`, `.tsx`, `.js`, `.jsx`, `.d.ts`, `.json`).

Every spelling is checked: `import`, `import type`, side-effect imports,
`export { a } from`, `export * from`, `import('x')`, `require('x')` and TS
`import x = require('x')`.

```ts
// ❌ Incorrect
import { dep } from './missing';
import feature from 'pkg/not-exported-subpath';

// ✅ Correct
import { dep } from './dep'; // dep.ts
import { readFile } from 'node:fs/promises';
import routes from 'virtual:routes';
```

## Options

```json
[
  {
    "type": "object",
    "properties": {
      "extensions": {
        "type": "array",
        "items": {
          "type": "string"
        },
        "description": "File extensions to consider when resolving imports."
      },
      "ignore": {
        "type": "array",
        "items": {
          "type": "string"
        },
        "description": "Modules/patterns to ignore during resolution: exact or path prefix, `*` as a wildcard, or a regular expression."
      },
      "allowUnresolved": {
        "type": "boolean",
        "default": false,
        "description": "Allow unresolved imports in certain contexts."
      },
      "commonjs": {
        "type": "boolean",
        "description": "eslint-plugin-import: check `require()` calls (absent: checked)."
      },
      "amd": {
        "type": "boolean",
        "description": "eslint-plugin-import: check AMD `require([...])`/`define([...])` dependencies."
      },
      "esmodule": {
        "type": "boolean",
        "description": "eslint-plugin-import: check `import`/`export ... from`/`import()` (absent: checked)."
      },
      "caseSensitive": {
        "type": "boolean",
        "description": "Report a specifier whose casing differs from the file on disk, below the working directory."
      },
      "caseSensitiveStrict": {
        "type": "boolean",
        "description": "Like `caseSensitive`, for the whole path, above the working directory too."
      }
    },
    "additionalProperties": false
  }
]
```

### eslint-plugin-import options

A config carried over from `import/no-unresolved` loads, and its options mean
what they meant there:

| Option                | Meaning                                                                                                   |
| --------------------- | --------------------------------------------------------------------------------------------------------- |
| `commonjs`            | `false` skips `require()` and TS `import x = require()`. Absent or `true`: checked.                       |
| `esmodule`            | `false` skips `import`, `export … from` and `import()`. Absent or `true`: checked.                        |
| `amd`                 | `true` checks the dependency array of `require([…], fn)` and `define([…], fn)` (not `require`/`exports`). |
| `caseSensitive`       | `true` reports a specifier whose casing differs from the file on disk, below the working directory.       |
| `caseSensitiveStrict` | `true` checks the casing of the whole path, above the working directory too.                              |

Two defaults differ from eslint-plugin-import, which this rule keeps when the
option is absent: `require()` is checked (upstream needs `commonjs: true`),
and casing is not (upstream's `caseSensitive` defaults to `true`). Set the
option to get upstream's behaviour.

## Implementation

- [Source Code](https://github.com/import-js/eslint-plugin-import-next/blob/main/src/rules/no-unresolved.ts)
- [Test Cases](https://github.com/import-js/eslint-plugin-import-next/blob/main/src/tests/no-unresolved.test.ts)

## OWASP Foundation

- **Category**: A03:2021 - Injection
