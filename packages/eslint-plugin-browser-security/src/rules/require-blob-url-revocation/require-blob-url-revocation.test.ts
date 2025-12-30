/**
 * Tests for require-blob-url-revocation rule
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { requireBlobUrlRevocation } from './index';
import * as vitest from 'vitest';

RuleTester.afterAll = vitest.afterAll;
RuleTester.it = vitest.it;
RuleTester.itOnly = vitest.it.only;
RuleTester.describe = vitest.describe;

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('require-blob-url-revocation', requireBlobUrlRevocation, {
  valid: [
    // Properly revoked
    {
      code: `
        const url = URL.createObjectURL(blob);
        img.src = url;
        URL.revokeObjectURL(url);
      `,
    },
    // Test files allowed
    {
      code: `const url = URL.createObjectURL(blob);`,
      filename: 'file.test.ts',
    },
    // Not a createObjectURL call
    {
      code: `const url = someOtherFunction(blob);`,
    },
  ],
  invalid: [
    // Missing revocation
    {
      code: `const url = URL.createObjectURL(blob);`,
      errors: [{ messageId: 'missingRevoke' }],
    },
    // Used but not revoked
    {
      code: `
        const blobUrl = URL.createObjectURL(file);
        img.src = blobUrl;
      `,
      errors: [{ messageId: 'missingRevoke' }],
    },
    // Test file with allowInTests: false
    {
      code: `const url = URL.createObjectURL(blob);`,
      filename: 'file.test.ts',
      options: [{ allowInTests: false }],
      errors: [{ messageId: 'missingRevoke' }],
    },
  ],
});
