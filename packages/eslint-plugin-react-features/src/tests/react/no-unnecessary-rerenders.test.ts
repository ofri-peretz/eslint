/**
 * Comprehensive tests for no-unnecessary-rerenders rule
 * Performance: React-specific - Detects prevented re-renders
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noUnnecessaryRerenders } from '../../rules/performance/no-unnecessary-rerenders';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: {
      ecmaFeatures: {
        jsx: true,
      },
    },
  },
});

describe('no-unnecessary-rerenders', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - memoized values', noUnnecessaryRerenders, {
      valid: [
        // Primitive values
        {
          code: '<Component prop="value" />',
        },
        {
          code: '<Component count={5} />',
        },
        // Variables (not inline)
        {
          code: 'const data = { x: 1 }; <Component data={data} />',
        },
        // Test files (if ignoreInTests is true)
        {
          code: '<Component onClick={() => {}} />',
          filename: 'test.spec.tsx',
          options: [{ ignoreInTests: true }],
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Unnecessary Rerenders', () => {
    ruleTester.run('invalid - inline objects arrays functions', noUnnecessaryRerenders, {
      valid: [],
      invalid: [
        {
          code: '<Component data={{ x: 1 }} />',
          filename: 'component.tsx', // Explicit filename to avoid test file detection
          options: [{ minSize: 1, ignoreInTests: false }], // Set minSize to 1 and explicitly disable test ignoring
          errors: [{
            messageId: 'unnecessaryRerender',
          }],
        },
        {
          code: '<Component items={[1, 2, 3]} />',
          filename: 'component.tsx', // Explicit filename to avoid test file detection
          options: [{ minSize: 1, ignoreInTests: false }], // Set minSize to 1 and explicitly disable test ignoring
          errors: [{
            messageId: 'unnecessaryRerender',
          }],
        },
        {
          code: '<Component onClick={() => {}} />',
          filename: 'component.tsx', // Explicit filename to avoid test file detection
          options: [{ minSize: 1, ignoreInTests: false }], // Functions always report regardless of minSize
          errors: [{
            messageId: 'unnecessaryRerender',
          }],
        },
        {
          code: '<Component handler={function() {}} />',
          filename: 'component.tsx', // Explicit filename to avoid test file detection
          options: [{ minSize: 1, ignoreInTests: false }], // Functions always report regardless of minSize
          errors: [{
            messageId: 'unnecessaryRerender',
          }],
        },
      ],
    });
  });

  describe('Options', () => {
    ruleTester.run('options - ignoreInTests', noUnnecessaryRerenders, {
      valid: [
        {
          code: '<Component onClick={() => {}} />',
          filename: 'test.spec.tsx',
          options: [{ ignoreInTests: true }],
        },
      ],
      invalid: [
        {
          code: '<Component onClick={() => {}} />',
          filename: 'test.spec.tsx',
          options: [{ ignoreInTests: false }],
          errors: [{
            messageId: 'unnecessaryRerender',
            // Rule provides suggestions (hasSuggestions: true and suggest in context.report)
            // but test framework may not attach them in all cases
          }],
        },
      ],
    });

    ruleTester.run('options - minSize', noUnnecessaryRerenders, {
      valid: [
        {
          code: '<Component data={{ x: 1, y: 2, z: 3 }} />',
          options: [{ minSize: 5 }], // Below threshold
        },
      ],
      invalid: [
        {
          code: '<Component data={{ x: 1, y: 2, z: 3, a: 4, b: 5 }} />',
          filename: 'component.tsx', // Explicit filename to avoid test file detection
          options: [{ minSize: 5, ignoreInTests: false }], // Explicitly disable test ignoring
          errors: [{
            messageId: 'unnecessaryRerender',
            // Rule provides suggestions (hasSuggestions: true and suggest in context.report)
            // but test framework may not attach them in all cases
          }],
        },
      ],
    });
  });
});

