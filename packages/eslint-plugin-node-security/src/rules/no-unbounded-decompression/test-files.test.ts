/**
 * Test and spec files are exempt by default; production files are not.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noUnboundedDecompression } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

const IMPORT = `import { brotliDecompressSync } from "node:zlib";\n`;
const CODE = `${IMPORT}const out = brotliDecompressSync(compressed).toString("utf8");`;

describe('no-unbounded-decompression (test files)', () => {
  ruleTester.run('no-unbounded-decompression', noUnboundedDecompression, {
    valid: [
      {
        // @source dependency-cruiser/dependency-cruiser test/cache/cache.spec.mjs:311 (65ae57fe)
        // @found real-source scan
        name: 'FP: a spec reads back the cache the module under test wrote',
        code: CODE,
        filename: 'test/cache/cache.spec.mjs',
      },
      {
        name: 'a .test.ts file is exempt by default',
        code: CODE,
        filename: 'src/cache.test.ts',
      },
    ],
    invalid: [
      {
        name: 'a production file with the same call still reports',
        code: CODE,
        filename: 'src/cache.ts',
        errors: [{ messageId: 'unboundedDecompression' }],
      },
      {
        name: 'opting out (allowInTests: false) reports in a spec file',
        code: CODE,
        filename: 'test/cache/cache.spec.mjs',
        options: [{ allowInTests: false }],
        errors: [{ messageId: 'unboundedDecompression' }],
      },
      {
        name: 'a path that only contains "test" as a substring is production',
        code: CODE,
        filename: '/Users/me/latest/src/cache.ts',
        errors: [{ messageId: 'unboundedDecompression' }],
      },
    ],
  });
});
