/**
 * Tests for no-weak-hash-algorithm rule
 * CWE-327: Use of a Broken or Risky Cryptographic Algorithm
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noWeakHashAlgorithm } from './index';

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

/**
 * The pre-inversion contract: any MD5/SHA-1/MD4/RIPEMD call is a finding.
 *
 * Measured on the 8-repo corpus that produced 6 findings, all content digests —
 * `fileHash(buff)`, `hashString(str)`, `calculateChecksum`. The default now
 * requires a visible security use; these cases keep pinning the algorithm
 * detection, the suggestion fixers and the assignment-target plumbing through
 * the restoring option.
 */
const UNCLASSIFIED = [{ reportUnclassifiedHashes: true }];

describe('no-weak-hash-algorithm', () => {
  ruleTester.run('no-weak-hash-algorithm', noWeakHashAlgorithm, {
    valid: [
      // Valid: SHA-256 (strong)
      { name: 'SHA-256', code: 'crypto.createHash("sha256").update(data);' },
      { code: 'crypto.createHash("sha512").update(data);' },
      { code: 'crypto.createHash("sha3-256").update(data);' },
      // Valid: Non-crypto context
      { code: 'const message = "md5 is weak";' },
      // Valid: Test file with allowInTests
      {
        code: 'crypto.createHash("md5").update(data);',
        filename: 'crypto.test.ts',
        options: [{ allowInTests: true }],
      },
      // Valid: Non-hash function with weak name
      { code: 'console.log("sha1");' },
      // Valid: sha256 function (strong)
      { code: 'sha256(data);' },

      // ---- Non-cryptographic use: the hash is an identifier ----------------
      // redis/ioredis lib/Script.ts:15, verbatim. SHA-1 IS used and the
      // detection is correct, but this is the EVALSHA script identifier the
      // Redis wire protocol mandates — a cache key, not a security control.
      { code: 'this.sha = createHash("sha1").update(lua).digest("hex");' },
      // The same shape through each supported assignment form.
      {
        code: 'const etag = crypto.createHash("md5").update(body).digest("hex");',
      },
      {
        code: 'cacheKey = crypto.createHash("md5").update(input).digest("hex");',
      },
      {
        code: 'const meta = { cache_key: createHash("sha1").update(x).digest("hex") };',
      },
      // Separators and case are normalised, so cache-key is the same name.
      {
        code: 'const res = { "x": 1 }; res.cacheBuster = createHash("md5").update(v).digest("hex");',
      },
      // A user-supplied name list replaces the default.
      {
        code: 'const scriptDigest = createHash("sha1").update(lua).digest("hex");',
        options: [{ nonCryptographicNames: ['scriptDigest'] }],
      },
      // The bare `sha1(x)` helper form takes the same exemption — the test
      // is where the value LANDS, not which API produced it. `sha1(lua)`
      // stored as `sha` is the ioredis pattern written with a wrapper.
      { code: 'const sha = sha1(lua);' },
      // A local helper named `sha1` that computes an HMAC. Reported on
      // vercel/example-marketplace-integration as a CRITICAL CWE-327 "use of
      // weak hash algorithm", with a suggestion to call `sha256(...)` — a
      // function that does not exist, wrapping an algorithm that never
      // changes. HMAC-SHA1 does not inherit SHA-1's collision weakness, and
      // the call site is not where the algorithm is chosen anyway.
      {
        code: `
          function sha1(data, secret) {
            return crypto.createHmac("sha1", secret).update(data).digest("hex");
          }
          const bodySignature = sha1(rawBody, env.INTEGRATION_CLIENT_SECRET);
        `,
      },
      // Same exemption for the arrow-function spelling.
      {
        code: `
          const md5 = (input) => crypto.createHmac("md5", key).update(input).digest("hex");
          const tag = md5(payload);
        `,
      },
      // The subscripted spelling. Was pinned as INVALID under "a computed
      // member says nothing about which function is called" — it names
      // `createHmac` outright, so denying it the exemption above reported a
      // false positive on the notation a minifier emits.
      {
        name: 'the subscripted spelling',
        code: `
          function sha1(data, secret) { return crypto['createHmac']('sha1', secret).update(data).digest(); }
          const sessionToken = sha1(body, secret);
        `,
      },
      // The destructured spelling — the callee is a bare Identifier rather
      // than a member of `crypto`, and it is the same HMAC.
      {
        code: `
          const { createHmac } = require('crypto');
          function sha1(data, secret) { return createHmac('sha1', secret).update(data).digest('hex'); }
          const signature = sha1(body, clientSecret);
        `,
      },
      // A `const` bound to something that is not a function is still a local
      // name rather than a package's digest export.
      {
        code: `
          const md5 = require('./local-helpers').md5;
          const tag = md5(payload);
        `,
      },
      // A quoted key names the same property as a bare one; the exemption
      // must not depend on quoting style.
      {
        code: `const meta = { 'cache-key': createHash("sha1").update(x).digest("hex") };`,
      },
    ],
    invalid: [
      // An import IS evidence: `crypto-hash` really does export a bare digest
      // under the algorithm's own name, which is what the branch is for.
      {
        name: 'SHA-1 over secret material',
        code: `
          import { sha1 } from 'crypto-hash';
          const digest = await sha1(secretMaterial);
        `,
        options: UNCLASSIFIED,
        errors: 1,
      },
      // A local helper that really computes a bare digest keeps reporting, and
      // under UNCLASSIFIED it reports twice: once where the algorithm is
      // selected, once at the call site whose name says what the value is for.
      // The exemption is for HMAC helpers only.
      {
        code: `
          function sha1(data) {
            return crypto.createHash("sha1").update(data).digest("hex");
          }
          const sessionToken = sha1(secret);
        `,
        options: UNCLASSIFIED,
        errors: [
          {
            messageId: 'weakHashAlgorithm',
            suggestions: [
              {
                messageId: 'useSha256',
                output: `
          function sha1(data) {
            return crypto.createHash("sha256").update(data).digest("hex");
          }
          const sessionToken = sha1(secret);
        `,
              },
              {
                messageId: 'useSha512',
                output: `
          function sha1(data) {
            return crypto.createHash("sha512").update(data).digest("hex");
          }
          const sessionToken = sha1(secret);
        `,
              },
              {
                messageId: 'useSha3',
                output: `
          function sha1(data) {
            return crypto.createHash("sha3-256").update(data).digest("hex");
          }
          const sessionToken = sha1(secret);
        `,
              },
            ],
          },
          {
            messageId: 'weakHashAlgorithm',
            suggestions: [
              {
                messageId: 'useSha256',
                output: `
          function sha1(data) {
            return crypto.createHash("sha1").update(data).digest("hex");
          }
          const sessionToken = sha256(secret);
        `,
              },
            ],
          },
        ],
      },
      // A callee chosen at RUNTIME says nothing about which function is
      // called, so it is not HMAC evidence and the helper keeps reporting.
      {
        code: `
          function sha1(data, secret) { return crypto[make]('sha1', secret).update(data).digest(); }
          const sessionToken = sha1(body, secret);
        `,
        errors: 1,
      },
      // The default mode is the one that matters, and it is where the first
      // version of this fix went silent: no `reportUnclassifiedHashes`, a weak
      // digest chosen inside the helper, and a security-use name at the call.
      {
        code: `
          function sha1(data) { return crypto.createHash("sha1").update(data).digest(); }
          const sessionToken = sha1(secret);
        `,
        errors: 1,
      },
      // Invalid: MD5
      {
        code: 'crypto.createHash("md5").update(data);',
        options: UNCLASSIFIED,
        errors: [
          {
            messageId: 'weakHashAlgorithm',
            suggestions: [
              {
                messageId: 'useSha256',
                output: 'crypto.createHash("sha256").update(data);',
              },
              {
                messageId: 'useSha512',
                output: 'crypto.createHash("sha512").update(data);',
              },
              {
                messageId: 'useSha3',
                output: 'crypto.createHash("sha3-256").update(data);',
              },
            ],
          },
        ],
      },
      // Invalid: SHA-1
      {
        code: 'crypto.createHash("sha1").update(data);',
        options: UNCLASSIFIED,
        errors: [
          {
            messageId: 'weakHashAlgorithm',
            suggestions: [
              {
                messageId: 'useSha256',
                output: 'crypto.createHash("sha256").update(data);',
              },
              {
                messageId: 'useSha512',
                output: 'crypto.createHash("sha512").update(data);',
              },
              {
                messageId: 'useSha3',
                output: 'crypto.createHash("sha3-256").update(data);',
              },
            ],
          },
        ],
      },
      // Invalid: MD4
      {
        code: 'crypto.createHash("md4").update(data);',
        options: UNCLASSIFIED,
        errors: [
          {
            messageId: 'weakHashAlgorithm',
            suggestions: [
              {
                messageId: 'useSha256',
                output: 'crypto.createHash("sha256").update(data);',
              },
              {
                messageId: 'useSha512',
                output: 'crypto.createHash("sha512").update(data);',
              },
              {
                messageId: 'useSha3',
                output: 'crypto.createHash("sha3-256").update(data);',
              },
            ],
          },
        ],
      },
      // Invalid: Case insensitive
      {
        code: 'crypto.createHash("MD5").update(data);',
        options: UNCLASSIFIED,
        errors: [
          {
            messageId: 'weakHashAlgorithm',
            suggestions: [
              {
                messageId: 'useSha256',
                output: 'crypto.createHash("sha256").update(data);',
              },
              {
                messageId: 'useSha512',
                output: 'crypto.createHash("sha512").update(data);',
              },
              {
                messageId: 'useSha3',
                output: 'crypto.createHash("sha3-256").update(data);',
              },
            ],
          },
        ],
      },
      // Invalid: Standalone createHash function
      {
        code: 'createHash("md5");',
        options: UNCLASSIFIED,
        errors: [
          {
            messageId: 'weakHashAlgorithm',
            suggestions: [
              { messageId: 'useSha256', output: 'createHash("sha256");' },
              { messageId: 'useSha512', output: 'createHash("sha512");' },
              { messageId: 'useSha3', output: 'createHash("sha3-256");' },
            ],
          },
        ],
      },
      // Invalid: RIPEMD
      {
        code: 'crypto.createHash("ripemd").update(data);',
        options: UNCLASSIFIED,
        errors: [
          {
            messageId: 'weakHashAlgorithm',
            suggestions: [
              {
                messageId: 'useSha256',
                output: 'crypto.createHash("sha256").update(data);',
              },
              {
                messageId: 'useSha512',
                output: 'crypto.createHash("sha512").update(data);',
              },
              {
                messageId: 'useSha3',
                output: 'crypto.createHash("sha3-256").update(data);',
              },
            ],
          },
        ],
      },
      // Invalid: Direct sha1() function call (lines 205-221)
      {
        code: 'sha1(data);',
        options: UNCLASSIFIED,
        errors: [
          {
            messageId: 'weakHashAlgorithm',
            suggestions: [{ messageId: 'useSha256', output: 'sha256(data);' }],
          },
        ],
      },
      // Invalid: Direct md5() function call (lines 83-85, 205-221)
      {
        code: 'md5(password);',
        options: UNCLASSIFIED,
        errors: [
          {
            messageId: 'weakHashAlgorithm',
            suggestions: [
              { messageId: 'useSha256', output: 'sha256(password);' },
            ],
          },
        ],
      },
      // Invalid: Direct md4() function call
      {
        code: 'md4(data);',
        options: UNCLASSIFIED,
        errors: [
          {
            messageId: 'weakHashAlgorithm',
            suggestions: [{ messageId: 'useSha256', output: 'sha256(data);' }],
          },
        ],
      },
      // Invalid: Additional weak algorithms option
      {
        code: 'crypto.createHash("whirlpool").update(data);',
        options: [
          {
            additionalWeakAlgorithms: ['whirlpool'],
            reportUnclassifiedHashes: true,
          },
        ],
        errors: [
          {
            messageId: 'weakHashAlgorithm',
            suggestions: [
              {
                messageId: 'useSha256',
                output: 'crypto.createHash("sha256").update(data);',
              },
              {
                messageId: 'useSha512',
                output: 'crypto.createHash("sha512").update(data);',
              },
              {
                messageId: 'useSha3',
                output: 'crypto.createHash("sha3-256").update(data);',
              },
            ],
          },
        ],
      },

      // ---- The non-cryptographic exemption is narrow ----------------------
      // Only a hash STORED under a recognised name qualifies. Everything below
      // is the same `createHash` call in a position the exemption must not
      // reach, so that "call it `sha`" can never become a way to silence the
      // rule on a real security control.

      // A security-flavoured assignment target is not exempt.
      {
        code: 'const signature = createHash("sha1").update(data).digest("hex");',
        options: UNCLASSIFIED,
        errors: [
          {
            messageId: 'weakHashAlgorithm',
            suggestions: [
              {
                messageId: 'useSha256',
                output:
                  'const signature = createHash("sha256").update(data).digest("hex");',
              },
              {
                messageId: 'useSha512',
                output:
                  'const signature = createHash("sha512").update(data).digest("hex");',
              },
              {
                messageId: 'useSha3',
                output:
                  'const signature = createHash("sha3-256").update(data).digest("hex");',
              },
            ],
          },
        ],
      },
      // Returned, never stored — the walk finds no assignment target.
      {
        code: 'function f() { return createHash("md5").update(pw).digest("hex"); }',
        options: UNCLASSIFIED,
        errors: [
          {
            messageId: 'weakHashAlgorithm',
            suggestions: [
              {
                messageId: 'useSha256',
                output:
                  'function f() { return createHash("sha256").update(pw).digest("hex"); }',
              },
              {
                messageId: 'useSha512',
                output:
                  'function f() { return createHash("sha512").update(pw).digest("hex"); }',
              },
              {
                messageId: 'useSha3',
                output:
                  'function f() { return createHash("sha3-256").update(pw).digest("hex"); }',
              },
            ],
          },
        ],
      },
      // Passed straight to another call. The chain walk only climbs receivers,
      // so an argument position stops it.
      {
        code: 'verify(createHash("sha1").update(x).digest("hex"));',
        options: UNCLASSIFIED,
        errors: [
          {
            messageId: 'weakHashAlgorithm',
            suggestions: [
              {
                messageId: 'useSha256',
                output: 'verify(createHash("sha256").update(x).digest("hex"));',
              },
              {
                messageId: 'useSha512',
                output: 'verify(createHash("sha512").update(x).digest("hex"));',
              },
              {
                messageId: 'useSha3',
                output:
                  'verify(createHash("sha3-256").update(x).digest("hex"));',
              },
            ],
          },
        ],
      },
      // A computed member target hides the name, so it cannot be trusted.
      {
        code: 'obj[key] = createHash("sha1").update(x).digest("hex");',
        options: UNCLASSIFIED,
        errors: [
          {
            messageId: 'weakHashAlgorithm',
            suggestions: [
              {
                messageId: 'useSha256',
                output:
                  'obj[key] = createHash("sha256").update(x).digest("hex");',
              },
              {
                messageId: 'useSha512',
                output:
                  'obj[key] = createHash("sha512").update(x).digest("hex");',
              },
              {
                messageId: 'useSha3',
                output:
                  'obj[key] = createHash("sha3-256").update(x).digest("hex");',
              },
            ],
          },
        ],
      },
      // Destructuring target: not an Identifier, so no name to check.
      {
        code: 'const [a] = createHash("md5").update(x).digest("hex");',
        options: UNCLASSIFIED,
        errors: [
          {
            messageId: 'weakHashAlgorithm',
            suggestions: [
              {
                messageId: 'useSha256',
                output:
                  'const [a] = createHash("sha256").update(x).digest("hex");',
              },
              {
                messageId: 'useSha512',
                output:
                  'const [a] = createHash("sha512").update(x).digest("hex");',
              },
              {
                messageId: 'useSha3',
                output:
                  'const [a] = createHash("sha3-256").update(x).digest("hex");',
              },
            ],
          },
        ],
      },
      // A numeric key has no name to match.
      {
        code: 'const meta = { 1: createHash("md5").update(x).digest("hex") };',
        options: UNCLASSIFIED,
        errors: [
          {
            messageId: 'weakHashAlgorithm',
            suggestions: [
              {
                messageId: 'useSha256',
                output:
                  'const meta = { 1: createHash("sha256").update(x).digest("hex") };',
              },
              {
                messageId: 'useSha512',
                output:
                  'const meta = { 1: createHash("sha512").update(x).digest("hex") };',
              },
              {
                messageId: 'useSha3',
                output:
                  'const meta = { 1: createHash("sha3-256").update(x).digest("hex") };',
              },
            ],
          },
        ],
      },
      // A computed object key is likewise unreadable.
      {
        code: 'const meta = { [k]: createHash("sha1").update(x).digest("hex") };',
        options: UNCLASSIFIED,
        errors: [
          {
            messageId: 'weakHashAlgorithm',
            suggestions: [
              {
                messageId: 'useSha256',
                output:
                  'const meta = { [k]: createHash("sha256").update(x).digest("hex") };',
              },
              {
                messageId: 'useSha512',
                output:
                  'const meta = { [k]: createHash("sha512").update(x).digest("hex") };',
              },
              {
                messageId: 'useSha3',
                output:
                  'const meta = { [k]: createHash("sha3-256").update(x).digest("hex") };',
              },
            ],
          },
        ],
      },
      // An empty name list switches the exemption off entirely, restoring the
      // pre-change behaviour on the ioredis shape.
      {
        code: 'this.sha = createHash("sha1").update(lua).digest("hex");',
        options: [
          { nonCryptographicNames: [], reportUnclassifiedHashes: true },
        ],
        errors: [
          {
            messageId: 'weakHashAlgorithm',
            suggestions: [
              {
                messageId: 'useSha256',
                output:
                  'this.sha = createHash("sha256").update(lua).digest("hex");',
              },
              {
                messageId: 'useSha512',
                output:
                  'this.sha = createHash("sha512").update(lua).digest("hex");',
              },
              {
                messageId: 'useSha3',
                output:
                  'this.sha = createHash("sha3-256").update(lua).digest("hex");',
              },
            ],
          },
        ],
      },
    ],
  });

  // ── The inversion ──────────────────────────────────────────────────────
  // Every `valid` case is a verbatim shape from the 8-repo corpus scan and
  // reported before this change.
  describe('Content Digests Are Not CWE-327', () => {
    ruleTester.run('a visible security use is required', noWeakHashAlgorithm, {
      valid: [
        // An arrow bound to a destructuring pattern has no single name.
        `const [hashIt] = [(body) => md5(body)];`,
        // An anonymous callback has no name at all.
        `run(function () { return md5(body); });`,
        // A computed method key is a variable, so there is no name to read.
        `const api = { [dynamic](body) { return md5(body); } };`,
        // A hash at module scope, outside any function.
        `const out = md5(contents);`,
        // A non-string algorithm argument is not an algorithm name.
        `const h = crypto.createHash(5);`,
        // A declarator whose id is a PATTERN has no single name to read.
        `const [signIt] = function () { return md5(body); };`,
        // Shopify/cli packages/cli-kit/src/public/node/crypto.ts:40,50,84.
        `export function hashString(str) { return crypto.createHash('sha1').update(str).digest('hex'); }`,
        `export function fileHash(buff) { return crypto.createHash('md5').update(buff).digest('hex'); }`,
        `export function nonRandomUUID(subject) {
           return crypto.createHash('sha1').update(subject).digest().toString('hex');
         }`,
        // Shopify/cli packages/theme/.../asset-checksum.ts:11,32,42.
        `function regularFileChecksum(fileKey, fileContent) { return md5(fileContent); }`,
        `function minifiedJSONFileChecksum(fileContent) { return md5(fileContent); }`,
        `export function calculateChecksum(fileKey, fileContent) { return md5(fileContent); }`,
      ],
      invalid: [
        // Hashing a password with MD5 is the shape CWE-327 is about, and it is
        // visible from the argument alone.
        {
          code: `const digest = crypto.createHash('md5').update(password).digest('hex');`,
          errors: [
            {
              messageId: 'weakHashAlgorithm',
              suggestions: [
                {
                  messageId: 'useSha256',
                  output: `const digest = crypto.createHash("sha256").update(password).digest('hex');`,
                },
                {
                  messageId: 'useSha512',
                  output: `const digest = crypto.createHash("sha512").update(password).digest('hex');`,
                },
                {
                  messageId: 'useSha3',
                  output: `const digest = crypto.createHash("sha3-256").update(password).digest('hex');`,
                },
              ],
            },
          ],
        },
        // Visible from what the digest is STORED as.
        {
          code: `const signature = crypto.createHash('sha1').update(body).digest('hex');`,
          errors: [
            {
              messageId: 'weakHashAlgorithm',
              suggestions: [
                {
                  messageId: 'useSha256',
                  output: `const signature = crypto.createHash("sha256").update(body).digest('hex');`,
                },
                {
                  messageId: 'useSha512',
                  output: `const signature = crypto.createHash("sha512").update(body).digest('hex');`,
                },
                {
                  messageId: 'useSha3',
                  output: `const signature = crypto.createHash("sha3-256").update(body).digest('hex');`,
                },
              ],
            },
          ],
        },
        // Visible from the enclosing function, including an arrow bound to a
        // const and a class method.
        {
          code: `const signRequest = (body) => md5(body);`,
          errors: [
            {
              messageId: 'weakHashAlgorithm',
              suggestions: [
                {
                  messageId: 'useSha256',
                  output: `const signRequest = (body) => sha256(body);`,
                },
              ],
            },
          ],
        },
        {
          code: `class Signer { authToken(body) { return sha1(body); } }`,
          errors: [
            {
              messageId: 'weakHashAlgorithm',
              suggestions: [
                {
                  messageId: 'useSha256',
                  output: `class Signer { authToken(body) { return sha256(body); } }`,
                },
              ],
            },
          ],
        },
        // The boundary guard: `certPath` is a security use, `certainty` is not.
        {
          code: `const certFingerprint = createHash('sha1').update(pem).digest('hex');`,
          errors: [
            {
              messageId: 'weakHashAlgorithm',
              suggestions: [
                {
                  messageId: 'useSha256',
                  output: `const certFingerprint = createHash("sha256").update(pem).digest('hex');`,
                },
                {
                  messageId: 'useSha512',
                  output: `const certFingerprint = createHash("sha512").update(pem).digest('hex');`,
                },
                {
                  messageId: 'useSha3',
                  output: `const certFingerprint = createHash("sha3-256").update(pem).digest('hex');`,
                },
              ],
            },
          ],
        },
        // The hashed input read as a MEMBER rather than a bare identifier.
        {
          code: `const d = md5(user.password);`,
          errors: [
            {
              messageId: 'weakHashAlgorithm',
              suggestions: [
                {
                  messageId: 'useSha256',
                  output: `const d = sha256(user.password);`,
                },
              ],
            },
          ],
        },
        // The enclosing function is an object-literal method.
        {
          code: `const api = { signPayload(body) { return md5(body); } };`,
          errors: [
            {
              messageId: 'weakHashAlgorithm',
              suggestions: [
                {
                  messageId: 'useSha256',
                  output: `const api = { signPayload(body) { return sha256(body); } };`,
                },
              ],
            },
          ],
        },
        // checkHashArgument: a non-literal and a non-string algorithm argument
        // are not algorithm names, so nothing is reported for them — but the
        // security-use gate is passed, so the loop runs.
        {
          code: `const signature = crypto.createHash(algo).update(body).digest('hex');
                 const other = crypto.createHash(5);
                 const digest = crypto.createHash('md5').update(token).digest('hex');`,
          errors: [
            {
              messageId: 'weakHashAlgorithm',
              suggestions: [
                {
                  messageId: 'useSha256',
                  output: `const signature = crypto.createHash(algo).update(body).digest('hex');\n                 const other = crypto.createHash(5);\n                 const digest = crypto.createHash("sha256").update(token).digest('hex');`,
                },
                {
                  messageId: 'useSha512',
                  output: `const signature = crypto.createHash(algo).update(body).digest('hex');\n                 const other = crypto.createHash(5);\n                 const digest = crypto.createHash("sha512").update(token).digest('hex');`,
                },
                {
                  messageId: 'useSha3',
                  output: `const signature = crypto.createHash(algo).update(body).digest('hex');\n                 const other = crypto.createHash(5);\n                 const digest = crypto.createHash("sha3-256").update(token).digest('hex');`,
                },
              ],
            },
          ],
        },
        // `securityUseNames` is configurable.
        {
          code: `const licence = md5(payload);`,
          options: [{ securityUseNames: ['licence'] }],
          errors: [
            {
              messageId: 'weakHashAlgorithm',
              suggestions: [
                {
                  messageId: 'useSha256',
                  output: `const licence = sha256(payload);`,
                },
              ],
            },
          ],
        },
      ],
    });
  });

  /**
   * FN lock — the algorithm name held in a `const`.
   *
   * `const HASH_ALGORITHM = 'md5'` at the top of a module is ordinary style, and
   * it silenced the rule entirely: `checkHashArgument` read
   * `arg.type === 'Literal'` and an `Identifier` fell through. Both invalid
   * cases below are QUIET on the pre-fix rule.
   *
   * The suggestion rewrites the DECLARATION rather than the use site, because
   * replacing `HASH_ALGORITHM` with `"sha256"` at the call would leave the
   * broken constant in the file for the next caller.
   */
  describe('Algorithm held in a const', () => {
    ruleTester.run('no-weak-hash-algorithm', noWeakHashAlgorithm, {
      valid: [
        // `algo` is never declared — nothing to resolve, so nothing to report.
        // (This is what the existing `createHash(algo)` fixtures rely on, and it
        // must keep holding now that identifiers ARE followed.)
        `const signature = crypto.createHash(algo).update(body).digest('hex');`,
        // A const carrying a modern algorithm must not begin reporting.
        `const ALGO = 'sha256'; const signature = crypto.createHash(ALGO).update(token).digest('hex');`,
        // A `let` can be reassigned between the declaration and the call.
        `let algo = 'md5'; algo = negotiate(); const signature = crypto.createHash(algo).update(token).digest('hex');`,
        // A literal that is neither a string nor a number is not an algorithm
        // name. `null` and a regex reach `resolveConstantString` and must come
        // back unresolved rather than throwing or stringifying.
        `const signature = crypto.createHash(null).update(token).digest('hex');`,
        `const signature = crypto.createHash(/md5/).update(token).digest('hex');`,
        // Neither is a call. The argument is not a literal AND not an
        // identifier, so there is nothing to resolve one hop through.
        `const signature = crypto.createHash(pickAlgo()).update(token).digest('hex');`,
        // A const alias bound to a non-string literal: the hop resolves, the
        // value does not.
        `const ALGO = null; const signature = crypto.createHash(ALGO).update(token).digest('hex');`,
        // No visible security use — the default classification still applies to
        // the const-held form, exactly as it does to the inline one.
        `const ALGO = 'md5'; const etag = crypto.createHash(ALGO).update(body).digest('hex');`,
      ],
      invalid: [
        {
          code: `const HASH_ALGORITHM = 'md5';\nconst signature = crypto.createHash(HASH_ALGORITHM).update(token).digest('hex');`,
          errors: [
            {
              messageId: 'weakHashAlgorithm',
              suggestions: [
                {
                  messageId: 'useSha256',
                  output: `const HASH_ALGORITHM = "sha256";\nconst signature = crypto.createHash(HASH_ALGORITHM).update(token).digest('hex');`,
                },
                {
                  messageId: 'useSha512',
                  output: `const HASH_ALGORITHM = "sha512";\nconst signature = crypto.createHash(HASH_ALGORITHM).update(token).digest('hex');`,
                },
                {
                  messageId: 'useSha3',
                  output: `const HASH_ALGORITHM = "sha3-256";\nconst signature = crypto.createHash(HASH_ALGORITHM).update(token).digest('hex');`,
                },
              ],
            },
          ],
        },
        // Backticks spell the same constant as quotes.
        {
          code: `const ALGO = \`sha1\`;\nfunction signRequest(body) { return createHash(ALGO).update(body).digest('hex'); }`,
          errors: [
            {
              messageId: 'weakHashAlgorithm',
              suggestions: [
                {
                  messageId: 'useSha256',
                  output: `const ALGO = "sha256";\nfunction signRequest(body) { return createHash(ALGO).update(body).digest('hex'); }`,
                },
                {
                  messageId: 'useSha512',
                  output: `const ALGO = "sha512";\nfunction signRequest(body) { return createHash(ALGO).update(body).digest('hex'); }`,
                },
                {
                  messageId: 'useSha3',
                  output: `const ALGO = "sha3-256";\nfunction signRequest(body) { return createHash(ALGO).update(body).digest('hex'); }`,
                },
              ],
            },
          ],
        },
      ],
    });
  });
});
