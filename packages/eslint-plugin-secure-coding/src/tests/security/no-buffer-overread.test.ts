/**
 * Comprehensive tests for no-buffer-overread rule
 * Security: CWE-126 (Buffer Access with Incorrect Length Value)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noBufferOverread } from '../../rules/security/no-buffer-overread';

// Configure RuleTester for Vitest
RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

// Use Flat Config format (ESLint 9+)
const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

describe('no-buffer-overread', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - safe buffer operations', noBufferOverread, {
      valid: [
        // Safe buffer access with bounds checking (if statement provides bounds check)
        {
          code: 'if (index >= 0 && index < buffer.length) { const byte = buffer[index]; }',
        },
        // Safe buffer methods with literal offset
        {
          code: 'const value = buffer.readUInt32LE(0);',
        },
        // Non-buffer operations (array doesn't match buffer pattern)
        {
          code: 'const item = array[index];',
        },
        // Literal indices (non-negative)
        {
          code: 'const firstByte = buffer[0];',
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Unsafe Buffer Access', () => {
    ruleTester.run('invalid - unsafe buffer access patterns', noBufferOverread, {
      valid: [],
      invalid: [
        // buffer[userInput] - 'userInput' contains 'user' and 'input' which are user-controlled keywords
        {
          code: 'const byte = buffer[userInput];',
          errors: [
            {
              messageId: 'userControlledBufferIndex',
            },
          ],
        },
        // buffer[offset] - 'offset' is a user-controlled keyword
        {
          code: 'const value = buffer[offset];',
          errors: [
            {
              messageId: 'userControlledBufferIndex',
            },
          ],
        },
      ],
    });
  });

  describe('Invalid Code - Negative Indices', () => {
    ruleTester.run('invalid - negative buffer indices', noBufferOverread, {
      valid: [],
      invalid: [
        // Literal negative index
        {
          code: 'const byte = buffer[-1];',
          errors: [
            {
              messageId: 'negativeBufferIndex',
            },
          ],
        },
        // Subtraction expression could be negative
        {
          code: 'const value = buffer[userInput - 10];',
          errors: [
            {
              messageId: 'negativeBufferIndex',
            },
          ],
        },
      ],
    });
  });

  describe('Invalid Code - Missing Bounds Checks', () => {
    ruleTester.run('invalid - missing bounds validation', noBufferOverread, {
      valid: [],
      invalid: [
        // userOffset contains 'offset' (user-controlled keyword)
        {
          code: 'buffer.readUInt32LE(userOffset);',
          errors: [
            {
              messageId: 'missingBoundsCheck',
            },
          ],
        },
        // req.query.offset - 'offset' is user-controlled
        {
          code: 'buffer.writeUInt16LE(value, userOffset);',
          errors: [
            {
              messageId: 'missingBoundsCheck',
            },
          ],
        },
      ],
    });
  });

  describe('Invalid Code - Buffer Operations', () => {
    ruleTester.run('invalid - unsafe buffer operations', noBufferOverread, {
      valid: [],
      invalid: [
        // copy with user-controlled offset
        {
          code: 'buffer.copy(targetBuffer, userOffset);',
          errors: [
            {
              messageId: 'missingBoundsCheck',
            },
          ],
        },
        // slice with single user-controlled argument reports 2 errors
        {
          code: 'buffer.slice(userOffset);',
          errors: [
            {
              messageId: 'unsafeBufferSlice',
            },
            {
              messageId: 'missingBoundsCheck',
            },
          ],
        },
      ],
    });
  });

  describe('Valid Code - False Positives Reduced', () => {
    ruleTester.run('valid - false positives reduced', noBufferOverread, {
      valid: [
        // Safe annotations
        {
          code: `
            /** @safe */
            const byte = buffer[userInput];
          `,
        },
        // Safe Math.max/min patterns
        {
          code: `
            const start = Math.max(0, userStart);
            const end = Math.min(buffer.length, userEnd);
            const slice = buffer.slice(start, end);
          `,
        },
        // Literal indices for slice
        {
          code: 'const header = buffer.slice(0, 4);',
        },
        // Non-buffer variable name (doesn't match buffer pattern)
        {
          code: 'const byte = data[userInput];',
        },
      ],
      invalid: [],
    });
  });

  describe('Configuration Options', () => {
    ruleTester.run('config - custom buffer methods', noBufferOverread, {
      valid: [
        // Non-default method name - won't trigger
        {
          code: 'buffer.customRead(userOffset);',
        },
      ],
      invalid: [
        // Custom method in config - now triggers
        {
          code: 'buffer.customRead(userOffset);',
          options: [{ bufferMethods: ['customRead'] }],
          errors: [
            {
              messageId: 'missingBoundsCheck',
            },
          ],
        },
      ],
    });
  });

  describe('Complex Buffer Overread Scenarios', () => {
    ruleTester.run('complex - real-world buffer patterns', noBufferOverread, {
      valid: [],
      invalid: [
        // buffer[userOffset] triggers userControlledBufferIndex
        {
          code: 'const byte = buffer[userOffset]; const value = buffer.readUInt32LE(userOffset);',
          errors: [
            {
              messageId: 'userControlledBufferIndex',
            },
            {
              messageId: 'missingBoundsCheck',
            },
          ],
        },
        // Multiple unsafe accesses
        {
          code: 'buffer.readUInt16LE(userIndex); buffer.readUInt32LE(userOffset);',
          errors: [
            {
              messageId: 'missingBoundsCheck',
            },
            {
              messageId: 'missingBoundsCheck',
            },
          ],
        },
      ],
    });
  });
});
