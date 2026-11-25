---
'eslint-plugin-import-next': minor
---

feat(import-next): register `imports-first`, eslint-plugin-import's deprecated alias of `first`

eslint-plugin-import 2.32.0 still exports `imports-first`, deprecated, as `first` with a deprecated `meta`. A config or disable comment naming it (mozilla/web-ext's does) threw "Could not find rule" against this plugin. It is now registered the same way: `meta.deprecated: true`, `replacedBy: ['first']`, and `first`'s own `create` and schema, so it reports what `first` reports and takes the same options. No preset enables it.
