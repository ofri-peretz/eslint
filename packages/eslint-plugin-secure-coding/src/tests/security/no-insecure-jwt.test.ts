/**
 * Comprehensive tests for no-insecure-jwt rule
 * Security: CWE-347 (JWT Security Vulnerabilities)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noInsecureJwt } from '../../rules/security/no-insecure-jwt';

// Configure RuleTester for Vitest
RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

// Use Flat Config format (ESLint 9+)
const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

describe('no-insecure-jwt', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - secure JWT operations', noInsecureJwt, {
      valid: [
        // Secure JWT verification
        {
          code: 'jwt.verify(token, publicKey, { algorithms: ["RS256"] });',
        },
        {
          code: 'jwt.verify(token, secret, { algorithms: ["HS256"] });',
        },
        // Using jose library
        {
          code: 'const payload = await jwtVerify(token, publicKey);',
        },
        // Strong secrets
        {
          code: 'jwt.sign(payload, crypto.randomBytes(32).toString("hex"));',
        },
        // Literal JWT strings (not flagged as they might be test data)
        {
          code: '// eslint-disable-next-line\nconst testToken = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWV9.TJVA95OrM7E2cBab30RMHrHDcEfxjoYZgeFONFh7HgQ";',
        },
        // Non-JWT libraries
        {
          code: 'const token = crypto.randomBytes(32);',
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Algorithm Confusion', () => {
    ruleTester.run('invalid - algorithm confusion attacks', noInsecureJwt, {
      valid: [],
      invalid: [
        // String literal algorithm spec triggers detection
        {
          code: 'jwt.verify(token, "secret", { alg: "none" });',
          errors: [
            {
              messageId: 'insecureJwtAlgorithm',
            },
          ],
        },
      ],
    });
  });

  describe('Invalid Code - Missing Signature Verification', () => {
    ruleTester.run('invalid - missing signature verification', noInsecureJwt, {
      valid: [],
      invalid: [
        {
          code: 'const payload = jwt.decode(token);',
          errors: [
            {
              messageId: 'jwtWithoutValidation',
            },
            {
              messageId: 'missingSignatureVerification',
            },
          ],
        },
        {
          code: 'const decoded = jwt.decode(token, { complete: true });',
          errors: [
            {
              messageId: 'jwtWithoutValidation',
            },
            {
              messageId: 'missingSignatureVerification',
            },
          ],
        },
        {
          code: 'const user = jwt.decode(authToken);',
          errors: [
            {
              messageId: 'jwtWithoutValidation',
            },
            {
              messageId: 'missingSignatureVerification',
            },
          ],
        },
      ],
    });
  });

  describe('Invalid Code - Weak Secrets', () => {
    ruleTester.run('invalid - weak JWT secrets with weak algorithms', noInsecureJwt, {
      valid: [
        // Weak secrets without algorithm spec are not flagged
        {
          code: 'jwt.sign(payload, "weak");',
        },
        // Strong secret with weak algorithm is OK
        {
          code: 'jwt.sign(payload, "ThisIsAVeryLongSecretThatIsDefinitelyLongerThan32Characters", { algorithms: ["HS256"] });',
        },
      ],
      invalid: [
        // Weak algorithm (HS256) with weak (short) secret - triggers weakJwtSecret
        {
          code: 'jwt.verify(token, "weak", { alg: "HS256" });',
          errors: [{ messageId: 'weakJwtSecret' }],
        },
        // Weak algorithm with short secret
        {
          code: 'jwt.sign(payload, "short", { algorithm: "HS384" });',
          errors: [{ messageId: 'weakJwtSecret' }],
        },
      ],
    });
  });

  describe('Invalid Code - JWT Without Validation', () => {
    ruleTester.run('invalid - JWT used without validation', noInsecureJwt, {
      valid: [],
      invalid: [
        {
          code: 'const payload = jwt.decode(token); const userId = payload.userId;',
          errors: [
            {
              messageId: 'jwtWithoutValidation',
            },
            {
              messageId: 'missingSignatureVerification',
            },
          ],
        },
        {
          code: 'const decoded = jwt.decode(authToken); if (decoded.exp < Date.now()) { /* use decoded */ }',
          errors: [
            {
              messageId: 'jwtWithoutValidation',
            },
            {
              messageId: 'missingSignatureVerification',
            },
          ],
        },
      ],
    });
  });


  describe('Valid Code - False Positives Reduced', () => {
    ruleTester.run('valid - false positives reduced', noInsecureJwt, {
      valid: [
        // Safe annotations suppress warnings
        {
          code: `
            /** @verified */
            const payload = jwt.decode(token);
          `,
        },
        {
          code: `
            // @safe
            const decoded = jwt.decode(authToken);
          `,
        },
        // Strong secrets (no algorithm spec, so not flagged)
        {
          code: 'jwt.sign(payload, crypto.randomBytes(32).toString("hex"));',
        },
        {
          code: 'jwt.sign(payload, "ThisIsAVeryLongSecretThatIsDefinitelyLongerThan32Characters");',
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Unsafe JWT Parsing', () => {
    ruleTester.run('invalid - unsafe JWT string usage', noInsecureJwt, {
      valid: [
        // Hardcoded JWT but verified (inline)
        {
          code: `
            jwt.verify("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWV9.TJVA95OrM7E2cBab30RMHrHDcEfxjoYZgeFONFh7HgQ", secret);
          `,
        },
        // Not a JWT (not 3 parts)
        {
          code: 'const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWV9";',
        },
      ],
      invalid: [
        // Hardcoded JWT used without verification context
        {
          code: 'const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWV9.TJVA95OrM7E2cBab30RMHrHDcEfxjoYZgeFONFh7HgQ"; console.log(token);',
          errors: [{ messageId: 'unsafeJwtParsing' }],
        },
      ],
    });
  });

  describe('Configuration Options', () => {
    // Note: allowedInsecureAlgorithms option not fully implemented in rule

    ruleTester.run('config - custom min secret length', noInsecureJwt, {
      valid: [
        // Secret length not checked without algorithm spec
        {
          code: 'jwt.sign(payload, "ThisIs16Chars");',
          options: [{ minSecretLength: 16 }],
        },
        // Short secret without algorithm spec is valid
        {
          code: 'jwt.sign(payload, "short");',
          options: [{ minSecretLength: 16 }],
        },
      ],
      invalid: [],
    });

    ruleTester.run('config - custom trusted libraries', noInsecureJwt, {
      valid: [
        // Custom trusted library
        {
          code: 'myJwt.verify(token, secret);',
          options: [{ trustedJwtLibraries: ['myJwt'] }],
        },
        // Unknown library isn't flagged (rule only checks trusted libraries)
        {
          code: 'unknownJwt.verify(token, secret);',
        },
      ],
      invalid: [],
    });
  });
});
