---
'eslint-plugin-secure-coding': patch
---

fix: detect-non-literal-regexp accepts an escaped value inside a written pattern

nestjs/config builds ``new RegExp(`\$\{${name}`)`` from a `name` escaped with the canonical `.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')`. The escape was only recognised when it was the whole pattern. A template or `+` whose every dynamic part is static or escaped is now neutralised; one raw part still reports.
