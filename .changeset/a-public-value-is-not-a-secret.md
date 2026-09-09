---
'eslint-plugin-secure-coding': patch
---

fix: `no-insecure-comparison` stops reading two public values as secrets

- **A destructured sibling.** `const { kind } = token` binds `token.kind`, a different value from `token`. The name resolver walked the declarator's initializer whole, so every property pulled off an object named `token` inherited that object's secret-ness — an argv token's `kind`, an SGR token's `code`. The hop that belongs there is the destructuring key, which the resolver already collects, so `const { token: t } = session` still resolves through `token` and not through `session`.
- **A literal operand.** A timing attack needs the attacker to vary one side a character at a time, and a constant written in the file cannot be varied: `token === '--'` is a parser reading the option terminator. The skip already existed for `true`, `null` and `undefined`; it now covers every source literal, plus a template literal with no expressions and a negated numeric one. Comparing a secret to a hardcoded string is still a finding — a hardcoded-credential one, which this rule deliberately does not make.
