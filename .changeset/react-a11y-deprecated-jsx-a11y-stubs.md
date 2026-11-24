---
'eslint-plugin-react-a11y': minor
---

feat(react-a11y): register eslint-plugin-jsx-a11y's deprecated `accessible-emoji`, `label-has-for` and `no-onchange` as no-ops

A config or disable comment naming one of these three rules, which eslint-plugin-jsx-a11y 6.10.2 still exports as deprecated, no longer throws "Could not find rule". Each is `meta.deprecated: true` and reports nothing; `label-has-for` is `replacedBy: ['label-has-associated-control']`. Upstream's option schemas are accepted. No preset enables them, and `configs.strict` skips deprecated rules.
