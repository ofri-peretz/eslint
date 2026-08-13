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
      // An empty tempPaths entry has no segments to anchor against.
      { code: "const p = '/tmp/x'; fs.writeFileSync(p, d);", options: [{ tempPaths: ['/'] }] },
      // A name that resolves to no variable at all (never declared).
      { code: "undeclared = '/tmp/x'; fs.writeFileSync(undeclared, d);" },
    ],
    invalid: [
      // Temp-path literal assigned via AssignmentExpression parent, then
      // written through — the write sink is what makes it a CWE-312 finding.
      {
        code: "let p; p = '/tmp/data';\nfs.writeFileSync(p, data);",
        errors: [{ messageId: 'violationDetected' }],
      },
      // A Windows-style configured temp path still anchors on segments.
      {
        code: "const p = 'C:\\\\Windows\\\\Temp\\\\x'; fs.writeFileSync(p, d);",
        options: [{ tempPaths: ['\\Windows\\Temp'] }],
        errors: [{ messageId: 'violationDetected' }],
      },
    ],
  });
});
