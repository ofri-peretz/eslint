/**
 * @fileoverview Tests for no-data-in-temp-storage
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { noDataInTempStorage } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('no-data-in-temp-storage', noDataInTempStorage, {
  valid: [
    // Secure storage locations
    { code: "fs.writeFileSync('/app/data/file.txt', data)" },
    { code: "fs.writeFile('/secure/path/file.json', data, callback)" },
    // Non-path literals
    { code: "console.log('temp data')" },
    { code: "const x = 1" },
  ],

  invalid: [
    // Temp path writes
    { code: "fs.writeFileSync('/tmp/secrets.json', data)", errors: [{ messageId: 'violationDetected' }] },
    { code: "fs.writeFile('/var/tmp/auth.txt', data, cb)", errors: [{ messageId: 'violationDetected' }] },
    // Temp path variables
    { code: "const path = '/tmp/sensitive.txt'", errors: [{ messageId: 'violationDetected' }] },
    { code: "let file = '/var/tmp/data.json'", errors: [{ messageId: 'violationDetected' }] },
  ],
});
