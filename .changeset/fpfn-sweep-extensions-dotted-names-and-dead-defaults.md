---
'eslint-plugin-import-next': patch
---

fix: the extensions fixer no longer renames the module it is rewriting

`extensions` ran `path.extname` over the raw specifier, so any final dot read as an extension. `./source.config` and `./schema.v2` were reported and stripped to `./source` and `./schema` — a different module, or none at all — and because the fix is `fixable: 'code'` rather than a suggestion, `--fix` applied it unattended. The strip also ran to a fixed point, so a compound name lost a segment per pass: `./types.d.ts` became `./types.d` and then `./types`, and `./a.min.js` became `./a`. Those two started with a real extension, so no "don't put dots in filenames" rule would have saved them. A token now counts as an extension only when the user's own `pattern` claims it or it is one the rule ships a default for, and a strip that would leave a second extension behind reports without a fix instead of guessing.

The same fixer built its replacement as a fresh single-quoted string, `'${value}'`, which silently reflowed every double-quoted specifier and produced unparseable output for a path containing an apostrophe. It now rewrites the raw token and keeps the original quote character.

Separately, the rule declared `defaultOptions` and then read `context.options`, which is the raw user options — `createRule` passes the merged options as `create`'s second argument. Its own defaults were therefore dead, and a hardcoded table inside `create` decided behaviour instead. The two disagreed on exactly svg, png and jpg, in the direction of a build-breaking fix: `import logo from './logo.svg'` was reported and stripped under the shipped `strict` and `typescript` configs. The same bug made a partial `pattern` replace the default table rather than merge into it, so `{ pattern: { vue: 'always' } }` quietly dropped json, css and scss down to `default`.
