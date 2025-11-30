/**
 * Comprehensive tests for no-missing-null-checks rule
 * Quality: CWE-476 - Detects potential null pointer dereferences
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noMissingNullChecks } from '../rules/quality/no-missing-null-checks';

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

describe('no-missing-null-checks', () => {
  describe('Valid Code - Optional Chaining', () => {
    ruleTester.run('valid - optional chaining', noMissingNullChecks, {
      valid: [
        // Direct optional chaining
        {
          code: 'obj?.property;',
        },
        {
          code: 'obj?.property?.method();',
        },
        {
          code: 'value?.nested?.deep;',
        },
        // Optional chaining with method calls
        {
          code: 'obj?.method();',
        },
        // ChainExpression parent
        {
          code: 'const result = obj?.nested?.value;',
        },
      ],
      invalid: [],
    });
  });

  describe('Valid Code - Nullish Coalescing', () => {
    ruleTester.run('valid - nullish coalescing', noMissingNullChecks, {
      valid: [
        {
          code: 'const result = value ?? defaultValue;',
        },
        {
          code: 'const x = obj.prop ?? fallback;',
        },
        {
          code: 'const nested = obj.a.b ?? "default";',
        },
      ],
      invalid: [],
    });
  });

  describe('Valid Code - Explicit Null Checks', () => {
    ruleTester.run('valid - explicit null checks', noMissingNullChecks, {
      valid: [
        // obj !== null pattern
        {
          code: 'if (obj !== null) { obj.property; }',
        },
        // obj != null pattern
        {
          code: 'if (obj != null) { obj.property; }',
        },
        // obj !== undefined pattern
        {
          code: 'if (obj !== undefined) { obj.property; }',
        },
        // null !== obj pattern (reversed)
        {
          code: 'if (null !== obj) { obj.property; }',
        },
        // undefined !== obj pattern (reversed)
        {
          code: 'if (undefined !== obj) { obj.property; }',
        },
        // Logical expression with null checks
        {
          code: 'if (obj !== null && obj !== undefined) { obj.property; }',
        },
        // Logical expression checking right side
        {
          code: 'if (someCondition && obj !== null) { obj.property; }',
        },
        // Note: Early return patterns like `if (obj === null) { return; } obj.property;`
        // are NOT detected by this rule - would require control flow analysis
      ],
      invalid: [],
    });
  });

  describe('Valid Code - Test Files', () => {
    ruleTester.run('valid - test files ignored', noMissingNullChecks, {
      valid: [
        {
          code: 'obj.property;',
          filename: 'test.spec.ts',
          options: [{ ignoreInTests: true }],
        },
        {
          code: 'obj.method();',
          filename: 'component.test.tsx',
          options: [{ ignoreInTests: true }],
        },
        {
          code: 'value.nested.deep;',
          filename: 'utils.spec.js',
          options: [{ ignoreInTests: true }],
        },
        {
          code: 'data.items.length;',
          filename: 'api.test.jsx',
          options: [{ ignoreInTests: true }],
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Property Access', () => {
    ruleTester.run('invalid - unsafe property access', noMissingNullChecks, {
      valid: [],
      invalid: [
        // Simple property access
        {
          code: 'const x = obj.property;',
          filename: 'src/utils.ts',
          errors: [{ messageId: 'missingNullCheck' }],
        },
        // Method call without null check
        {
          code: 'obj.method();',
          filename: 'src/utils.ts',
          errors: [{ messageId: 'missingNullCheck' }],
        },
        // Nested property access
        {
          code: 'const x = value.nested.deep;',
          filename: 'src/utils.ts',
          errors: [{ messageId: 'missingNullCheck' }],
        },
        // Property access in expression
        {
          code: 'const result = data.items.length;',
          filename: 'src/utils.ts',
          errors: [{ messageId: 'missingNullCheck' }],
        },
      ],
    });
  });

  describe('Invalid Code - Method Calls', () => {
    ruleTester.run('invalid - unsafe method calls', noMissingNullChecks, {
      valid: [],
      invalid: [
        // Simple method call
        {
          code: 'service.fetchData();',
          filename: 'src/api.ts',
          errors: [{ messageId: 'missingNullCheck' }],
        },
        // Method call with arguments
        {
          code: 'handler.process(data);',
          filename: 'src/processor.ts',
          errors: [{ messageId: 'missingNullCheck' }],
        },
        // Chained method call without optional chaining
        {
          code: 'response.data.map(x => x);',
          filename: 'src/transform.ts',
          errors: [{ messageId: 'missingNullCheck' }],
        },
      ],
    });
  });

  describe('Invalid Code - Nested Member Expressions', () => {
    ruleTester.run('invalid - nested member expressions', noMissingNullChecks, {
      valid: [],
      invalid: [
        // Deep nesting
        {
          code: 'const value = api.response.data.items;',
          filename: 'src/utils.ts',
          errors: [{ messageId: 'missingNullCheck' }],
        },
        // Method on nested property
        {
          code: 'config.settings.getValue();',
          filename: 'src/config.ts',
          errors: [{ messageId: 'missingNullCheck' }],
        },
      ],
    });
  });

  describe('Options - ignoreInTests', () => {
    ruleTester.run('options - ignoreInTests false', noMissingNullChecks, {
      valid: [],
      invalid: [
        // Test file with ignoreInTests = false
        {
          code: 'obj.property;',
          filename: 'component.test.ts',
          options: [{ ignoreInTests: false }],
          errors: [{ messageId: 'missingNullCheck' }],
        },
        // Spec file with ignoreInTests = false
        {
          code: 'service.method();',
          filename: 'api.spec.ts',
          options: [{ ignoreInTests: false }],
          errors: [{ messageId: 'missingNullCheck' }],
        },
      ],
    });
  });

  describe('Edge Cases', () => {
    ruleTester.run('edge cases', noMissingNullChecks, {
      valid: [
        // Literals don't need null checks
        {
          code: '"string".length;',
        },
        // Already using optional chaining
        {
          code: 'arr?.[0]?.name;',
        },
        // Simple null check with single property access
        {
          code: 'if (obj !== null) { obj.property; }',
        },
        // Optional method call with ChainExpression
        {
          code: 'obj?.method?.();',
        },
        // Method call with optional chaining
        {
          code: 'service?.fetchData();',
        },
      ],
      invalid: [
        // Property access on identifier
        {
          code: 'myVar.field;',
          filename: 'src/utils.ts',
          errors: [{ messageId: 'missingNullCheck' }],
        },
      ],
    });
  });

  describe('CallExpression Coverage', () => {
    ruleTester.run('call expression edge cases', noMissingNullChecks, {
      valid: [
        // Method call with optional chaining on callee
        {
          code: 'obj?.method();',
        },
        // Nested optional method call
        {
          code: 'response?.data?.map(x => x);',
        },
      ],
      invalid: [
        // Method call on nested member expression
        {
          code: 'api.client.request();',
          filename: 'src/api.ts',
          errors: [{ messageId: 'missingNullCheck' }],
        },
      ],
    });
  });
});

