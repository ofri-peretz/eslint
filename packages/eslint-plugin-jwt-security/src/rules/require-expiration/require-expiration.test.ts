/**
 * Tests for require-expiration rule
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { requireExpiration } from './index';

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

describe('require-expiration', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - with expiration', requireExpiration, {
      valid: [
        // expiresIn option
        {
          code: `import jwt from 'jsonwebtoken';
jwt.sign(payload, secret, { expiresIn: '1h' });`,
        },
        {
          code: `import jwt from 'jsonwebtoken';
jwt.sign(payload, secret, { expiresIn: 3600 });`,
        },
        // exp in payload
        {
          code: `import jwt from 'jsonwebtoken';
jwt.sign({ sub: 'user', exp: 1234567890 }, secret);`,
        },
        {
          code: `import jwt from 'jsonwebtoken';
jwt.sign({ exp: Math.floor(Date.now()/1000) + 3600 }, secret);`,
        },
        // verify not checked
        {
          code: `import jwt from 'jsonwebtoken';
jwt.verify(token, secret);`,
        },
        // signJWT with expiresIn
        {
          code: `import jwt from 'jsonwebtoken';
signJWT(payload, key, { expiresIn: '1h' });`,
        },
        // Zero arguments - edge case (line 118 coverage)
        {
          code: `import jwt from 'jsonwebtoken';
jwt.sign();`,
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code', () => {
    ruleTester.run('invalid - no expiration', requireExpiration, {
      valid: [],
      invalid: [
        {
          code: `import jwt from 'jsonwebtoken';
jwt.sign(payload, secret);`,
          errors: [
            {
              messageId: 'missingExpiration',
              suggestions: [
                {
                  messageId: 'addExpiration',
                  output: `import jwt from 'jsonwebtoken';
jwt.sign(payload, secret, { expiresIn: '1h' });`,
                },
              ],
            },
          ],
        },
        {
          code: `import jwt from 'jsonwebtoken';
jwt.sign(payload, secret, {});`,
          errors: [
            {
              messageId: 'missingExpiration',
              suggestions: [
                {
                  messageId: 'addExpiration',
                  output: `import jwt from 'jsonwebtoken';
jwt.sign(payload, secret, { expiresIn: '1h',});`,
                },
              ],
            },
          ],
        },
        {
          code: `import jwt from 'jsonwebtoken';
jwt.sign(payload, secret, { algorithm: 'RS256' });`,
          errors: [
            {
              messageId: 'missingExpiration',
              suggestions: [
                {
                  messageId: 'addExpiration',
                  output: `import jwt from 'jsonwebtoken';
jwt.sign(payload, secret, { expiresIn: '1h', algorithm: 'RS256' });`,
                },
              ],
            },
          ],
        },
        {
          code: `import jwt from 'jsonwebtoken';
jwt.sign({ sub: 'user', iat: Date.now() }, secret);`,
          errors: [
            {
              messageId: 'missingExpiration',
              suggestions: [
                {
                  messageId: 'addExpiration',
                  output: `import jwt from 'jsonwebtoken';
jwt.sign({ sub: 'user', iat: Date.now() }, secret, { expiresIn: '1h' });`,
                },
              ],
            },
          ],
        },
        {
          code: `import jwt from 'jsonwebtoken';
sign(payload, key);`,
          errors: [
            {
              messageId: 'missingExpiration',
              suggestions: [
                {
                  messageId: 'addExpiration',
                  output: `import jwt from 'jsonwebtoken';
sign(payload, key, { expiresIn: '1h' });`,
                },
              ],
            },
          ],
        },
        // signJWT without expiration
        {
          code: `import jwt from 'jsonwebtoken';
signJWT({ sub: 'user' }, key, { algorithm: 'RS256' });`,
          errors: [
            {
              messageId: 'missingExpiration',
              suggestions: [
                {
                  messageId: 'addExpiration',
                  output: `import jwt from 'jsonwebtoken';
signJWT({ sub: 'user' }, key, { expiresIn: '1h', algorithm: 'RS256' });`,
                },
              ],
            },
          ],
        },
      ],
    });
  });
});

// ---------------------------------------------------------------------------
// Corpus regression: an `exp` claim set on a payload BUILT ABOVE THE CALL
// ---------------------------------------------------------------------------
// twilio's ClientCapability.toJwt() (src/jwt/ClientCapability.ts:159) assigns
// the payload to a variable and sets `exp: now + this.ttl` on it before
// signing. Checking only an inline object literal reported a token whose
// expiration was right there, spelled the other legal way.
ruleTester.run('require-expiration (corpus)', requireExpiration, {
  valid: [
    `import jwt from 'jsonwebtoken';
     const payload = { scope, iss: sid, exp: Math.floor(Date.now() / 1000) + ttl };
     jwt.sign(payload, secret);`,
    // Quoted claim key is the same claim.
    `import jwt from 'jsonwebtoken';
     const payload = { 'exp': 123 };
     jwt.sign(payload, secret);`,
  ],
  invalid: [
    // A payload arriving as a PARAMETER cannot be resolved, so it stays a
    // finding — the rule must not treat "unresolvable" as "has an exp".
    {
      code: `import jwt from 'jsonwebtoken';
     function issue(payload) { return jwt.sign(payload, secret); }`,
      errors: [{ messageId: 'missingExpiration', suggestions: 1 }],
    },
    // Declared without an initialiser: nothing to read a claim from.
    {
      code: `import jwt from 'jsonwebtoken';
     let payload;
     payload = build();
     jwt.sign(payload, secret);`,
      errors: [{ messageId: 'missingExpiration', suggestions: 1 }],
    },
    // Resolvable, and genuinely missing the claim.
    {
      code: `import jwt from 'jsonwebtoken';
     const payload = { sub: id };
     jwt.sign(payload, secret);`,
      errors: [{ messageId: 'missingExpiration', suggestions: 1 }],
    },
  ],
});
