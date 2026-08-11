---
'eslint-plugin-maintainability': patch
'eslint-plugin-react-features': patch
'eslint-plugin-react-a11y': patch
'eslint-plugin-import-next': patch
---

Bound the TypeScript peer range and declare the React peer

`maintainability`, `react-features` and `import-next` shipped
`"typescript": ">=4.8.4"`, which claims support for every future major —
including ones the repo has already pinned Dependabot away from. The range is
now the majors actually tested: `^4.8.4 || ^5.0.0 || ^6.0.0`.

`react-a11y` and `react-features` lint `JSXElement`, `JSXAttribute` and
`JSXOpeningElement` and named no React peer, so nothing recorded which React
majors their rules were written against. Both now declare
`react: ^17 || ^18 || ^19`, optional, so no adopter is forced to install it.
