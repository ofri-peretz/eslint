---
'eslint-plugin-react-features': minor
'oxlint-plugin-react-features': minor
---

feat(react-features): three react-app rules, upstream-shaped `configs.recommended` under the alias, Node 20.19

Three more of eslint-plugin-react's rules, with its names, option schemas and semantics, the ones `eslint-config-react-app`-style configs turn on:

- `style-prop-object` (option `allow`): a `style` prop that is a string, number or boolean, directly or through a `const` in the file, in JSX and in `React.createElement`.
- `jsx-pascal-case` (options `allowAllCaps`, `allowLeadingUnderscore`, `allowNamespace`, `ignore`): user-defined components are PascalCase. `ignore` takes names and globs (`*`, `?`, `[ab]`, `{a,b}`, extglobs) through a small matcher inside the package, which still has no runtime dependencies.
- `forbid-foreign-prop-types` (option `allowInPropTypes`): reading another component's `propTypes`.

All three are in `configs.all` and `configs.flat.all` under `react/<rule>`, and not in `recommended`, as upstream. eslint-plugin-react 7.37.5's own test cases agree: `style-prop-object` 70 of 70, `jsx-pascal-case` 85 of 85, `forbid-foreign-prop-types` 38 of 38, on the default parser and on `@typescript-eslint/parser`, and reports land on upstream's line, column and node type. Where a key can be spelled `'k'` or `` `k` `` as well as `k`, all spellings count.

When the package is installed as `eslint-plugin-react` (`"eslint-plugin-react": "npm:eslint-plugin-react-features"`), `configs.recommended` is now eslint-plugin-react's: legacy-shaped, `react/<rule>` ids, the same 22 rules as `configs.flat.recommended`. That is what `plugin:react/recommended` through `FlatCompat` and a spread of `react.configs.recommended.rules` read. Before, both got `react-features/*` ids, which fail at config load under a plugin registered as `react`. Under its own name the package is unchanged: `configs.recommended` is still the flat `react-features/` preset. The install is told by where the files sit (`node_modules/eslint-plugin-react/`). Two presets are reachable by name in either install, for a setup where the files are not under `node_modules`: `configs['react-recommended']` (upstream shape) and `configs['react-features-recommended']` (this package's own).

`engines.node` is now ESLint 10's range, `^20.19.0 || ^22.13.0 || >=24`, for both packages (ADR 0014). Nothing in the package needs Node 22.13: it imports only `node:fs`, `node:module` and `node:path`, uses no API newer than Node 20.19, and its one dependency, `@interlace/eslint-devkit`, already declares this range. The unit suite passes on Node 20.19.0 (3,381 passed, 0 failed; the oxlint half of the rule tests, which oxlint's own tester cannot run below Node 22, is skipped there), and a Node 20.19.0 cell for the package joins the nightly node-version matrix. Raising a floor needs a major and lowering one does not, so this is a minor.
