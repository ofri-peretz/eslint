---
'eslint-plugin-secure-coding': patch
---

fix: three false positives found by linting NestJS and ESLint

`no-unsafe-regex-construction` no longer calls flags "dynamic" when every value they can take is written out: a ternary of literals (`caseSensitive ? "u" : "iu"`) or a `const` bound to one. A variable, a concatenation or any open leaf still reports.

`no-sensitive-data-exposure` no longer treats a dependency-injection token (a class reference or `Symbol` bound once) as a credential, and no longer falls back to the receiver's name when a local object literal declares the key itself.

`no-unsafe-deserialization` no longer treats `this.deserializer.deserialize(buffer)` on a pluggable collaborator the class owns as an untrusted-payload reviver. An imported sink, or a call on a parameter, still reports.
