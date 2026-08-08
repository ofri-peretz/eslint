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
    ruleTester.run('valid - asymmetric algorithms with public keys', noAlgorithmConfusion, {
      valid: [
        // RS256 with public key - SAFE
        { code: `jwt.verify(token, publicKey, { algorithms: ['RS256'] });` },
        // ES256 with public key - SAFE
        { code: `jwt.verify(token, publicKey, { algorithms: ['ES256'] });` },
        // Multiple asymmetric algorithms
        { code: `jwt.verify(token, publicKey, { algorithms: ['RS256', 'ES256'] });` },
        // HS256 with secret (not public key) - SAFE
        { code: `jwt.verify(token, secret, { algorithms: ['HS256'] });` },
        // HS256 with env var - SAFE
        { code: `jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });` },
        // No options specified
        { code: `jwt.verify(token, publicKey);` },
        // Sign operation (not verify)
        { code: `jwt.sign(payload, privateKey, { algorithm: 'HS256' });` },
        // Only 1 argument (edge case - line 157 coverage)
        { code: `jwt.verify(token);` },
        // No key that looks like public key
        { code: `jwt.verify(token, sharedSecret, { algorithms: ['HS256'] });` },
        // Empty options object with public key (no algorithms)
        { code: `jwt.verify(token, publicKey, {});` },
        // Options without algorithms property
        { code: `jwt.verify(token, publicKey, { complete: true });` },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Algorithm Confusion', () => {
    ruleTester.run('invalid - symmetric with public key', noAlgorithmConfusion, {
      valid: [],
      invalid: [
        // HS256 with publicKey variable
        {
          code: `jwt.verify(token, publicKey, { algorithms: ['HS256'] });`,
          errors: [{ messageId: 'algorithmConfusion' }],
        },
        // HS384 with public key
        {
          code: `jwt.verify(token, publicKey, { algorithms: ['HS384'] });`,
          errors: [{ messageId: 'algorithmConfusion' }],
        },
        // HS512 with public key
        {
          code: `jwt.verify(token, publicKey, { algorithms: ['HS512'] });`,
          errors: [{ messageId: 'algorithmConfusion' }],
        },
        // Single algorithm option
        {
          code: `jwt.verify(token, publicKey, { algorithm: 'HS256' });`,
          errors: [{ messageId: 'algorithmConfusion' }],
        },
        // Mixed algorithms with symmetric
        {
          code: `jwt.verify(token, publicKey, { algorithms: ['RS256', 'HS256'] });`,
          errors: [{ messageId: 'algorithmConfusion' }],
        },
        // getPublicKey() function
        {
          code: `jwt.verify(token, getPublicKey(), { algorithms: ['HS256'] });`,
          errors: [{ messageId: 'algorithmConfusion' }],
        },
        // JWKS pattern
        {
          code: `jwt.verify(token, jwksKey, { algorithms: ['HS256'] });`,
          errors: [{ messageId: 'algorithmConfusion' }],
        },
        // alg shorthand with public key
        {
          code: `jwt.verify(token, publicKey, { alg: 'HS256' });`,
          errors: [{ messageId: 'algorithmConfusion' }],
        },
        // jwtVerify with public key
        {
          code: `jwtVerify(token, publicKey, { algorithms: ['HS256'] });`,
          errors: [{ messageId: 'algorithmConfusion' }],
        },
      ],
    });
  });
});
