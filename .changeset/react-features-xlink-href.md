---
'eslint-plugin-react-features': patch
---

fix: `no-unknown-property` reports `xlink:href` and the other namespaced `xlink:*` / `xml:*` attributes React rejects, and suggests the camelCase form (`xlinkHref`), as eslint-plugin-react 7.37.5 does. Behaviour change: this code was previously accepted. README and rule docs now state the two intentional differences from eslint-plugin-react 7.37.5 (`display-name` on a named `memo`/`forwardRef` binding, `no-deprecated` on `findDOMNode`) and the current parity figure, 1,828 of 2,181 (83.8%).
