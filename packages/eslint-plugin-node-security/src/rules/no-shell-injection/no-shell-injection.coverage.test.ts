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
        code: 'exec(userInput + " -la");',
        errors: [{ messageId: 'shellInjection' }],
      },
      // Identifier + TemplateLiteral → only the RIGHT operand matches (template)
      {
        code: 'exec(userInput + `tail`);',
        errors: [{ messageId: 'shellInjection' }],
      },
    ],
  });
});
