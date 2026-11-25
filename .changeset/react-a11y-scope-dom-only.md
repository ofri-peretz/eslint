---
'eslint-plugin-react-a11y': patch
---

fix(react-a11y): scope skips custom components, as jsx-a11y does

`scope` reported every JSX tag that was not `th`, so `<TableCell component="th" scope="row">` in a MUI app was a false positive (three of three hits on binwiederhier/ntfy). It now checks DOM elements only, as eslint-plugin-jsx-a11y 6.10.2 does (`scope.js:40-44`). A component counts only when `settings['jsx-a11y'].components` or `polymorphicPropName` / `polymorphicAllowList` map it to an element: `<Foo scope>` with `Foo: 'div'` still reports, `<TableHeader scope>` with `TableHeader: 'th'` does not.
