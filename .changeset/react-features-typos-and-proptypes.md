---
'eslint-plugin-react-features': patch
---

fix: misspelled members and PropTypes validators read through a string subscript

`no-typos` checked class properties, methods and member reads on the dotted
spelling only, so `class A { ["defaulProps"] = 1 }` and
`Component['defaulProps']` carried the same misspelling unreported.
`default-props-match-prop-types` resolved `PropTypes['number']` as no
validator at all, which silently disabled the whole comparison for that prop.
