/**
 * Coverage-gap tests for no-data-in-temp-storage (dual-layer doctrine, Layer 1).
 * Targets: ignoreFiles early return (both callback outcomes), non-literal fs
 * path arguments, assignment-expression temp-path literals.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noDataInTempStorage } from './index';

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

describe('no-data-in-temp-storage coverage gaps', () => {
  ruleTester.run('no-data-in-temp-storage', noDataInTempStorage, {
    valid: [
      // ignoreFiles pattern matches the filename → whole rule disabled,
      // even though the code contains a temp-path literal declaration.
      {
        code: "const p = '/tmp/cache';",
        options: [{ ignoreFiles: ['generated'] }],
        filename: '/proj/generated.ts',
      },
      // ignoreFiles present but does NOT match → callback evaluates false
      {
        code: "const p = 'safe-path';",
        options: [{ ignoreFiles: ['generated'] }],
        filename: '/proj/app.ts',
      },
      // Non-literal fs path argument → pathArg literal check falls through
      { code: 'fs.writeFileSync(pathVar, data);' },
      // Zero-argument fs call → pathArg undefined
      { code: 'fs.writeFileSync();' },
    ],
    invalid: [
      // Temp-path literal assigned via AssignmentExpression parent
      {
        code: "let p; p = '/tmp/data';",
        errors: [{ messageId: 'violationDetected' }],
      },
    ],
  });
});
