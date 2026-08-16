/**
 * Coverage-gap tests for no-shell-injection (dual-layer doctrine, Layer 1).
 * Targets: right-operand Literal/TemplateLiteral concat detection, computed
 * member callees, zero-arg and spread-arg calls.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noShellInjection } from './index';

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

describe('no-shell-injection coverage gaps', () => {
  ruleTester.run('no-shell-injection', noShellInjection, {
    valid: [
      // Computed member callee → property is not an Identifier, fnName stays null
      { code: "cp['exec'](cmd + ' -la');" },
      // No arguments → firstArg undefined guard
      { code: 'exec();' },
      // Spread first argument → SpreadElement guard
      { code: 'exec(...args);' },
    ],
    invalid: [
      // Identifier + Literal → only the RIGHT operand matches (Literal)
      {
        code: 'import { exec } from "node:child_process";\nexec(userInput + " -la");',
        errors: [{ messageId: 'shellInjection' }],
      },
      // Identifier + TemplateLiteral → only the RIGHT operand matches (template)
      {
        code: 'import { exec } from "node:child_process";\nexec(userInput + `tail`);',
        errors: [{ messageId: 'shellInjection' }],
      },
    ],
  });
});

/**
 * Branch coverage for the two early returns AFTER the module-evidence gate.
 *
 * Both were reached incidentally by fixtures that imported nothing at all.
 * Once the rule required a resolved child_process binding, those fixtures
 * stopped reaching the gate — so the branches went uncovered, which is the
 * honest signal that the old cases were never exercising what they appeared to.
 */
ruleTester.run('no-shell-injection-post-gate-branches', noShellInjection, {
  valid: [
    // Spread argument: nothing to inspect as a first arg.
    'import { exec } from "node:child_process"; exec(...parts);',
    // No arguments at all.
    'import { exec } from "node:child_process"; exec();',
    // Every interpolated part folds to a literal written in this file.
    'import { execSync } from "node:child_process"; const dir = "/srv"; execSync(`ls ${dir}`);',
  ],
  invalid: [],
});
