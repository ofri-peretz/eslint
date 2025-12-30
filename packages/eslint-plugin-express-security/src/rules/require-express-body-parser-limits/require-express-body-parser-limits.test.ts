import { RuleTester } from '@typescript-eslint/rule-tester';
import { requireExpressBodyParserLimits } from './index';

const ruleTester = new RuleTester();

ruleTester.run('require-express-body-parser-limits', requireExpressBodyParserLimits, {
  valid: [
    // With explicit limit
    {
      code: `express.json({ limit: '100kb' })`,
    },
    {
      code: `express.urlencoded({ limit: '10kb', extended: true })`,
    },
    {
      code: `express.raw({ limit: '1mb' })`,
    },
    {
      code: `express.text({ limit: '50kb' })`,
    },
    // bodyParser pattern
    {
      code: `bodyParser.json({ limit: '100kb' })`,
    },
    // Reasonable limits
    {
      code: `express.json({ limit: '1mb' })`,
    },
    {
      code: `express.json({ limit: '5mb' })`,
    },
    // Non-body parser calls - should be ignored
    {
      code: `express.static('public')`,
    },
    {
      code: `express.Router()`,
    },
    // Test file with allowInTests
    {
      code: `express.json()`,
      filename: 'test.spec.ts',
      options: [{ allowInTests: true }],
    },
  ],
  invalid: [
    // No options - missing limit
    {
      code: `express.json()`,
      errors: [{ messageId: 'missingLimit', suggestions: [{ messageId: 'addLimit', output: `express.json({ limit: '100kb' })` }] }],
    },
    {
      code: `express.urlencoded()`,
      errors: [{ messageId: 'missingLimit', suggestions: [{ messageId: 'addLimit', output: `express.urlencoded({ limit: '100kb' })` }] }],
    },
    {
      code: `express.raw()`,
      errors: [{ messageId: 'missingLimit', suggestions: [{ messageId: 'addLimit', output: `express.raw({ limit: '100kb' })` }] }],
    },
    {
      code: `express.text()`,
      errors: [{ messageId: 'missingLimit', suggestions: [{ messageId: 'addLimit', output: `express.text({ limit: '100kb' })` }] }],
    },
    // bodyParser pattern
    {
      code: `bodyParser.json()`,
      errors: [{ messageId: 'missingLimit', suggestions: [{ messageId: 'addLimit', output: `bodyParser.json({ limit: '100kb' })` }] }],
    },
    // Options but no limit
    {
      code: `express.json({ extended: true })`,
      errors: [{ messageId: 'missingLimit', suggestions: [{ messageId: 'addLimit', output: `express.json({ extended: true, limit: '100kb' })` }] }],
    },
    {
      code: `express.urlencoded({ extended: true })`,
      errors: [{ messageId: 'missingLimit', suggestions: [{ messageId: 'addLimit', output: `express.urlencoded({ extended: true, limit: '100kb' })` }] }],
    },
    // Excessive limits
    {
      code: `express.json({ limit: '100mb' })`,
      errors: [{ messageId: 'excessiveLimit' }],
    },
    {
      code: `express.json({ limit: '50mb' })`,
      errors: [{ messageId: 'excessiveLimit' }],
    },
    {
      code: `express.json({ limit: '1gb' })`,
      errors: [{ messageId: 'excessiveLimit' }],
    },
    // Test file without allowInTests should still error
    {
      code: `express.json()`,
      filename: 'app.spec.ts',
      errors: [{ messageId: 'missingLimit', suggestions: [{ messageId: 'addLimit', output: `express.json({ limit: '100kb' })` }] }],
    },
  ],
});

