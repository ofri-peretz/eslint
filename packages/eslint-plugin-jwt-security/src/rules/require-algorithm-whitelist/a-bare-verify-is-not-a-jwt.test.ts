/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * `verify(a, b)` is not JWT verification.
 *
 * Hand-verification run 2026-08-22, published tarballs against repos cloned at
 * HEAD. Three findings, three repos with no JWT in them:
 *
 *   - LavaMoat `packages/harden/src/pnpm/opinions.js:69`
 *   - LavaMoat `packages/harden/src/tools/apply-change.js:106`
 *   - shardeum/json-rpc-server `src/middlewares/debugMiddleware.ts:66` —
 *     a Shardus ed25519 signature check, declared in the same file:
 *     `function verify(obj: crypto.SignedObject, expectedPk?: string)`
 *
 * Each was reported as `Missing Algorithm Whitelist`, CWE-757, HIGH.
 *
 * Two gates hold this shut, and the second is the one this file exists for.
 * `fileImportsJwtLibrary` covers a file with no JWT anywhere — but it is
 * exactly one unrelated import away from failing, and the callee's own binding
 * is the evidence that survives that import. Every case below therefore ALSO
 * imports `jsonwebtoken`, so the file gate cannot be what makes it pass.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import parser from '@typescript-eslint/parser';
import { requireAlgorithmWhitelist } from './index';

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

ruleTester.run(
  'require-algorithm-whitelist — a bare verify is not a JWT',
  requireAlgorithmWhitelist,
  {
    valid: [
      // The file gate on its own: no JWT library is loaded at all.
      `import { verify } from './signature.js';\nexport const check = (a, b) => verify(a, b);`,
      `function verify(a, b) { return ed25519.check(a, b); }\nexport const check = (a, b) => verify(a, b);`,

      // …and the same shapes with a JWT library present, which is what the
      // callee-binding gate is for.
      `import jwt from 'jsonwebtoken';\nimport { verify } from './signature.js';\nexport const check = (a, b) => verify(a, b);`,
      `import jwt from 'jsonwebtoken';\nimport * as crypto from '@shardeum-foundation/lib-crypto-utils';\nfunction verify(obj, expectedPk) { return crypto.verifyObj(obj, expectedPk); }\nexport const guard = (o, pk) => verify(o, pk);`,
      `import jwt from 'jsonwebtoken';\nexport function verify(obj, pk) { return ed25519.check(obj, pk); }\nexport const guard = (o, pk) => verify(o, pk);`,
      `import jwt from 'jsonwebtoken';\nconst verify = (obj, pk) => ed25519.check(obj, pk);\nexport const guard = (o, pk) => verify(o, pk);`,
      `import jwt from 'jsonwebtoken';\nconst { verify } = require('@shardeum-foundation/lib-crypto-utils');\nexport const guard = (o, pk) => verify(o, pk);`,
    ],
    invalid: [
      // The positive control. Without one of these the file above proves only
      // that the rule is quiet, which it would also be if it were broken.
      {
        code: `import { verify } from 'jsonwebtoken';\nexport const check = (t, k) => verify(t, k);`,
        errors: [{ messageId: 'missingAlgorithmWhitelist' }],
      },
      {
        code: `import jwt from 'jsonwebtoken';\nexport const check = (t, k) => jwt.verify(t, k);`,
        errors: [{ messageId: 'missingAlgorithmWhitelist' }],
      },
      // A bare callee that resolves to NOTHING is still a JWT call: a client is
      // very often injected rather than imported, and demanding a resolvable
      // binding would trade this FP class for an FN one.
      {
        code: `import 'jsonwebtoken';\nexport const check = (t, k) => verify(t, k);`,
        errors: [{ messageId: 'missingAlgorithmWhitelist' }],
      },
      // A require of a JWT package binds the library's `verify`, not a local one.
      {
        code: `const jwt = require('jsonwebtoken');\nconst { verify } = require('jsonwebtoken');\nexport const check = (t, k) => verify(t, k);`,
        errors: [{ messageId: 'missingAlgorithmWhitelist' }],
      },
    ],
  },
);
