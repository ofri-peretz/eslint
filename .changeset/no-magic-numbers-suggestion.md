---
"eslint-plugin-conventions": patch
---

`no-magic-numbers`: add extract-const suggestion fixer. IDEs now offer a one-click "Extract to named constant" action that inserts a `const MAGIC_<value>` declaration before the containing statement and replaces the literal.
