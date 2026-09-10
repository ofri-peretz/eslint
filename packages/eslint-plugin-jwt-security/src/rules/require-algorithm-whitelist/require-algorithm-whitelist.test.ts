/**
 * Tests for require-algorithm-whitelist rule
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { requireAlgorithmWhitelist } from './index';

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

describe('require-algorithm-whitelist', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - with algorithms', requireAlgorithmWhitelist, {
      valid: [
        {
          name: 'an explicit algorithms list',
          code: `import jwt from 'jsonwebtoken';
jwt.verify(token, secret, { algorithms: ['RS256'] });`,
        },
        {
          code: `import jwt from 'jsonwebtoken';
jwt.verify(token, secret, { algorithms: ['RS256', 'ES256'] });`,
        },
        {
          code: `import jwt from 'jsonwebtoken';
jwt.sign(payload, secret);`,
        }, // sign not checked
        // Only one argument - edge case
        {
          code: `import jwt from 'jsonwebtoken';
jwt.verify(token);`,
        },
        // jwtVerify with algorithms
        {
          code: `import jwt from 'jsonwebtoken';
jwtVerify(token, key, { algorithms: ['RS256'] });`,
        },
      ],
      invalid: [
        /*
         * These two were `valid` until 2026-09-10, asserting that a misspelled
         * option counted as pinning the algorithm.
         *
         * It does not. Checked against the installed packages:
         * jsonwebtoken's VerifyOptions declares `algorithms?: Algorithm[]` and
         * jose's declares `algorithms?: JWSAlgorithm[]`; neither has a singular
         * `algorithm` on the verify path — that is a SIGN option — and `alg` is
         * a header claim. Both spellings are silently ignored, so verification
         * proceeds with whatever algorithm the token itself names.
         *
         * The rule was therefore quietest exactly where an author had tried to
         * do the right thing and mistyped it.
         */
        {
          name: 'the singular `algorithm` is a sign option and pins nothing on verify',
          code: `import jwt from 'jsonwebtoken';
jwt.verify(token, secret, { algorithm: 'RS256' });`,
          errors: [{ messageId: 'missingAlgorithmWhitelist' }],
        },
        {
          name: '`alg` is a header claim, not a verify option',
          code: `import jwt from 'jsonwebtoken';
jwt.verify(token, secret, { alg: 'RS256' });`,
          errors: [{ messageId: 'missingAlgorithmWhitelist' }],
        },
      ],
    });
  });

  describe('Invalid Code', () => {
    ruleTester.run('invalid - no algorithms', requireAlgorithmWhitelist, {
      valid: [],
      invalid: [
        {
          name: 'verify with no algorithms list accepts whatever the token claims',
          code: `import jwt from 'jsonwebtoken';
jwt.verify(token, secret);`,
          errors: [{ messageId: 'missingAlgorithmWhitelist' }],
        },
        {
          code: `import jwt from 'jsonwebtoken';
jwt.verify(token, secret, {});`,
          errors: [{ messageId: 'missingAlgorithmWhitelist' }],
        },
        {
          code: `import jwt from 'jsonwebtoken';
jwt.verify(token, secret, { complete: true });`,
          errors: [{ messageId: 'missingAlgorithmWhitelist' }],
        },
        {
          code: `import jwt from 'jsonwebtoken';
jwt.verify(token, secret, { issuer: 'auth.example.com' });`,
          errors: [{ messageId: 'missingAlgorithmWhitelist' }],
        },
        {
          code: `import jwt from 'jsonwebtoken';
jwtVerify(token, key);`,
          errors: [{ messageId: 'missingAlgorithmWhitelist' }],
        },
        // verifyJWT without algorithms
        {
          code: `import jwt from 'jsonwebtoken';
verifyJWT(token, key, { issuer: 'auth.example.com' });`,
          errors: [{ messageId: 'missingAlgorithmWhitelist' }],
        },
      ],
    });
  });
});
