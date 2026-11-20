---
'eslint-plugin-import-next': patch
'oxlint-plugin-import-next': patch
---

fix(import-next): two false-positive classes on real configs, and one-line messages for `no-duplicates` and `no-extraneous-dependencies`

Measured on a lint-clean svelte + docusaurus monorepo where eslint-plugin-import 2.32.0 reports nothing, import-next reported 129 findings. It now reports none.

- `no-duplicates` keys a module by the file that runs: a package's `exports` are matched without the `types` condition. `svelte` and `svelte/store` share one `types` file, so `import { onMount } from 'svelte'` beside `import { get } from 'svelte/store'` was reported as a duplicate. Two imports of the same subpath are still reported.
- `no-extraneous-dependencies` checks a specifier only once it resolves, as eslint-plugin-import does. Docusaurus' `@theme/*`, `@docusaurus/*` and `@site/*` virtual modules resolve to nothing on disk and were reported as missing packages. Under a resolver this plugin does not model (webpack, a custom one), a specifier none of the modelled resolvers finds is still checked, since that resolver may map it. An undeclared package that is not installed is left to `no-unresolved`.
- `eslint-import-resolver-custom-alias` settings are honoured: its `alias` prefixes are rewritten to their folders (relative to the working directory, or to the `packages` folder the file is in) and resolved with its `extensions`, as that resolver does. It was resolved as if it were the node resolver.
- The messages are one line, as eslint-plugin-import's are. `no-duplicates`: `'./m' imported multiple times (src/m.ts).`, naming the module and the file it resolves to. `no-extraneous-dependencies`: `'zod' should be listed in the dependencies of packages/app/package.json. Run 'npm i -S zod' to add it.`, naming the package and the `package.json` it belongs in. They were two lines, with an emoji and a severity word, and named neither.

Graded by eslint-plugin-import 2.32.0's own test suite, import-next still passes 2,035 of 2,135 cases.
