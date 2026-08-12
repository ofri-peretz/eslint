/**
 * Tests for no-decode-without-verify rule
 * Security: CWE-345 (Data Authenticity)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noDecodeWithoutVerify } from './index';

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

describe('no-decode-without-verify', () => {
  describe('Valid Code - Verify Operations', () => {
    ruleTester.run('valid - verify operations', noDecodeWithoutVerify, {
      valid: [
        // jwt.verify is safe
        {
          code: `import jwt from 'jsonwebtoken';
const payload = jwt.verify(token, secret);`,
        },
        {
          code: `import jwt from 'jsonwebtoken';
jwt.verify(token, publicKey, { algorithms: ['RS256'] });`,
        },
        // jose jwtVerify is safe
        {
          code: `import jwt from 'jsonwebtoken';
const { payload } = await jwtVerify(token, key);`,
        },
        // sign is not flagged
        {
          code: `import jwt from 'jsonwebtoken';
jwt.sign(payload, secret);`,
        },
      ],
      invalid: [],
    });
  });

  // The reported false positive ("matches any method named decode") does not
  // reproduce: the SDK-evidence gate resolves the callee to an imported JWT
  // library first. These are the two shapes from the report, locked so the
  // gate cannot be removed without a red test. Both are verbatim from the
  // 8-repo corpus scan.
  describe('Valid Code - decode() on a non-JWT receiver', () => {
    ruleTester.run('valid - SDK-evidence gate', noDecodeWithoutVerify, {
      valid: [
        // Shopify/cli packages/cli-kit/src/public/node/toml/toml-file.ts:48 —
        // a TOML file parser. No JWT library imported in the file at all.
        `file.content = file.decode(raw);`,
        // okta/okta-auth-js lib/oidc/handleOAuthResponse.ts:109 — Okta's own
        // SDK method. That file imports only relative paths, so the file-level
        // gate is what saves it.
        `import { clone } from '../util';
const accessJwt = sdk.token.decode(accessToken);`,
        // The same call in a file that DOES import a JWT library, with the
        // receiver imported from somewhere else. This is the argon2 shape the
        // foreign-import gate was built for, one member deeper: the gate read
        // only a bare Identifier receiver, so `sdk.token.decode` never had its
        // root (`sdk`) checked at all.
        `import jwt from 'jsonwebtoken';
import { sdk } from '@okta/okta-auth-js';
const accessJwt = sdk.token.decode(accessToken);`,
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Decode Operations', () => {
    ruleTester.run('invalid - decode without verify', noDecodeWithoutVerify, {
      valid: [],
      invalid: [
        // Basic jwt.decode()
        {
          code: `import jwt from 'jsonwebtoken';
const payload = jwt.decode(token);`,
          errors: [{ messageId: 'decodeWithoutVerify' }],
        },
        // jose's decode is `decodeJwt`. The method set listed `decodeJWT`, an
        // all-caps spelling no JWT library ships, so this went unreported even
        // though jose is a listed library.
        {
          code: `import { decodeJwt } from 'jose';
const claims = decodeJwt(token);`,
          errors: [{ messageId: 'decodeWithoutVerify' }],
        },
        // decode with options
        {
          code: `import jwt from 'jsonwebtoken';
const decoded = jwt.decode(token, { complete: true });`,
          errors: [{ messageId: 'decodeWithoutVerify' }],
        },
        // Using payload directly
        {
          code: `import jwt from 'jsonwebtoken';
const userId = jwt.decode(token).sub;`,
          errors: [{ messageId: 'decodeWithoutVerify' }],
        },
        // jwt-decode library - jwtDecode pattern
        {
          code: `import jwt from 'jsonwebtoken';
const payload = jwtDecode(accessToken);`,
          errors: [{ messageId: 'decodeWithoutVerify' }],
        },
        // jwt-decode library - jwt_decode pattern (snake_case import)
        {
          code: `import jwt from 'jsonwebtoken';
const payload = jwt_decode(accessToken);`,
          errors: [{ messageId: 'jwtDecodeLibrary' }],
        },
        // jose decodeJwt (decode only)
        {
          code: `import jwt from 'jsonwebtoken';
const payload = decodeJWT(token);`,
          errors: [{ messageId: 'decodeWithoutVerify' }],
        },
      ],
    });
  });
});

// ---------------------------------------------------------------------------
// Corpus regressions
// ---------------------------------------------------------------------------
// `decode()` cannot be replaced by `verify()` when there is no key to verify
// with — exactly the position a client is in when checking whether its own
// token has expired so it can refresh. twilio's TokenAuthStrategy.isTokenExpired
// (src/auth_strategy/TokenAuthStrategy.ts:49) is the corpus case, and its own
// comment says so: "Decode the token without verifying the signature, as we
// only want to read the expiration for this check."
ruleTester.run('no-decode-without-verify (corpus)', noDecodeWithoutVerify, {
  valid: [
    // The twilio shape, reduced.
    `import jwt from 'jsonwebtoken';
     function isTokenExpired(token) {
       const decoded = jwt.decode(token);
       if (!decoded || !decoded.exp) return true;
       return Date.now() >= decoded.exp * 1000;
     }`,
    // Direct member read of a time claim.
    `import jwt from 'jsonwebtoken';
     const stale = jwt.decode(token).exp < now;`,
    // The corpus writes `as JwtPayload` between the call and the declarator;
    // the type wrapper must not hide the binding.
    `import jwt from 'jsonwebtoken';
     const decoded = jwt.decode(token) as JwtPayload;
     if (decoded.exp < now) refresh();`,
  ],
  invalid: [
    // Reading an AUTHORIZATION claim from an unverified token is the whole
    // point of the rule. Shopify's exchange.ts:291 does this with `.sub`.
    {
      code: `import { decodeJwt } from 'jose';
     const userId = decodeJwt(idToken).sub;`,
      errors: [{ messageId: 'decodeWithoutVerify' }],
    },
    // A time claim AND an identity claim is still a finding.
    {
      code: `import jwt from 'jsonwebtoken';
     const d = jwt.decode(token);
     if (d.exp < now) refresh();
     grantAccess(d.role);`,
      errors: [{ messageId: 'decodeWithoutVerify' }],
    },
    // Passing the decoded object on is an unbounded use.
    {
      code: `import jwt from 'jsonwebtoken';
     const d = jwt.decode(token);
     if (!d.exp) return;
     audit(d);`,
      errors: [{ messageId: 'decodeWithoutVerify' }],
    },
    // A destructuring declarator has no single binding to follow.
    {
      code: `import jwt from 'jsonwebtoken';
     const { exp } = jwt.decode(token);`,
      errors: [{ messageId: 'decodeWithoutVerify' }],
    },
    // A computed claim read cannot be checked statically.
    {
      code: `import jwt from 'jsonwebtoken';
     const d = jwt.decode(token);
     use(d[claimName]);`,
      errors: [{ messageId: 'decodeWithoutVerify' }],
    },
  ],
});
