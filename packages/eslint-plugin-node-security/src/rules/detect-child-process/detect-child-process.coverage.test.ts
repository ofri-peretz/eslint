/**
 * Coverage-gap tests for detect-child-process (dual-layer doctrine, Layer 1).
 * Targets the allowlist guard-clause analyzer (hasPrecedingAllowlistValidation):
 * literal includes() arguments, non-guard consequents, non-IfStatement
 * siblings, guard-less ancestor chains, and destructured-require edge shapes.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { detectChildProcess } from './index';

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

describe('detect-child-process coverage gaps', () => {
  ruleTester.run('detect-child-process', detectChildProcess, {
    valid: [
      // Pattern-2 guard with a LITERAL includes() argument → falls back to
      // the generic guard, which accepts identifier / identifier-array args.
      {
        code: [
          "import { execFile } from 'child_process';",
          'function run(file) {',
          "  if (!ALLOWED.includes('cmd')) throw new Error('nope');",
          "  execFile('cmd', [file]);",
          '}',
        ].join('\n'),
      },
      // Non-IfStatement preceding sibling is skipped, then the real guard
      // clause (identifier includes() argument) validates the call.
      {
        code: [
          "import { execFile } from 'child_process';",
          'function run(file) {',
          '  const attempts = 1;',
          "  if (!ALLOWED.includes(file)) throw new Error('nope');",
          "  execFile('cmd', [file]);",
          '}',
        ].join('\n'),
      },
      // Destructured require with a rest element → property loop skips it,
      // so nothing is tracked and the later call is not a child_process hit.
      {
        code: [
          "const { ...cp } = require('child_process');",
          'cp.run(userInput);',
        ].join('\n'),
      },
    ],
    invalid: [
      // Ancestor if uses a LITERAL includes() argument (pattern 1) → no
      // variable is validated → guard rejected in the ancestor walk, and the
      // call is the first statement of its block (callIndex === 0) → report.
      {
        code: [
          "import { execFile } from 'child_process';",
          'function run(file) {',
          "  if (ALLOWED.includes('cmd')) {",
          "    execFile('cmd', [file]);",
          '  }',
          '}',
        ].join('\n'),
        errors: [{ messageId: 'childProcessCommandInjection' }],
      },
      // Pattern-2 shaped test whose consequent is NOT a return/throw guard
      // body → isGuardBody false → sibling guard rejected → report.
      {
        code: [
          "import { execFile } from 'child_process';",
          'function run(file) {',
          "  if (!ALLOWED.includes(file)) { console.log('nope'); }",
          "  execFile('cmd', [file]);",
          '}',
        ].join('\n'),
        errors: [{ messageId: 'childProcessCommandInjection' }],
      },
    ],
  });
});
