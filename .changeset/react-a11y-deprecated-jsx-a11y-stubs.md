---
'eslint-plugin-react-a11y': minor
---

feat(react-a11y): register three deprecated jsx-a11y rules as no-ops

`accessible-emoji`, `label-has-for` and `no-onchange`, which eslint-plugin-jsx-a11y 6.10.2 still exports as deprecated, are now registered, so a config or disable comment naming one no longer throws "Could not find rule". Each is `meta.deprecated: true` and reports nothing; `label-has-for` is `replacedBy: ['label-has-associated-control']`. Upstream's option schemas are accepted. No preset enables them, and `configs.strict` skips deprecated rules.
