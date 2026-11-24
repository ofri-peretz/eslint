/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License.
 */

/**
 * An algorithm whose type is a union of string literals the author wrote is an allowlist.
 *
 * `nestjs/authentication` `lib/jwt/jws.util.ts` maps a JWS `alg` to its hash with
 *
 * ```ts
 * const hashOf = (alg: HashedAlgorithm) => `sha${alg.slice(2)}` as 'sha256' | 'sha384' | 'sha512';
 * ```
 *
 * and calls `createHmac(hashOf(alg), key)` inside `case 'HS256': case 'HS384': case 'HS512':`.
 * The rule reported both calls. The value can only be one of three names written in that
 * file, which is the allowlist the rule's own fix text asks for. A cast to a wider type
 * (`as string`) or a helper with no closed return still reports.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noDynamicAlgorithmSelection } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

const dynamic = [{ messageId: 'dynamicAlgorithm' as const }];

describe('no-dynamic-algorithm-selection — a closed literal type is an allowlist', () => {
  ruleTester.run('closed-literal-type', noDynamicAlgorithmSelection, {
    valid: [
      {
        // @source nestjs/authentication lib/jwt/jws.util.ts:36, :259
        // @found real-source scan
        name: 'FP: a local helper whose body is cast to a union of literal algorithm names',
        code: `
          import { createHmac } from 'node:crypto';
          const hashOf = (alg: 'HS256' | 'HS384' | 'HS512') => \`sha\${alg.slice(2)}\` as 'sha256' | 'sha384' | 'sha512';
          export function sign(alg: 'HS256' | 'HS384' | 'HS512', key: Buffer, data: Buffer) {
            return createHmac(hashOf(alg), key).update(data).digest();
          }
        `,
      },
      {
        name: 'a local function declaration with a literal-union return type',
        code: `
          import crypto from 'node:crypto';
          function hashFor(bits: number): 'sha256' | 'sha512' { return bits > 256 ? 'sha512' : 'sha256'; }
          crypto.createHash(hashFor(n));
        `,
      },
      {
        name: 'the argument itself cast to a union of literals',
        code: `
          import crypto from 'node:crypto';
          crypto.createHash(name as 'sha256' | 'sha384');
        `,
      },
    ],
    invalid: [
      {
        name: 'a cast to string is not a closed set',
        code: `
          import crypto from 'node:crypto';
          crypto.createHash(req.query.algo as string);
        `,
        errors: dynamic,
      },
      {
        name: 'a helper with no closed return type still reports',
        code: `
          import crypto from 'node:crypto';
          const pick = (a: string) => a.toLowerCase();
          crypto.createHash(pick(req.query.algo));
        `,
        errors: dynamic,
      },
      {
        name: 'a union that admits string is not closed',
        code: `
          import crypto from 'node:crypto';
          crypto.createHash(name as 'sha256' | string);
        `,
        errors: dynamic,
      },
      {
        name: 'a helper that is reassigned is not trusted',
        code: `
          import crypto from 'node:crypto';
          let hashOf = (a: string) => a as 'sha256';
          hashOf = (a: string) => a as any;
          crypto.createHash(hashOf(x));
        `,
        errors: dynamic,
      },
    ],
  });
});
