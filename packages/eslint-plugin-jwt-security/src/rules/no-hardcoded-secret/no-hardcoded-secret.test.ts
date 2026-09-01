/**
 * Tests for no-hardcoded-secret rule
 * Security: CWE-798 (Hardcoded Credentials)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noHardcodedSecret } from './index';

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

describe('no-hardcoded-secret', () => {
  describe('Valid Code - Safe Key Sources', () => {
    ruleTester.run('valid - environment and config', noHardcodedSecret, {
      valid: [
        // Environment variable
        {
          name: 'the secret comes from the environment',
          code: `import jwt from 'jsonwebtoken';
jwt.sign(payload, process.env.JWT_SECRET);`,
        },
        {
          code: `import jwt from 'jsonwebtoken';
jwt.verify(token, process.env.JWT_SECRET);`,
        },
        // Variable reference
        {
          code: `import jwt from 'jsonwebtoken';
jwt.sign(payload, secret);`,
        },
        {
          code: `import jwt from 'jsonwebtoken';
jwt.verify(token, privateKey);`,
        },
        // Function call
        {
          code: `import jwt from 'jsonwebtoken';
jwt.sign(payload, getSecretKey());`,
        },
        {
          code: `import jwt from 'jsonwebtoken';
jwt.verify(token, await loadPublicKey());`,
        },
        // Config object
        {
          code: `import jwt from 'jsonwebtoken';
jwt.sign(payload, config.jwtSecret);`,
        },
        {
          code: `import jwt from 'jsonwebtoken';
jwt.verify(token, settings.publicKey);`,
        },
        // Async key loading
        {
          code: `import jwt from 'jsonwebtoken';
jwt.verify(token, await importJWK(jwk));`,
        },
        // crypto operations
        {
          code: `import jwt from 'jsonwebtoken';
jwt.sign(payload, crypto.randomBytes(32));`,
        },
        // Only 1 argument - edge case (line 156 coverage)
        {
          code: `import jwt from 'jsonwebtoken';
jwt.sign(payload);`,
        },
        {
          code: `import jwt from 'jsonwebtoken';
jwt.verify(token);`,
        },
        // MemberExpression that's not hardcoded
        {
          code: `import jwt from 'jsonwebtoken';
jwt.sign(payload, keys.current);`,
        },
        // signJWT with env var
        {
          code: `import jwt from 'jsonwebtoken';
signJWT(payload, process.env.SECRET);`,
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Hardcoded Secrets', () => {
    ruleTester.run('invalid - hardcoded strings', noHardcodedSecret, {
      valid: [],
      invalid: [
        // String literal
        {
          name: 'the signing secret is a literal in the source',
          code: `import jwt from 'jsonwebtoken';
jwt.sign(payload, 'my-secret-key');`,
          errors: [{ messageId: 'hardcodedSecret' }],
        },
        // Long string (still hardcoded)
        {
          code: `import jwt from 'jsonwebtoken';
jwt.sign(payload, 'this-is-a-very-long-secret-but-still-hardcoded');`,
          errors: [{ messageId: 'hardcodedSecret' }],
        },
        // Template literal without variables
        {
          code: 'import jwt from "jsonwebtoken";\njwt.sign(payload, `my-secret-key`);',
          errors: [{ messageId: 'hardcodedSecret' }],
        },
        // Verify with hardcoded
        {
          code: `import jwt from 'jsonwebtoken';
jwt.verify(token, 'hardcoded-public-key');`,
          errors: [{ messageId: 'hardcodedSecret' }],
        },
        // PEM key inline
        {
          code: `import jwt from 'jsonwebtoken';
jwt.verify(token, '-----BEGIN PUBLIC KEY-----\\\\nMIIBIj...');`,
          errors: [{ messageId: 'hardcodedSecret' }],
        },
        // signJWT with hardcoded
        {
          code: `import jwt from 'jsonwebtoken';
signJWT(payload, 'hardcoded');`,
          errors: [{ messageId: 'hardcodedSecret' }],
        },
        // sign() direct call with hardcoded
        {
          code: `import jwt from 'jsonwebtoken';
sign(payload, 'secret123');`,
          errors: [{ messageId: 'hardcodedSecret' }],
        },
      ],
    });
  });
});
