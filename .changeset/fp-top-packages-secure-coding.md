---
'eslint-plugin-secure-coding': patch
---

Fix three false positives found linting popular Express/NestJS packages.

- `no-unlimited-resource-allocation`: a zlib decompression stream that is handed, directly or through a local factory, to a consumer that also receives a `limit` / `maxSize` option is bounded where it is read and no longer reported. A stream with no limited consumer still reports.
- `no-xxe-injection`: `@microsoft/tsdoc` is added to `entityIncapableModules`; `TSDocParser#parseString` parses comment text, not XML. Parsers of unknown origin with the same method name still report.
- `no-hardcoded-credentials`: a dependency-injection token name written as `SCREAMING_SNAKE(word)` (`'BULLMQ_CONFIG(default)'`) in a `*_TOKEN` slot is not a secret. Random values in the same slot still report.
