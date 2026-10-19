/**
 * Mutation-survivor kill fixtures (Stryker triage, 2026-10-19).
 *
 * Each case is the input that tells the rule apart from a surviving mutant.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { requireMimeTypeValidation } from './index';

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

const MULTER = "import multer from 'multer';\n";

ruleTester.run(
  'require-mime-type-validation (mutation edges)',
  requireMimeTypeValidation,
  {
    valid: [
      {
        name: 'fetch without a body is not an upload',
        code: "function f(input) { const file = input.files[0]; return fetch('/upload', { method: 'POST', headers: {} }); }",
      },
      {
        name: 'append with one argument is not a form-data upload',
        code: 'function f(input) { const file = input.files[0]; const fd = new FormData(); fd.append(file); }',
      },
      {
        name: 'reading selected files without an upload sink',
        code: 'function f(input) { const file = input.files[0]; console.log(file.name); }',
      },
      {
        name: 'a body passed to something other than fetch',
        code: "function f(input) { const file = input.files[0]; return upload('/u', { body: file }); }",
      },
      {
        name: 'a string starting with a slash is not a media type',
        code: "if (file.type.includes('/svg+xml')) up(file);",
      },
      // @found Stryker mutation-survivor triage, 2026-10-19
      {
        name: 'FP: a fileFilter in options bound to a name first',
        code: `${MULTER}const opts = { dest: 'uploads/', fileFilter: checkMime };\nmulter(opts).single('file');`,
      },
      // @found Stryker mutation-survivor triage, 2026-10-19
      {
        name: 'FP: a quoted fileFilter key is the same option',
        code: `${MULTER}multer({ 'fileFilter': checkMime }).single('file');`,
      },
    ],
    invalid: [
      // @found Stryker mutation-survivor triage, 2026-10-19
      {
        name: 'FN: a quoted body key is the same fetch body',
        code: "function f(input) { const file = input.files[0]; return fetch('/upload', { method: 'POST', 'body': file }); }",
        errors: [{ messageId: 'missingMimeValidation' }],
      },
      {
        name: 'fetch with a body of a selected file and no type check',
        code: "function f(input) { const file = input.files[0]; return fetch('/upload', { method: 'POST', body: file }); }",
        errors: [{ messageId: 'missingMimeValidation' }],
      },
      {
        name: 'a prefix test with a position argument after the media type',
        code: "if (file.type.startsWith('image/', 0)) up(file);",
        errors: [{ messageId: 'prefixMimeCheck' }],
      },
      {
        name: 'options bound to a name without a fileFilter',
        code: `${MULTER}const opts = { dest: 'uploads/' };\nmulter(opts).single('file');`,
        errors: [{ messageId: 'violationDetected' }],
      },
      // @found Stryker mutation-survivor triage, 2026-10-19
      {
        name: 'FN: a template-literal media-type prefix is still a prefix test',
        code: 'if (file.type.startsWith(`image/`)) upload(file);',
        errors: [{ messageId: 'prefixMimeCheck' }],
      },
    ],
  },
);
