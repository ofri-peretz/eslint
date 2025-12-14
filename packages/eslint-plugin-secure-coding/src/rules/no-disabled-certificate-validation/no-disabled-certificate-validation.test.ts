/**
 * @fileoverview Tests for no-disabled-certificate-validation
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { noDisabledCertificateValidation } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('no-disabled-certificate-validation', noDisabledCertificateValidation, {
  valid: [
    // Proper SSL configuration
    { code: "const options = { rejectUnauthorized: true }" },
    { code: "const config = { strictSSL: true }" },
    { code: "const settings = { verify: true }" },
    // Non-SSL code
    { code: "const x = 1" },
  ],

  invalid: [
    // Disabled certificate validation
    { code: "const options = { rejectUnauthorized: false }", errors: [{ messageId: 'violationDetected' }] },
    { code: "https.request({ strictSSL: false })", errors: [{ messageId: 'violationDetected' }] },
    { code: "const config = { verify: false }", errors: [{ messageId: 'violationDetected' }] },
    // Environment variable disable
    { code: "process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'", errors: [{ messageId: 'violationDetected' }] },
  ],
});
