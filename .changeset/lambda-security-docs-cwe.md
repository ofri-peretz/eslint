---
'eslint-plugin-lambda-security': patch
'oxlint-plugin-lambda-security': patch
---

docs(lambda-security): no-secrets-in-env docs name CWE-798, not a template CWE-693

A `**CWE:** [CWE-693]` header and front matter copied from a template
contradicted each rule's `meta.docs.cwe`. They now agree, and
`scripts/__tests__/rule-docs-agree-with-meta.lock.test.ts` keeps it that way.
