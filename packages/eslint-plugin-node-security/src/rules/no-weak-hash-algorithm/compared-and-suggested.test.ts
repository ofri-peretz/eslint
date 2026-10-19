/**
 * no-weak-hash-algorithm — a weak digest COMPARED against a credential, and
 * the `sha256(...)` suggestion when no `sha256` exists.
 *
 * Owner decisions of 2026-10-18 (benchmarks/audits/2026-10-18-fp-fn-quint-stryker.md):
 *
 *   - `if (signature === createHash('md5').update(body).digest('hex'))` is a
 *     security use: the digest is being checked against a signature. Comparing
 *     against a value named signature/token/hmac/mac/digest (or any configured
 *     security-use name) is evidence, the same as storing under one;
 *   - the bare-helper suggestion rewrites `sha1(x)` to `sha256(x)`. When the
 *     file defines `sha1` itself, or imports it, and has no `sha256`, that
 *     rewrite calls a function that does not exist — so no suggestion is
 *     offered at all.
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
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

/** A createHash report, with its three algorithm-argument suggestions. */
const weakArg = (code: string, algorithm: string) => ({
  messageId: 'weakHashAlgorithm' as const,
  suggestions: (
    [
      ['useSha256', 'sha256'],
      ['useSha512', 'sha512'],
      ['useSha3', 'sha3-256'],
    ] as const
  ).map(([messageId, strong]) => ({
    messageId,
    output: code.replace(`'${algorithm}'`, `"${strong}"`),
  })),
});

const SIGNATURE_CHECK = `if (signature === createHash('md5').update(body).digest('hex')) accept();`;
const HEADER_CHECK = `const ok = crypto.createHash('sha1').update(body).digest('hex') !== req.headers['x-hub-signature'];`;
const MAC_CHECK = `if (expectedMac == createHash('md5').update(payload).digest('hex')) accept();`;
const DIGEST_CHECK = `if (createHash('md5').update(body).digest('base64') === this.digest) accept();`;

describe('a weak digest compared against a credential', () => {
  ruleTester.run('comparisons', noWeakHashAlgorithm, {
    valid: [
      {
        name: 'compared against a value with no security name',
        code: `if (cached === createHash('md5').update(body).digest('hex')) skip();`,
      },
      {
        name: 'an ETag comparison is a cache check',
        code: `if (req.headers.etag === createHash('md5').update(body).digest('hex')) notModified();`,
      },
      {
        name: 'ordering a digest against a token is not matching it',
        code: `if (token < createHash('md5').update(body).digest('hex')) swap();`,
      },
      {
        name: 'a relational comparison is not a match against a secret',
        code: `if (token.length < createHash('md5').update(body).digest('hex').length) pad();`,
      },
    ],
    invalid: [
      {
        name: 'signature === createHash(md5)…digest()',
        code: SIGNATURE_CHECK,
        errors: [weakArg(SIGNATURE_CHECK, 'md5')],
      },
      {
        name: 'digest !== a signature header',
        code: HEADER_CHECK,
        errors: [weakArg(HEADER_CHECK, 'sha1')],
      },
      {
        name: 'a loose comparison against a mac',
        code: MAC_CHECK,
        errors: [weakArg(MAC_CHECK, 'md5')],
      },
      {
        name: 'compared against a member named digest',
        code: DIGEST_CHECK,
        errors: [weakArg(DIGEST_CHECK, 'md5')],
      },
      {
        name: 'a bare md5() compared against a token',
        code: `if (md5(body) === token) accept();`,
        errors: [
          {
            messageId: 'weakHashAlgorithm',
            suggestions: [
              {
                messageId: 'useSha256',
                output: `if (sha256(body) === token) accept();`,
              },
            ],
          },
        ],
      },
    ],
  });
});

describe('no suggestion to call a sha256 that is not defined', () => {
  ruleTester.run('suggestion', noWeakHashAlgorithm, {
    valid: [],
    invalid: [
      {
        name: 'a local sha1 helper with no sha256 beside it',
        code: `function sha1(d) { return crypto.createHash('sha1').update(d).digest('hex'); }
const sessionToken = sha1(secret);`,
        errors: [{ messageId: 'weakHashAlgorithm', suggestions: [] }],
      },
      {
        name: 'sha1 imported alone from crypto-hash',
        code: `import { sha1 } from 'crypto-hash';
const sessionToken = await sha1(secret);`,
        errors: [{ messageId: 'weakHashAlgorithm', suggestions: [] }],
      },
      {
        name: 'an ambient sha1 declared by a global comment keeps the suggestion',
        code: `/* global sha1 */
const sessionToken = sha1(secret);`,
        errors: [
          {
            messageId: 'weakHashAlgorithm',
            suggestions: [
              {
                messageId: 'useSha256',
                output: `/* global sha1 */
const sessionToken = sha256(secret);`,
              },
            ],
          },
        ],
      },
      {
        name: 'sha256 imported beside it: the rewrite is offered',
        code: `import { sha1, sha256 } from 'crypto-hash';
const sessionToken = await sha1(secret);`,
        errors: [
          {
            messageId: 'weakHashAlgorithm',
            suggestions: [
              {
                messageId: 'useSha256',
                output: `import { sha1, sha256 } from 'crypto-hash';
const sessionToken = await sha256(secret);`,
              },
            ],
          },
        ],
      },
    ],
  });
});
