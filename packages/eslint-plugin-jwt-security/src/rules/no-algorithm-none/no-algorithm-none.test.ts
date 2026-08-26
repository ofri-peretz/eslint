/**
 * Tests for no-algorithm-none rule
 * Security: CWE-347 (CVE-2022-23540)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noAlgorithmNone } from './index';

// Configure RuleTester for Vitest
RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

describe('no-algorithm-none', () => {
  describe('Valid Code - Secure Algorithms', () => {
    ruleTester.run('valid - secure algorithms', noAlgorithmNone, {
      valid: [
        // RS256 - RSA with SHA-256
        {
          name: 'a real algorithm',
          code: `import jwt from 'jsonwebtoken';
jwt.verify(token, publicKey, { algorithms: ['RS256'] });`,
        },
        // ES256 - ECDSA with SHA-256
        {
          code: `import jwt from 'jsonwebtoken';
jwt.verify(token, publicKey, { algorithms: ['ES256'] });`,
        },
        // Multiple secure algorithms
        {
          code: `import jwt from 'jsonwebtoken';
jwt.verify(token, key, { algorithms: ['RS256', 'RS384', 'RS512'] });`,
        },
        // Single algorithm option
        {
          code: `import jwt from 'jsonwebtoken';
jwt.verify(token, secret, { algorithm: 'HS256' });`,
        },
        // jose library
        {
          code: `import jwt from 'jsonwebtoken';
jwtVerify(token, key, { algorithms: ['RS256'] });`,
        },
        // No options (doesn't trigger this rule)
        {
          code: `import jwt from 'jsonwebtoken';
jwt.verify(token, secret);`,
        },
        // Sign operation with secure algorithm
        {
          code: `import jwt from 'jsonwebtoken';
jwt.sign(payload, secret, { algorithm: 'RS256' });`,
        },
        // Spread operator in options (edge case - line 143 coverage)
        {
          code: `import jwt from 'jsonwebtoken';
jwt.verify(token, key, { ...opts, algorithms: ['RS256'] });`,
        },
        // Non-algorithm properties (line 152 coverage)
        {
          code: `import jwt from 'jsonwebtoken';
jwt.verify(token, key, { issuer: 'auth', complete: true });`,
        },
        // Options without algorithms (different property names)
        {
          code: `import jwt from 'jsonwebtoken';
jwt.sign(payload, secret, { expiresIn: '1h', subject: 'user' });`,
        },
        // Variable algorithms (not literal)
        {
          code: `import jwt from 'jsonwebtoken';
jwt.verify(token, key, { algorithms: allowedAlgorithms });`,
        },
        // Array with non-literal elements
        {
          code: `import jwt from 'jsonwebtoken';
jwt.verify(token, key, { algorithms: [defaultAlg] });`,
        },
        // Non-string literal in array
        {
          code: `import jwt from 'jsonwebtoken';
jwt.verify(token, key, { algorithms: [123] });`,
        },
        // Non-JWT function call - edge case (line 199 coverage)
        {
          code: `import jwt from 'jsonwebtoken';
console.log('hello');`,
        },
        {
          code: `import jwt from 'jsonwebtoken';
someOtherFunction(token, key, { algorithm: 'none' });`,
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Algorithm None', () => {
    ruleTester.run('invalid - algorithm none', noAlgorithmNone, {
      valid: [],
      invalid: [
        // Direct 'none' algorithm
        {
          name: "algorithm 'none' means the signature is never checked",
          code: `import jwt from 'jsonwebtoken';
jwt.verify(token, secret, { algorithm: 'none' });`,
          errors: [{ messageId: 'algorithmNone' }],
        },
        // 'none' in algorithms array (single element - gets replaced)
        {
          code: `import jwt from 'jsonwebtoken';
jwt.verify(token, secret, { algorithms: ['none'] });`,
          errors: [{ messageId: 'algorithmNoneInArray' }],
        },
        // 'none' mixed with other algorithms (no auto-fix for removal)
        {
          code: `import jwt from 'jsonwebtoken';
jwt.verify(token, secret, { algorithms: ['RS256', 'none'] });`,
          errors: [{ messageId: 'algorithmNoneInArray' }],
        },
        // Case insensitive - 'None'
        {
          code: `import jwt from 'jsonwebtoken';
jwt.verify(token, secret, { algorithm: 'None' });`,
          errors: [{ messageId: 'algorithmNone' }],
        },
        // Case insensitive - 'NONE'
        {
          code: `import jwt from 'jsonwebtoken';
jwt.verify(token, secret, { algorithms: ['NONE'] });`,
          errors: [{ messageId: 'algorithmNoneInArray' }],
        },
        // alg shorthand
        {
          code: `import jwt from 'jsonwebtoken';
jwt.verify(token, secret, { alg: 'none' });`,
          errors: [{ messageId: 'algorithmNone' }],
        },
        // Empty algorithms array
        {
          code: `import jwt from 'jsonwebtoken';
jwt.verify(token, secret, { algorithms: [] });`,
          errors: [{ messageId: 'emptyAlgorithms' }],
        },
        // Sign operation with none
        {
          code: `import jwt from 'jsonwebtoken';
jwt.sign(payload, secret, { algorithm: 'none' });`,
          errors: [{ messageId: 'algorithmNone' }],
        },
        // jose library
        {
          code: `import jwt from 'jsonwebtoken';
jwtVerify(token, key, { algorithms: ['none'] });`,
          errors: [{ messageId: 'algorithmNoneInArray' }],
        },
        // signJWT with none
        {
          code: `import jwt from 'jsonwebtoken';
signJWT(payload, key, { algorithm: 'none' });`,
          errors: [{ messageId: 'algorithmNone' }],
        },
      ],
    });
  });

  describe('Configuration Options', () => {
    ruleTester.run('config - allowInTests', noAlgorithmNone, {
      valid: [
        // Test file with allowInTests enabled
        {
          code: `import jwt from 'jsonwebtoken';
jwt.verify(token, secret, { algorithm: 'none' });`,
          options: [{ allowInTests: true }],
          filename: 'auth.test.ts',
        },
        {
          code: `import jwt from 'jsonwebtoken';
jwt.verify(token, secret, { algorithm: 'none' });`,
          options: [{ allowInTests: true }],
          filename: '__tests__/jwt.ts',
        },
      ],
      invalid: [
        // Non-test file with allowInTests
        {
          code: `import jwt from 'jsonwebtoken';
jwt.verify(token, secret, { algorithm: 'none' });`,
          options: [{ allowInTests: true }],
          filename: 'auth.ts',
          errors: [{ messageId: 'algorithmNone' }],
        },
      ],
    });
  });
});

// ---------------------------------------------------------------------------
// Module-gate regressions — CommonJS and import-equals
// ---------------------------------------------------------------------------
// The file-level gate read `ImportDeclaration` only, so EVERY CommonJS file was
// exempt from EVERY rule in this plugin: `const jwt = require('jsonwebtoken')`
// followed by `algorithm: 'none'` reported nothing at all. Both CWE-327
// fixtures in benchmarks/corpus are written that way
// (vulnerable/sign-alg-none.js, vulnerable/verify-allows-none.js) and both were
// silently missed. `require` is not a legacy edge case in Node, and
// `import x = require('y')` is TypeScript's own interop form.
ruleTester.run('no-algorithm-none — module gate', noAlgorithmNone, {
  valid: [
    // The gate must still hold: a lookalike call in a file with no JWT library.
    `const x = require('lodash');\nx.sign(payload, '', { algorithm: 'none' });`,
    `import x from 'lodash';\nx.sign(payload, '', { algorithm: 'none' });`,
    // require() bound to something that is not a call.
    `const jwt = notRequire;\njwt.sign(payload, '', { algorithm: 'none' });`,
    // `import A = B.C` is a namespace alias, not a module load.
    `import Alias = Some.Namespace;\njwt.sign(payload, '', { algorithm: 'none' });`,
    // A computed specifier names no package we can check.
    `const jwt = require(pkgName);\njwt.sign(payload, '', { algorithm: 'none' });`,
  ],
  invalid: [
    // benchmarks/corpus/CWE-327/vulnerable/sign-alg-none.js
    {
      code: `const jwt = require('jsonwebtoken');\nfunction issue(payload) {\n  return jwt.sign(payload, '', { algorithm: 'none' });\n}`,
      errors: [{ messageId: 'algorithmNone' }],
    },
    // benchmarks/corpus/CWE-327/vulnerable/verify-allows-none.js — 'none'
    // hidden inside an otherwise-reasonable allow-list.
    {
      code: `const jwt = require('jsonwebtoken');\nfunction check(token, secret) {\n  return jwt.verify(token, secret, { algorithms: ['HS256', 'none'] });\n}`,
      errors: [{ messageId: 'algorithmNoneInArray' }],
    },
    // TypeScript's interop spelling.
    {
      code: `import jwt = require('jsonwebtoken');\njwt.sign(payload, '', { algorithm: 'none' });`,
      errors: [{ messageId: 'algorithmNone' }],
    },
    // Destructured require, and a subpath specifier.
    {
      code: `const { sign } = require('jsonwebtoken');\nconst jwt = require('jsonwebtoken');\njwt.sign(payload, '', { algorithm: 'none' });`,
      errors: [{ messageId: 'algorithmNone' }],
    },
    // `require('x').default` — the call is the receiver of a member read.
    {
      code: `const jwt = require('jsonwebtoken').default;\njwt.sign(payload, '', { algorithm: 'none' });`,
      errors: [{ messageId: 'algorithmNone' }],
    },
    // A scoped package root is `@scope/name`, not `@scope`.
    {
      code: `const jwt = require('@nestjs/jwt');\njwt.sign(payload, '', { algorithm: 'none' });`,
      errors: [{ messageId: 'algorithmNone' }],
    },
    // Side-effect require establishes the file as JWT code.
    {
      code: `require('jsonwebtoken');\njwt.sign(payload, '', { algorithm: 'none' });`,
      errors: [{ messageId: 'algorithmNone' }],
    },
  ],
});
