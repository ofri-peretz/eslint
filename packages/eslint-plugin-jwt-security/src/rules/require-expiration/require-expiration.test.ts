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
          name: 'expiresIn is set',
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
          name: 'a token signed with no expiry is valid forever',
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

// ---------------------------------------------------------------------------
// jose's fluent builder
// ---------------------------------------------------------------------------
// `new SignJWT(claims).setProtectedHeader(...).sign(key)` puts the expiry
// several links away from the call the rule sees. auth0's
// express-openid-connect writes it both ways: `lib/client.js:385` sets
// `exp: now + 60` on the claims object passed to the constructor, and
// `end-to-end/fixture/helpers.js:116` sets neither — which is a real finding.
ruleTester.run('require-expiration — jose builder', requireExpiration, {
  valid: [
    // Expiry set fluently, mid-chain.
    `import { SignJWT } from 'jose';\nnew SignJWT({ sub: id }).setExpirationTime('2h').sign(key);`,
    // Expiry declared on the claims object at the chain root.
    `import { SignJWT } from 'jose';\nconst payload = { sub: id, exp: now + 60 };\nnew SignJWT(payload).setProtectedHeader({ alg }).sign(key);`,
    // Namespaced constructor.
    `import * as jose from 'jose';\nnew jose.SignJWT({ sub: id }).setExpirationTime('2h').sign(key);`,
    // JWS signers carry no claim set, so "missing exp" cannot be true of them.
    `import { FlattenedSign } from 'jose';\nnew FlattenedSign(bytes).setProtectedHeader({ alg }).sign(key);`,
    `import { CompactSign } from 'jose';\nnew CompactSign(bytes).sign(key);`,
    `import { GeneralSign } from 'jose';\nnew GeneralSign(bytes).sign(key);`,
  ],
  invalid: [
    // The corpus finding: issued-at set, expiry never.
    {
      code: `import * as jose from 'jose';\nconst claims = { sub: id };\nnew jose.SignJWT(claims).setIssuedAt().sign(privateKey);`,
      errors: [{ messageId: 'missingExpiration', suggestions: 1 }],
    },
    // Claims object present at the root but carrying no exp.
    {
      code: `import { SignJWT } from 'jose';\nnew SignJWT({ sub: id }).setProtectedHeader({ alg }).sign(key);`,
      errors: [{ messageId: 'missingExpiration', suggestions: 1 }],
    },
    // A chain rooted in something that is not a constructor at all.
    {
      code: `import { SignJWT } from 'jose';\nbuilder().setProtectedHeader({ alg }).sign(key);`,
      errors: [{ messageId: 'missingExpiration', suggestions: 1 }],
    },
    // Computed constructor name — nothing to compare against.
    {
      code: `import * as jose from 'jose';\nnew jose[name]({ sub: id }).sign(key);`,
      errors: [{ messageId: 'missingExpiration', suggestions: 1 }],
    },
    // A string-literal member, which is not an Identifier property.
    {
      code: `import * as jose from 'jose';\nnew jose['SignJWT']({ sub: id }).sign(key);`,
      errors: [{ messageId: 'missingExpiration', suggestions: 1 }],
    },
    // Constructor called with no arguments: no claims to inspect.
    {
      code: `import { SignJWT } from 'jose';\nnew SignJWT().sign(key);`,
      errors: [{ messageId: 'missingExpiration', suggestions: 1 }],
    },
  ],
});

// The corpus path is now ignored by scripts/corpus-scan.ts (`end-to-end/` and
// `fixture/` are test infrastructure — see scripts/lib/corpus-scan-ignores.ts),
// so the scan will never exercise this shape again. The RULE behaviour is
// unchanged and stays pinned here: a jose builder chain that sets an issuer, an
// audience, an issued-at and a JTI but never an expiry is still a finding.
//
// Corpus: auth0/express-openid-connect end-to-end/fixture/helpers.js:116.
ruleTester.run(
  'require-expiration — the auth0 logout-token builder',
  requireExpiration,
  {
    valid: [
      `import * as jose from 'jose';
const logoutToken = await new jose.SignJWT(claims)
  .setProtectedHeader({ alg: 'RS256', typ: 'logout+jwt' })
  .setIssuer(issuer)
  .setAudience(clientId)
  .setIssuedAt()
  .setExpirationTime('5m')
  .sign(privateKey);`,
    ],
    invalid: [
      {
        code: `import * as jose from 'jose';
const logoutToken = await new jose.SignJWT(claims)
  .setProtectedHeader({ alg: 'RS256', typ: 'logout+jwt' })
  .setIssuer(issuer)
  .setAudience(clientId)
  .setIssuedAt()
  .setJti(jti)
  .sign(privateKey);`,
        errors: [{ messageId: 'missingExpiration', suggestions: 1 }],
      },
    ],
  },
);
