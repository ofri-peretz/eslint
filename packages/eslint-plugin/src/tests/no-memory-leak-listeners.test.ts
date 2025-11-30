/**
 * Comprehensive tests for no-memory-leak-listeners rule
 * Performance: CWE-400 - Detects event listeners not cleaned up
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noMemoryLeakListeners } from '../rules/performance/no-memory-leak-listeners';

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

describe('no-memory-leak-listeners', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - listeners with cleanup', noMemoryLeakListeners, {
      valid: [
        // useEffect with cleanup
        {
          code: `
            useEffect(() => {
              window.addEventListener('click', handler);
              return () => {
                window.removeEventListener('click', handler);
              };
            }, []);
          `,
        },
        // Test files (if ignoreInTests is true)
        {
          code: 'window.addEventListener("click", handler);',
          filename: 'test.spec.ts',
          options: [{ ignoreInTests: true }],
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Unhandled Listeners', () => {
    ruleTester.run('invalid - listeners without cleanup', noMemoryLeakListeners, {
      valid: [],
      invalid: [
        {
          code: 'window.addEventListener("click", handler);',
          errors: [{ messageId: 'memoryLeakListener' }],
        },
        {
          code: 'element.on("event", handler);',
          errors: [{ messageId: 'memoryLeakListener' }],
        },
        {
          code: 'emitter.once("event", handler);',
          errors: [{ messageId: 'memoryLeakListener' }],
        },
      ],
    });
  });

  describe('Options', () => {
    ruleTester.run('options - ignoreInTests', noMemoryLeakListeners, {
      valid: [
        {
          code: 'window.addEventListener("click", handler);',
          filename: 'test.spec.ts',
          options: [{ ignoreInTests: true }],
        },
      ],
      invalid: [
        {
          code: 'window.addEventListener("click", handler);',
          filename: 'test.spec.ts',
          options: [{ ignoreInTests: false }],
          errors: [{ messageId: 'memoryLeakListener' }],
        },
      ],
    });

    ruleTester.run('options - listenerMethods', noMemoryLeakListeners, {
      valid: [],
      invalid: [
        {
          code: 'customMethod("event", handler);',
          options: [{ listenerMethods: ['customMethod'] }],
          errors: [{ messageId: 'memoryLeakListener' }],
        },
      ],
    });
  });
});

