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
