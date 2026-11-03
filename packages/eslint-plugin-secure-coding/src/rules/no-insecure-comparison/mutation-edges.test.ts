/**
 * Mutation-survivor kill fixtures (Stryker triage, 2026-11-02).
 *
 * Each case is the input that tells the rule apart from a surviving mutant.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noInsecureComparison } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

const timing = [
  { messageId: 'timingUnsafeComparison' as const, suggestions: 1 },
];
const loose = [{ messageId: 'insecureComparison' as const, suggestions: 1 }];
const SECRET_COMPARISON = 'if (session.token === presented) {}';

describe('no-insecure-comparison (mutation edges)', () => {
  ruleTester.run('no-insecure-comparison', noInsecureComparison, {
    valid: [
      {
        name: 'each binding is typed from its own declaration',
        code: "const n = 5; const s = 'x'; if (s == 'y') {}",
      },
      {
        name: 'only the destructuring key a binding was taken under names it',
        code: 'const { token, id } = session; if (id === presented) {}',
      },
      {
        name: 'a destructured parameter that is not a secret is resolved without error',
        code: 'const check = ({ code }) => code === presented;',
      },
      {
        name: 'a length compared to a variable is a length check',
        code: 'if (token.length === expectedLength) {}',
      },
      {
        name: 'a file under codemods/ is AST tooling',
        filename: 'src/codemods/rename.ts',
        code: SECRET_COMPARISON,
      },
      {
        name: 'a file under codemod/ is AST tooling',
        filename: 'src/codemod/rename.ts',
        code: SECRET_COMPARISON,
      },
      {
        name: 'a *.codemod.ts file is AST tooling',
        filename: 'src/rename.codemod.ts',
        code: SECRET_COMPARISON,
      },
      {
        name: 'a *.codemod.mjs file is AST tooling',
        filename: 'src/rename.codemod.mjs',
        code: SECRET_COMPARISON,
      },
    ],
    invalid: [
      {
        name: 'a test file is checked unless allowInTests is set',
        filename: 'src/auth.test.ts',
        code: SECRET_COMPARISON,
        errors: timing,
      },
      {
        name: 'a binding cycle is not provably a string',
        code: "var a = b, b = a; if (a == 'x') {}",
        errors: loose,
      },
      {
        name: 'an updated binding is not provably a string',
        code: "let s = 'a'; s++; if (s == 'b') {}",
        errors: loose,
      },
      {
        name: 'a three-word constant names the api key in its middle pair',
        code: 'function check(presented) { return presented === SERVICE_API_KEY; }',
        errors: timing,
      },
      // @found Stryker mutation-survivor triage, 2026-11-03
      {
        name: 'FN: a quoted destructuring key names the binding',
        code: "const { 'token': t } = session; if (t === presented) {}",
        errors: timing,
      },
      // @found Stryker mutation-survivor triage, 2026-11-03
      {
        name: 'FN: a destructuring default keeps the key',
        code: "const { token: t = '' } = session; if (t === presented) {}",
        errors: timing,
      },
      {
        name: 'a key inside an array pattern names the binding',
        code: 'const [{ token: t }] = sessions; if (t === presented) {}',
        errors: timing,
      },
      {
        name: 'a key inside a defaulted array element names the binding',
        code: 'const [{ token: t } = {}] = sessions; if (t === presented) {}',
        errors: timing,
      },
      // @found Stryker mutation-survivor triage, 2026-11-03
      {
        name: 'FN: a destructured parameter keeps its key',
        code: 'function verify({ token: t }, presented) { return t === presented; }',
        errors: timing,
      },
      {
        name: 'a dynamic key variable contributes its name',
        code: 'if (req.headers[tokenHeader] === presented) {}',
        errors: timing,
      },
      {
        name: 'a secret in the consequent of a ternary is compared',
        code: 'if ((useA ? session.token : other) === presented) {}',
        errors: timing,
      },
      {
        name: 'a secret in the alternate of a ternary is compared',
        code: 'if ((useA ? other : session.token) === presented) {}',
        errors: timing,
      },
      {
        name: 'a satisfies wrapper is transparent',
        code: 'if ((session.token satisfies string) === presented) {}',
        errors: timing,
      },
      {
        name: 'an interpolated template is not a constant',
        code: 'if (token === `${prefix}-${suffix}`) {}',
        errors: timing,
      },
      {
        name: 'a .ts file whose name only contains codemod is not AST tooling',
        filename: 'src/codemodule.ts',
        code: SECRET_COMPARISON,
        errors: timing,
      },
    ],
  });
});
