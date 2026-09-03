// node-security/detect-non-literal-fs-filename — true positive
// @origin       rule-tests
// @generated    scripts/generate-corpus-fixtures.ts
// @caution      Derived from this rule's OWN RuleTester cases, so it cannot
//               measure this rule's precision — it passes by construction.
//               Its value is cross-rule: no OTHER rule may fire on it.
// This MUST be flagged by node-security/detect-non-literal-fs-filename
import fs from 'fs';
        import path from 'path';
        export const key = fs.readFileSync(path.resolve(import.meta[prop], './index.html'));
