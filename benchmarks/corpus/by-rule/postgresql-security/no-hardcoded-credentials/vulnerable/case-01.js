// postgresql-security/no-hardcoded-credentials — true positive
// @origin       rule-tests
// @generated    scripts/generate-corpus-fixtures.ts
// @caution      Derived from this rule's OWN RuleTester cases, so it cannot
//               measure this rule's precision — it passes by construction.
//               Its value is cross-rule: no OTHER rule may fire on it.
// This MUST be flagged by pg/no-hardcoded-credentials
import { Client } from 'pg';
new Client({ host: 'localhost', password: 'secret123' })
