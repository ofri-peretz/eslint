---
'eslint-plugin-react-features': patch
---

fix(react-features): accept eslint-plugin-react's option shapes for six rules airbnb configures

`jsx-no-bind`, `prefer-es6-class`, `default-props-match-prop-types`, `state-in-constructor`, `static-property-placement` and `sort-comp` rejected the options `eslint-config-airbnb` 19.0.4 passes, so ESLint refused to load that config. Each schema now accepts every shape eslint-plugin-react 7.37.5 accepts.

Honoured: `jsx-no-bind` `allowBind`, `ignoreRefs`, `ignoreDOMComponents`; `prefer-es6-class` `"never"`; `state-in-constructor` `"never"`. Accepted, not yet enforced: `jsx-no-bind` `allowArrowFunctions` and `allowFunctions`, `default-props-match-prop-types` `allowRequiredDefaults`, `static-property-placement` placement string and per-property object, `sort-comp` `groups`. The rule docs say so.
