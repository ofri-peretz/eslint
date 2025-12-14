/**
 * @fileoverview Tests for require-mime-type-validation
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { requireMimeTypeValidation } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('require-mime-type-validation', requireMimeTypeValidation, {
  valid: [
    // Multer with fileFilter
    { code: "multer({ fileFilter: validateMime }).single('file')" },
    { code: "multer({ limits: { fileSize: 1024 } }).single('file')" },
    // Non-upload calls
    { code: "const x = 1" },
  ],

  invalid: [
    // Multer without validation
    { code: "multer().single('avatar')", errors: [{ messageId: 'violationDetected' }] },
    { code: "multer().array('photos')", errors: [{ messageId: 'violationDetected' }] },
    // Direct upload call without validation
    { code: "upload(file)", errors: [{ messageId: 'violationDetected' }] },
    { code: "upload()", errors: [{ messageId: 'violationDetected' }] },
  ],
});
