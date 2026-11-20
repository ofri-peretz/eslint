---
'eslint-plugin-react-features': minor
---

feat(react-features): four JSX scope rules, eslint-plugin-react's option shapes, and `settings.react`

Phase 1 of drop-in parity with `eslint-plugin-react`, graded by that plugin's own test cases
(7.37.5, its recommended set). Four rules are new, the option schemas that rejected an upstream
config now accept it, and the rules read the settings a shared `settings.react` block sets.

**New rules** (flat names and `react/` names, as `eslint-plugin-react` exports them):
`jsx-uses-react`, `jsx-uses-vars`, `jsx-no-undef` (option `allowGlobals`) and
`jsx-no-comment-textnodes`. The two `jsx-uses-*` rules never report: they mark a variable as used
so the core `no-unused-vars` leaves `React` and component imports alone.

**Options now accepted, with their behaviour:**

- `display-name`: `ignoreTranspilerName` (a name taken from the surrounding code does not count;
  an explicit `displayName` is required) and `checkContextObjects` (`createContext()` needs a
  `displayName`).
- `no-children-prop`: `allowFunctions`.
- `jsx-key`: `checkKeyMustBeforeSpread`, `checkFragmentShorthand` and `warnOnDuplicates`. It also
  reports an element with no `key` in an array literal, and no longer reports inside
  `Children.toArray(...)`.
- `no-string-refs`: `noTemplateLiterals`.
- `no-unescaped-entities`: `forbid` (with `alternatives` as suggestions).
- `no-unknown-property`: `ignore` and `requireDataLowercase`.

**`settings.react` is read** (`version`, including `'detect'`, `pragma`, `fragment`, `createClass`,
`defaultVersion`) and top-level `settings.linkComponents` / `formComponents`. `version: 'detect'`
resolves the installed `react` from the linted file's directory through `context.filename`, so it
works on ESLint 10, where `eslint-plugin-react`'s own detection throws (`context.getFilename` was
removed in v9); with no `react` installed it falls back to `defaultVersion`, then to the newest
version, and never throws. `no-deprecated`, `no-unsafe`, `no-render-return-value` and
`no-string-refs` now follow the configured version; `react-in-jsx-scope`, `jsx-key`, `display-name`
and `no-deprecated` follow the pragma; `jsx-no-target-blank` checks the configured link and form
components.

**Behaviour changes to know about**, all to match `eslint-plugin-react`:

- `no-string-refs` no longer reports a template literal ref (``ref={`name`}``) unless
  `noTemplateLiterals` is set, and reports `this.refs` only on `settings.react.version` below
  18.3.0. With no version configured the newest React is assumed, as in `eslint-plugin-react`, so
  `this.refs` is no longer reported by default.
- `jsx-key` now reports a keyless element in an array literal (`[<App />]`).
- `no-unescaped-entities` with `forbid` replaces the default set and reports every occurrence.
