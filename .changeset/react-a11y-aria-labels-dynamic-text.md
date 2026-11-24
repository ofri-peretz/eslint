---
'eslint-plugin-react-a11y': patch
'@interlace/eslint-devkit': patch
---

fix(react-a11y): `no-missing-aria-labels` accepts a button or link whose text is a JSX expression

`<button>{_('Open')}</button>`, `<button>{t('save')}</button>`, `<a>{label ?? 'Back'}</a>` and a template literal with
an expression are named by their children at runtime. Any expression child now counts as text, as in
eslint-plugin-jsx-a11y, except one proven to render nothing: `undefined`, `null`, `void 0`, a boolean, a blank string,
an element, or a conditional or logical expression of those. That was most of the 485 hits on readest/readest.
`role-supports-aria-props` accepts `aria-posinset`, `aria-setsize` and `aria-expanded` on role `tab` (aria-query).
