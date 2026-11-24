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
 * const hashOf = (alg: HashedAlgorithm) => \`sha\${alg.slice(2)}\` as 'sha256' | 'sha384' | 'sha512';
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
        name: 'the argument checked with satisfies against a union of literals',
        code: `
          import crypto from 'node:crypto';
          crypto.createHash(name satisfies 'sha256' | 'sha384');
        `,
      },
      {
        name: 'a cast of a choice between literals',
        code: `
          import crypto from 'node:crypto';
          const hashOf = (bits: 256 | 512) => (bits === 512 ? \`sha\${512}\` : 'sha256') as 'sha256' | 'sha512';
          crypto.createHash(hashOf(n));
        `,
      },
      {
        name: 'a cast of a closed-typed parameter',
        code: `
          import crypto from 'node:crypto';
          export function digest(alg: 'sha256' | 'sha384', data: Buffer) {
            return crypto.createHash(alg as 'sha256' | 'sha384').update(data).digest();
          }
        `,
      },
      {
        name: 'a const function expression with a literal-union return type',
        code: `
          import crypto from 'node:crypto';
          const hashFor = function (): 'sha256' | 'sha512' { return 'sha256'; };
          crypto.createHash(hashFor());
        `,
      },
      {
        name: 'a declared-return helper that maps through literals and as const',
        code: `
          import crypto from 'node:crypto';
          const HASHES = { short: 'sha256', long: 'sha512' } as const;
          function hashFor(long: boolean): 'sha256' | 'sha512' {
            const choice = long ? HASHES.long : HASHES.short;
            return choice;
          }
          crypto.createHash(hashFor(flag));
        `,
      },
      {
        name: 'a declared-return helper whose cast is of a literal',
        code: `
          import crypto from 'node:crypto';
          function hashFor(): 'sha256' | 'sha512' { return 'sha256' as 'sha256'; }
          crypto.createHash(hashFor());
        `,
      },
      {
        name: 'a declared-return helper with a nested callback keeps its own trust',
        code: `
          import crypto from 'node:crypto';
          function hashFor(list: string[]): 'sha256' | 'sha512' {
            list.forEach((x) => use(x as 'a'));
            return 'sha512';
          }
          crypto.createHash(hashFor(xs));
        `,
      },
      {
        name: 'a declared-return helper that maps through an as const table in its body',
        code: `
          import crypto from 'node:crypto';
          function hashFor(long: boolean): 'sha256' | 'sha512' {
            const HASHES = { short: 'sha256', long: 'sha512' } as const;
            return long ? HASHES.long : HASHES.short;
          }
          crypto.createHash(hashFor(flag));
        `,
      },
      {
        name: 'an angle-bracket cast of a closed-typed parameter',
        code: `
          import crypto from 'node:crypto';
          export function digest(alg: 'sha256' | 'sha384') {
            return crypto.createHash(<'sha256' | 'sha384'>alg);
          }
        `,
      },
      {
        name: 'a declared-return helper with a nested function declaration keeps its own trust',
        code: `
          import crypto from 'node:crypto';
          function hashFor(x: string): 'sha256' | 'sha512' {
            function inner() { return x as 'a'; }
            use(inner);
            return 'sha512';
          }
          crypto.createHash(hashFor(xs));
        `,
      },
      {
        name: 'a declared-return helper with a nested function expression keeps its own trust',
        code: `
          import crypto from 'node:crypto';
          function hashFor(list: string[]): 'sha256' | 'sha512' {
            list.forEach(function (x) { use(x as 'a'); });
            return 'sha512';
          }
          crypto.createHash(hashFor(xs));
        `,
      },
    ],
    invalid: [
      {
        name: 'an angle-bracket cast of request data is erased at runtime',
        code: `
          import crypto from 'node:crypto';
          crypto.createHash(<'sha256' | 'sha512'>req.query.algorithm);
        `,
        errors: dynamic,
      },
      {
        name: 'an arrow with a block body and no return type is not trusted',
        code: `
          import crypto from 'node:crypto';
          const pick = (value: string) => { return value as 'sha256' | 'sha512'; };
          crypto.createHash(pick(req.query.algorithm));
        `,
        errors: dynamic,
      },
      {
        name: 'a method argument that is a closed parameter, not a literal, is not closed',
        code: `
          import crypto from 'node:crypto';
          export function d(alg: 'HS256' | 'HS512', prefix: 'HS' | 'hs') {
            return crypto.createHash(\`sha\${alg.replace(prefix, '')}\` as 'sha256' | 'sha512');
          }
        `,
        errors: dynamic,
      },
      {
        name: 'satisfies a numeric literal is not a closed set of names',
        code: `
          import crypto from 'node:crypto';
          crypto.createHash(name satisfies 256);
        `,
        errors: dynamic,
      },
      {
        name: 'satisfies a union that admits string is not closed',
        code: `
          import crypto from 'node:crypto';
          crypto.createHash(name satisfies 'sha256' | string);
        `,
        errors: dynamic,
      },
      {
        name: 'a closed-typed parameter redeclared with var is not closed',
        code: `
          import crypto from 'node:crypto';
          export function d(alg: 'sha256' | 'sha384') {
            var alg;
            return crypto.createHash(alg as 'sha256' | 'sha384');
          }
        `,
        errors: dynamic,
      },
      {
        name: 'an ambient declaration is not a parameter the compiler checks at the call',
        code: `
          import crypto from 'node:crypto';
          declare const alg: 'sha256' | 'sha384';
          crypto.createHash(alg as 'sha256' | 'sha384');
        `,
        errors: dynamic,
      },
      {
        name: 'a cast of an untyped parameter is not closed',
        code: `
          import crypto from 'node:crypto';
          export function d(alg) {
            return crypto.createHash(alg as 'sha256' | 'sha384');
          }
        `,
        errors: dynamic,
      },
      {
        name: 'a closed-typed parameter written in the body is not closed',
        code: `
          import crypto from 'node:crypto';
          export function d(alg: 'sha256' | 'sha384', next: string) {
            alg = next as 'sha256';
            return crypto.createHash(alg as 'sha256' | 'sha384');
          }
        `,
        errors: dynamic,
      },
      {
        name: 'a template with one open part is not closed',
        code: `
          import crypto from 'node:crypto';
          export function d(alg: 'HS256' | 'HS512', suffix: string) {
            return crypto.createHash(\`sha\${alg.slice(2)}\${suffix}\` as 'sha256' | 'sha512');
          }
        `,
        errors: dynamic,
      },
      {
        name: 'a choice with one open branch is not closed',
        code: `
          import crypto from 'node:crypto';
          crypto.createHash((fast ? 'sha256' : req.query.alg) as 'sha256' | 'sha512');
        `,
        errors: dynamic,
      },
      {
        name: 'a call to a bare function inside the cast is not closed',
        code: `
          import crypto from 'node:crypto';
          crypto.createHash(\`sha\${pick(2)}\` as 'sha256' | 'sha512');
        `,
        errors: dynamic,
      },
      {
        name: 'a method call with one non-literal argument is not closed',
        code: `
          import crypto from 'node:crypto';
          export function d(alg: 'HS256' | 'HS512', n: number) {
            return crypto.createHash(\`sha\${alg.slice(2, n)}\` as 'sha256' | 'sha512');
          }
        `,
        errors: dynamic,
      },
      {
        name: 'a method call whose argument is a parameter, not a literal, is not closed',
        code: `
          import crypto from 'node:crypto';
          export function d(alg: 'HS256' | 'HS512', from: 2 | 3) {
            return crypto.createHash(\`sha\${alg.slice(from)}\` as 'sha256' | 'sha512');
          }
        `,
        errors: dynamic,
      },
      {
        name: 'a helper bound with let can be reassigned',
        code: `
          import crypto from 'node:crypto';
          let hashOf = (alg: 'HS256' | 'HS512') => \`sha\${alg.slice(2)}\` as 'sha256' | 'sha512';
          crypto.createHash(hashOf(req.query.alg));
        `,
        errors: dynamic,
      },
      {
        name: 'a helper bound with var can be reassigned',
        code: `
          import crypto from 'node:crypto';
          var hashOf = (alg: 'HS256' | 'HS512') => \`sha\${alg.slice(2)}\` as 'sha256' | 'sha512';
          crypto.createHash(hashOf(req.query.alg));
        `,
        errors: dynamic,
      },
      {
        name: 'a helper destructured from an object is not a known function',
        code: `
          import crypto from 'node:crypto';
          const { hashOf } = { hashOf: (): 'sha256' => 'sha256' };
          crypto.createHash(hashOf());
        `,
        errors: dynamic,
      },
      {
        name: 'a declared-return helper that asserts an open parameter still reports',
        code: `
          import crypto from 'node:crypto';
          function pick(value: string): 'sha256' | 'sha512' {
            return value as 'sha256' | 'sha512';
          }
          crypto.createHash(pick(req.query.algorithm));
        `,
        errors: dynamic,
      },
      {
        name: 'a declared-return helper that asserts with angle brackets still reports',
        code: `
          import crypto from 'node:crypto';
          const pick = function (value: string): 'sha256' | 'sha512' {
            const v = <'sha256'>value;
            return v;
          };
          crypto.createHash(pick(req.query.algorithm));
        `,
        errors: dynamic,
      },
      {
        name: 'satisfies over an unchecked cast of request data still reports',
        code: `
          import crypto from 'node:crypto';
          crypto.createHash(
            (req.query.algorithm as 'sha256' | 'sha512') satisfies 'sha256' | 'sha512',
          );
        `,
        errors: dynamic,
      },
      {
        name: 'a cast of request data to a closed union is erased at runtime',
        code: `
          import crypto from 'node:crypto';
          crypto.createHash(req.query.algorithm as 'sha256' | 'sha512');
        `,
        errors: dynamic,
      },
      {
        name: 'a cast of an unknown name to a closed union proves nothing',
        code: `
          import crypto from 'node:crypto';
          crypto.createHash(name as 'sha256' | 'sha384');
        `,
        errors: dynamic,
      },
      {
        name: 'a helper whose cast body reads an open parameter still reports',
        code: `
          import crypto from 'node:crypto';
          const hashOf = (alg: string) => \`sha\${alg.slice(2)}\` as 'sha256' | 'sha512';
          crypto.createHash(hashOf(req.query.alg));
        `,
        errors: dynamic,
      },
      {
        name: 'a closed-typed parameter that is reassigned is not closed',
        code: `
          import crypto from 'node:crypto';
          const hashOf = (alg: 'HS256' | 'HS512') => { alg = req.query.alg; return 0; };
          const pick = (alg: 'HS256' | 'HS512') => (alg = req.query.alg, alg) as 'sha256';
          crypto.createHash(pick(x));
        `,
        errors: dynamic,
      },
      {
        name: 'a callback parameter is not the function that declares it',
        code: `
          import crypto from 'node:crypto';
          function build(pick: () => string): 'sha256' {
            crypto.createHash(pick());
            return 'sha256';
          }
          build(() => req.query.algorithm);
        `,
        errors: dynamic,
      },
      {
        name: 'a cast of a global name is not closed',
        code: `
          import crypto from 'node:crypto';
          const hashOf = () => \`sha\${globalBits}\` as 'sha256';
          crypto.createHash(hashOf());
        `,
        errors: dynamic,
      },
      {
        name: 'a cast of a name declared twice is not closed',
        code: `
          import crypto from 'node:crypto';
          var bits = 256; var bits = 1;
          crypto.createHash(\`sha\${bits}\` as 'sha256');
        `,
        errors: dynamic,
      },
      {
        name: 'a cast of a method call with a non-literal argument is not closed',
        code: `
          import crypto from 'node:crypto';
          const hashOf = (alg: 'HS256') => \`sha\${alg.slice(n)}\` as 'sha256';
          crypto.createHash(hashOf('HS256'));
        `,
        errors: dynamic,
      },
      {
        name: 'a cast of a boolean is not a closed string',
        code: `
          import crypto from 'node:crypto';
          crypto.createHash(\`sha\${true}\` as 'sha256');
        `,
        errors: dynamic,
      },
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
      {
        name: 'a const bound to a call result is not a known helper',
        code: `
          import crypto from 'node:crypto';
          const pick = makePicker();
          crypto.createHash(pick(x));
        `,
        errors: dynamic,
      },
      {
        name: 'a helper declared nowhere in the file still reports',
        code: `
          import crypto from 'node:crypto';
          crypto.createHash(globalPick(x));
        `,
        errors: dynamic,
      },
      {
        name: 'a method call is not a same-file helper',
        code: `
          import crypto from 'node:crypto';
          crypto.createHash(this.pick(x));
        `,
        errors: dynamic,
      },
      {
        name: 'a helper declared twice is not trusted',
        code: `
          import crypto from 'node:crypto';
          function pick(): 'sha256' { return 'sha256'; }
          function pick(a) { return a; }
          crypto.createHash(pick(x));
        `,
        errors: dynamic,
      },
    ],
  });
});
