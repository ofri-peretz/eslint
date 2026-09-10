---
'eslint-plugin-import-next': patch
---

fix: `no-internal-modules` keeps parent traversal, and no longer crashes on a template-literal `require`

The autofix collapsed every relative specifier to `'.'`, so `../content/docs/x` was
repointed at the current file's own directory index — a different module — with no report
left behind to show it. The traversal prefix is now preserved (`../..` for `../../a/b`);
`./a/b/c` still resolves to `'.'` as before.

The detector accepts a no-substitution template literal via `staticString`, but all three
fixers narrowed on `Literal` and otherwise reached for `.source`, which is `undefined` on a
template literal. `fixer.replaceText` then threw and aborted the lint for the entire file —
at report time, so `--fix` was not even required.
