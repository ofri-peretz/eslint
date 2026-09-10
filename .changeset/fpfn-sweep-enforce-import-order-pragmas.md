---
'eslint-plugin-import-next': patch
---

fix: `enforce-import-order`'s fixer no longer moves `@ts-nocheck` below an import

TypeScript honours `@ts-nocheck`, `@ts-check` and `/// <reference />` only before the first
statement. The fixer treated them as leading comments of the first import and carried them
down with it. The result still parses and still lints clean, so nothing surfaces — type
checking is just silently switched back on, or, for `@ts-check` on a `.js` file, silently
switched off.

These directives are now pinned the same way a hashbang already was. Only the directives:
an explanatory comment written for a specific import still travels with that import.
