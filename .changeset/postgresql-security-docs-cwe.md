---
'eslint-plugin-postgresql-security': patch
'oxlint-plugin-postgresql-security': patch
---

docs(postgresql-security): nine rule docs drop a template CWE-693 for the rule's own CWE

A `**CWE:** [CWE-693]` header and front matter copied from a template
contradicted each rule's `meta.docs.cwe`. They now agree, and
`scripts/__tests__/rule-docs-agree-with-meta.lock.test.ts` keeps it that way.
