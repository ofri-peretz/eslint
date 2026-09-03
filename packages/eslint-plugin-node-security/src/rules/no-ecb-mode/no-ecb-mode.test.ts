/**
 * Tests for no-ecb-mode rule
 * CWE-327: ECB mode leaks data patterns
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noEcbMode } from './index';

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

describe('no-ecb-mode', () => {
  ruleTester.run('no-ecb-mode', noEcbMode, {
    valid: [
      { name: 'GCM', code: 'crypto.createCipheriv("aes-256-gcm", key, iv);' },
      { code: 'crypto.createCipheriv("aes-256-cbc", key, iv);' },
      { code: 'crypto.createCipheriv("aes-256-ctr", key, iv);' },
      { code: 'crypto.createCipheriv(algorithm, key, iv);' },
      { code: 'createCipheriv("aes-256-gcm", key, iv);' },
    ],
    invalid: [
      {
        name: 'ECB leaks structure — identical blocks encrypt identically',
        code: 'crypto.createCipheriv("aes-256-ecb", key, iv);',
        errors: [{ messageId: 'ecbMode', suggestions: [
          { messageId: 'useGcm', output: 'crypto.createCipheriv("aes-256-gcm", key, iv);' },
          { messageId: 'useCbc', output: 'crypto.createCipheriv("aes-256-cbc", key, iv);' },
        ] }],
      },
      {
        code: 'crypto.createCipheriv("aes-128-ecb", key, iv);',
        errors: [{ messageId: 'ecbMode', suggestions: [
          { messageId: 'useGcm', output: 'crypto.createCipheriv("aes-128-gcm", key, iv);' },
          { messageId: 'useCbc', output: 'crypto.createCipheriv("aes-128-cbc", key, iv);' },
        ] }],
      },
      {
        code: 'crypto.createDecipheriv("aes-256-ecb", key, iv);',
        errors: [{ messageId: 'ecbMode', suggestions: [
          { messageId: 'useGcm', output: 'crypto.createDecipheriv("aes-256-gcm", key, iv);' },
          { messageId: 'useCbc', output: 'crypto.createDecipheriv("aes-256-cbc", key, iv);' },
        ] }],
      },
      {
        code: 'createCipheriv("aes-256-ecb", key, iv);',
        errors: [{ messageId: 'ecbMode', suggestions: [
          { messageId: 'useGcm', output: 'createCipheriv("aes-256-gcm", key, iv);' },
          { messageId: 'useCbc', output: 'createCipheriv("aes-256-cbc", key, iv);' },
        ] }],
      },
    ],
  });

  /**
   * FN lock — the mode name held in a `const`.
   *
   * Hoisting `'aes-256-ecb'` to a module constant is ordinary style, and until
   * `utils/const-value` existed it silenced this rule completely: the check was
   * `algorithmArg.type === 'Literal'` and an `Identifier` fell straight through.
   * Every case below is QUIET on the pre-fix rule.
   *
   * The suggestion rewrites the DECLARATION, not the use site — replacing
   * `MODE` with `"aes-256-gcm"` at the call would leave `const MODE =
   * 'aes-256-ecb'` in the file, still wrong and now unused.
   */
  ruleTester.run('no-ecb-mode — algorithm held in a const', noEcbMode, {
    valid: [
      // A `let` can be reassigned between the declaration and the call, so its
      // initializer proves nothing about the value that arrives. Unresolved,
      // not safe — and unresolved stays quiet by design.
      { code: 'let mode = "aes-256-ecb"; mode = pickMode(); crypto.createCipheriv(mode, key, iv);' },
      // A const holding a safe mode must not start reporting.
      { code: 'const MODE = "aes-256-gcm"; crypto.createCipheriv(MODE, key, iv);' },
      // Two definitions — no single provenance to read.
      { code: 'var MODE = "aes-256-ecb"; var MODE = "aes-256-gcm"; crypto.createCipheriv(MODE, key, iv);' },
    ],
    invalid: [
      {
        code: 'const MODE = "aes-256-ecb"; crypto.createCipheriv(MODE, key, iv);',
        errors: [{ messageId: 'ecbMode', suggestions: [
          { messageId: 'useGcm', output: 'const MODE = "aes-256-gcm"; crypto.createCipheriv(MODE, key, iv);' },
          { messageId: 'useCbc', output: 'const MODE = "aes-256-cbc"; crypto.createCipheriv(MODE, key, iv);' },
        ] }],
      },
      // Backticks spell the same constant as quotes.
      {
        code: 'const MODE = `aes-128-ecb`; crypto.createDecipheriv(MODE, key, iv);',
        errors: [{ messageId: 'ecbMode', suggestions: [
          { messageId: 'useGcm', output: 'const MODE = "aes-128-gcm"; crypto.createDecipheriv(MODE, key, iv);' },
          { messageId: 'useCbc', output: 'const MODE = "aes-128-cbc"; crypto.createDecipheriv(MODE, key, iv);' },
        ] }],
      },
      // An inner `const` shadows an outer one; scope analysis, not a name map.
      {
        code: 'const MODE = "aes-256-gcm"; function enc() { const MODE = "aes-256-ecb"; return createCipheriv(MODE, key, iv); }',
        errors: [{ messageId: 'ecbMode', suggestions: [
          { messageId: 'useGcm', output: 'const MODE = "aes-256-gcm"; function enc() { const MODE = "aes-256-gcm"; return createCipheriv(MODE, key, iv); }' },
          { messageId: 'useCbc', output: 'const MODE = "aes-256-gcm"; function enc() { const MODE = "aes-256-cbc"; return createCipheriv(MODE, key, iv); }' },
        ] }],
      },
    ],
  });
});
