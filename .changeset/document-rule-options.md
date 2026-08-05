---
'eslint-plugin-browser-security': patch
'eslint-plugin-express-security': patch
'eslint-plugin-lambda-security': patch
'eslint-plugin-mongodb-security': patch
'eslint-plugin-nestjs-security': patch
'eslint-plugin-node-security': patch
'eslint-plugin-secure-coding': patch
---

Document every rule option, and add `description` to the schemas that had none

282 working options across 123 rules had no row in their rule's Options table,
and 62 rule docs had no Options section at all. An option nobody can find is,
in practice, an option that does not exist — the only difference from a dead
one is that the code is there.

Schema descriptions are now the source of truth, so editors and any tooling
that reads `meta.schema` get them too, not just the docs site. 75 options that
had no description anywhere got one written from their own default value and
the rule's stated purpose.

Rule behaviour is unchanged. This is documentation plus schema `description`
metadata; no detection, option name, or default was touched.
