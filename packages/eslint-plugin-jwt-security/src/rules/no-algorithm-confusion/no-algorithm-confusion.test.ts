/**
 * Tests for no-algorithm-confusion rule
 * Security: CWE-347 (Algorithm Confusion Attack)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noAlgorithmConfusion } from './index';

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

describe('no-algorithm-confusion', () => {
  describe('Valid Code - Safe Patterns', () => {
    ruleTester.run(
      'valid - asymmetric algorithms with public keys',
      noAlgorithmConfusion,
      {
        valid: [
          // RS256 with public key - SAFE
          {
            name: 'the asymmetric algorithm the key actually belongs to',
            code: `import jwt from 'jsonwebtoken';
jwt.verify(token, publicKey, { algorithms: ['RS256'] });`,
          },
          // ES256 with public key - SAFE
          {
            code: `import jwt from 'jsonwebtoken';
jwt.verify(token, publicKey, { algorithms: ['ES256'] });`,
          },
          // Multiple asymmetric algorithms
          {
            code: `import jwt from 'jsonwebtoken';
jwt.verify(token, publicKey, { algorithms: ['RS256', 'ES256'] });`,
          },
          // HS256 with secret (not public key) - SAFE
          {
            code: `import jwt from 'jsonwebtoken';
jwt.verify(token, secret, { algorithms: ['HS256'] });`,
          },
          // HS256 with env var - SAFE
          {
            code: `import jwt from 'jsonwebtoken';
jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });`,
          },
          // No options specified
          {
            code: `import jwt from 'jsonwebtoken';
jwt.verify(token, publicKey);`,
          },
          // Sign operation (not verify)
          {
            code: `import jwt from 'jsonwebtoken';
jwt.sign(payload, privateKey, { algorithm: 'HS256' });`,
          },
          // Only 1 argument (edge case - line 157 coverage)
          {
            code: `import jwt from 'jsonwebtoken';
jwt.verify(token);`,
          },
          // No key that looks like public key
          {
            code: `import jwt from 'jsonwebtoken';
jwt.verify(token, sharedSecret, { algorithms: ['HS256'] });`,
          },
          // Empty options object with public key (no algorithms)
          {
            code: `import jwt from 'jsonwebtoken';
jwt.verify(token, publicKey, {});`,
          },
          // Options without algorithms property
          {
            code: `import jwt from 'jsonwebtoken';
jwt.verify(token, publicKey, { complete: true });`,
          },
        ],
        invalid: [],
      },
    );
  });

  describe('Invalid Code - Algorithm Confusion', () => {
    ruleTester.run(
      'invalid - symmetric with public key',
      noAlgorithmConfusion,
      {
        valid: [],
        invalid: [
          // HS256 with publicKey variable
          {
            name: 'verifying with HS256 against a key that is public',
            code: `import jwt from 'jsonwebtoken';
jwt.verify(token, publicKey, { algorithms: ['HS256'] });`,
            errors: [{ messageId: 'algorithmConfusion' }],
          },
          /*
           * One option, three spellings. The rule required an Identifier key,
           * so it saw only the first — missing the computed form a bundler
           * emits AND the quoted form that is ordinary hand-written JS. The
           * runtime-computed key stays silent: nothing shows what `x` names,
           * and that is the one case where refusing to decide is right.
           */
          /*
           * A runtime-computed key SITTING BESIDE the offending option. The
           * finding comes from `algorithms`; the location loop walks properties
           * in order and stops at the first match, so the runtime key has to sit
           * FIRST to be reached at all. It must be skipped rather than throw or
           * mis-locate the report onto a property that names nothing.
           */
          {
            name: 'a sibling key chosen at runtime does not disturb the report',
            code: `import jwt from 'jsonwebtoken';
jwt.verify(token, publicKey, { [extra]: 1, algorithms: ['HS256'] });`,
            errors: [{ messageId: 'algorithmConfusion' as const }],
          },
          ...[
            { label: 'a quoted key', key: "'algorithms'" },
            { label: 'a computed key', key: "['algorithms']" },
          ].map(({ label, key }) => ({
            name: `algorithm confusion behind ${label}`,
            code: `import jwt from 'jsonwebtoken';
jwt.verify(token, publicKey, { ${key}: ['HS256'] });`,
            errors: [{ messageId: 'algorithmConfusion' as const }],
          })),
          // HS384 with public key
          {
            code: `import jwt from 'jsonwebtoken';
jwt.verify(token, publicKey, { algorithms: ['HS384'] });`,
            errors: [{ messageId: 'algorithmConfusion' }],
          },
          // HS512 with public key
          {
            code: `import jwt from 'jsonwebtoken';
jwt.verify(token, publicKey, { algorithms: ['HS512'] });`,
            errors: [{ messageId: 'algorithmConfusion' }],
          },
          // Single algorithm option
          {
            code: `import jwt from 'jsonwebtoken';
jwt.verify(token, publicKey, { algorithm: 'HS256' });`,
            errors: [{ messageId: 'algorithmConfusion' }],
          },
          // Mixed algorithms with symmetric
          {
            code: `import jwt from 'jsonwebtoken';
jwt.verify(token, publicKey, { algorithms: ['RS256', 'HS256'] });`,
            errors: [{ messageId: 'algorithmConfusion' }],
          },
          // getPublicKey() function
          {
            code: `import jwt from 'jsonwebtoken';
jwt.verify(token, getPublicKey(), { algorithms: ['HS256'] });`,
            errors: [{ messageId: 'algorithmConfusion' }],
          },
          // JWKS pattern
          {
            code: `import jwt from 'jsonwebtoken';
jwt.verify(token, jwksKey, { algorithms: ['HS256'] });`,
            errors: [{ messageId: 'algorithmConfusion' }],
          },
          // alg shorthand with public key
          {
            code: `import jwt from 'jsonwebtoken';
jwt.verify(token, publicKey, { alg: 'HS256' });`,
            errors: [{ messageId: 'algorithmConfusion' }],
          },
          // jwtVerify with public key
          {
            code: `import jwt from 'jsonwebtoken';
jwtVerify(token, publicKey, { algorithms: ['HS256'] });`,
            errors: [{ messageId: 'algorithmConfusion' }],
          },
        ],
      },
    );
  });
});
