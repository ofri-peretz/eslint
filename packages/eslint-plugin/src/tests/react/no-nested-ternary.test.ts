/**
 * Comprehensive tests for no-nested-ternary rule
 * Prevent nested ternary expressions
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noNestedTernary } from '../../rules/quality/no-nested-ternary';

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

describe('no-nested-ternary', () => {
  describe('nested ternary detection', () => {
    ruleTester.run('detect nested ternary expressions', noNestedTernary, {
      valid: [
        // Simple ternary expressions
        {
          code: 'const result = condition ? "yes" : "no";',
        },
        // Ternary in function call (not nested)
        {
          code: 'console.log(condition ? "yes" : "no");',
        },
        // Ternary in assignment
        {
          code: 'const value = x > 0 ? x : -x;',
        },
        // Multiple separate ternaries
        {
          code: 'const a = cond1 ? "a" : "b"; const b = cond2 ? "c" : "d";',
        },
        // Ternary with function calls
        {
          code: 'const result = isValid(data) ? process(data) : null;',
        },
      ],
      invalid: [
        // Nested ternary in consequent
        {
          code: 'const result = condition1 ? (condition2 ? "a" : "b") : "c";',
          errors: [
            {
              messageId: 'noNestedTernary',
              data: {
                current: 'nested ternary expression',
                fix: 'extract or use if-else',
              },
            },
          ],
        },
        // Nested ternary in alternate
        {
          code: 'const result = condition1 ? "a" : (condition2 ? "b" : "c");',
          errors: [
            {
              messageId: 'noNestedTernary',
              data: {
                current: 'nested ternary expression',
                fix: 'extract or use if-else',
              },
            },
          ],
        },
        // Multiple levels of nesting
        {
          code: 'const result = a ? (b ? (c ? "x" : "y") : "z") : "w";',
          errors: [
            {
              messageId: 'noNestedTernary',
            },
            {
              messageId: 'noNestedTernary',
            },
          ],
        },
        // Nested in both branches
        {
          code: 'const result = a ? (b ? "x" : "y") : (c ? "z" : "w");',
          errors: [
            {
              messageId: 'noNestedTernary',
            },
          ],
        },
        // Nested with complex expressions
        {
          code: 'const result = user.isAdmin ? (user.status === "active" ? "full" : "limited") : "none";',
          errors: [
            {
              messageId: 'noNestedTernary',
            },
          ],
        },
      ],
    });
  });

  describe('edge cases', () => {
    ruleTester.run('edge cases', noNestedTernary, {
      valid: [
        // Ternary inside parentheses but not nested in ternary
        {
          code: 'const result = condition ? value : (otherValue);',
        },
        // Ternary with object literals
        {
          code: 'const obj = condition ? { a: 1 } : { b: 2 };',
        },
        // Ternary with array literals
        {
          code: 'const arr = condition ? [1, 2] : [3, 4];',
        },
      ],
      invalid: [
        // Nested ternary inside object
        {
          code: 'const obj = { result: condition1 ? (condition2 ? "a" : "b") : "c" };',
          errors: [
            {
              messageId: 'noNestedTernary',
            },
          ],
        },
        // Nested ternary inside array
        {
          code: 'const arr = [condition1 ? (condition2 ? "a" : "b") : "c"];',
          errors: [
            {
              messageId: 'noNestedTernary',
            },
          ],
        },
        // Nested ternary in function arguments
        {
          code: 'func(condition1 ? (condition2 ? "a" : "b") : "c");',
          errors: [
            {
              messageId: 'noNestedTernary',
            },
          ],
        },
      ],
    });
  });

  describe('different contexts', () => {
    ruleTester.run('different code contexts', noNestedTernary, {
      valid: [
        // In return statement
        {
          code: `
            function getValue(x) {
              return x > 0 ? x : 0;
            }
          `,
        },
        // In arrow function
        {
          code: 'const func = x => x > 0 ? x : 0;',
        },
      ],
      invalid: [
        // In return statement with nesting
        {
          code: `
            function getValue(a, b, c) {
              return a ? (b ? c : "default") : "none";
            }
          `,
          errors: [
            {
              messageId: 'noNestedTernary',
            },
          ],
        },
        // In arrow function with nesting
        {
          code: 'const func = (a, b) => a ? (b ? "both" : "a") : "none";',
          errors: [
            {
              messageId: 'noNestedTernary',
            },
          ],
        },
        // In class method
        {
          code: `
            class Processor {
              process(a, b) {
                return a ? (b ? "processed" : "partial") : "none";
              }
            }
          `,
          errors: [
            {
              messageId: 'noNestedTernary',
            },
          ],
        },
      ],
    });
  });

  describe('complex expressions', () => {
    ruleTester.run('complex expressions', noNestedTernary, {
      valid: [],
      invalid: [
        // Nested with function calls
        {
          code: 'const result = isValid(data) ? (data.type === "user" ? getUser(data) : getAdmin(data)) : null;',
          errors: [
            {
              messageId: 'noNestedTernary',
            },
          ],
        },
        // Deeply nested
        {
          code: 'const value = a ? b ? c ? d ? "deep" : "c" : "b" : "a" : "none";',
          errors: [
            {
              messageId: 'noNestedTernary',
            },
            {
              messageId: 'noNestedTernary',
            },
            {
              messageId: 'noNestedTernary',
            },
          ],
        },
      ],
    });
  });

  describe('template literals and expressions', () => {
    ruleTester.run('template literals', noNestedTernary, {
      valid: [],
      invalid: [
        // Nested ternary in template literal
        {
          code: 'const message = `Result: ${condition1 ? (condition2 ? "yes" : "no") : "maybe"}`;',
          errors: [
            {
              messageId: 'noNestedTernary',
            },
          ],
        },
        // Nested in tagged template
        {
          code: 'const result = tag`prefix ${a ? (b ? "x" : "y") : "z"} suffix`;',
          errors: [
            {
              messageId: 'noNestedTernary',
            },
          ],
        },
      ],
    });
  });

  describe('allow option contexts', () => {
    // JSX context tests
    const jsxRuleTester = new RuleTester({
      languageOptions: {
        parser,
        ecmaVersion: 2022,
        sourceType: 'module',
        parserOptions: {
          ecmaFeatures: { jsx: true },
        },
      },
    });

    jsxRuleTester.run('allow jsx context', noNestedTernary, {
      valid: [
        // Nested ternary allowed in JSX
        {
          code: 'const Component = () => <div>{a ? (b ? "x" : "y") : "z"}</div>;',
          options: [{ allow: ['jsx'] }],
        },
        // Nested ternary in JSX element
        {
          code: 'const Component = () => <div className={a ? (b ? "cls1" : "cls2") : "cls3"}>text</div>;',
          options: [{ allow: ['jsx'] }],
        },
      ],
      invalid: [
        // Without allow option, JSX nested ternary is invalid
        {
          code: 'const Component = () => <div>{a ? (b ? "x" : "y") : "z"}</div>;',
          errors: [{ messageId: 'noNestedTernary' }],
        },
      ],
    });

    ruleTester.run('allow variable context', noNestedTernary, {
      valid: [
        // Nested ternary allowed in variable declarations
        {
          code: 'const result = a ? (b ? "x" : "y") : "z";',
          options: [{ allow: ['variable'] }],
        },
      ],
      invalid: [
        // Without allow option, still invalid
        {
          code: 'const result = a ? (b ? "x" : "y") : "z";',
          errors: [{ messageId: 'noNestedTernary' }],
        },
      ],
    });

    ruleTester.run('allow return context', noNestedTernary, {
      valid: [
        // Nested ternary allowed in return statements
        {
          code: 'function test() { return a ? (b ? "x" : "y") : "z"; }',
          options: [{ allow: ['return'] }],
        },
      ],
      invalid: [
        // Without allow option, still invalid
        {
          code: 'function test() { return a ? (b ? "x" : "y") : "z"; }',
          errors: [{ messageId: 'noNestedTernary' }],
        },
      ],
    });

    ruleTester.run('allow argument context', noNestedTernary, {
      valid: [
        // Nested ternary allowed in function arguments
        {
          code: 'func(a ? (b ? "x" : "y") : "z");',
          options: [{ allow: ['argument'] }],
        },
      ],
      invalid: [
        // Without allow option, still invalid
        {
          code: 'func(a ? (b ? "x" : "y") : "z");',
          errors: [{ messageId: 'noNestedTernary' }],
        },
      ],
    });
  });

  describe('expression type coverage', () => {
    ruleTester.run('various expression types with nested ternaries', noNestedTernary, {
      valid: [
        // Member expression without nested ternary
        {
          code: 'const result = obj.prop ? "yes" : "no";',
        },
        // Binary expression without nested ternary
        {
          code: 'const result = (a + b) ? "yes" : "no";',
        },
        // Logical expression without nested ternary
        {
          code: 'const result = (a && b) ? "yes" : "no";',
        },
        // Unary expression without nested ternary
        {
          code: 'const result = !a ? "yes" : "no";',
        },
        // Assignment in ternary (without nested)
        {
          code: 'const result = condition ? (x = 1) : (x = 2);',
        },
        // Template literal without nested ternary
        {
          code: 'const result = condition ? `hello ${name}` : "default";',
        },
        // SequenceExpression (covered by default case - unknown expression type)
        {
          code: 'const result = condition ? (a, b) : c;',
        },
        // AwaitExpression without nested ternary  
        {
          code: 'const result = condition ? await foo() : await bar();',
        },
      ],
      invalid: [
        // MemberExpression with nested ternary in object
        {
          code: 'const result = (a ? (b ? obj1 : obj2) : obj3).prop;',
          errors: [{ messageId: 'noNestedTernary' }],
        },
        // MemberExpression with nested ternary in computed property
        {
          code: 'const result = obj[a ? (b ? "x" : "y") : "z"];',
          errors: [{ messageId: 'noNestedTernary' }],
        },
        // BinaryExpression with nested ternary on left
        {
          code: 'const result = (a ? (b ? 1 : 2) : 3) + 4;',
          errors: [{ messageId: 'noNestedTernary' }],
        },
        // BinaryExpression with nested ternary on right
        {
          code: 'const result = 4 + (a ? (b ? 1 : 2) : 3);',
          errors: [{ messageId: 'noNestedTernary' }],
        },
        // LogicalExpression with nested ternary
        {
          code: 'const result = (a ? (b ? true : false) : null) && other;',
          errors: [{ messageId: 'noNestedTernary' }],
        },
        // UnaryExpression with nested ternary
        {
          code: 'const result = !(a ? (b ? true : false) : null);',
          errors: [{ messageId: 'noNestedTernary' }],
        },
        // CallExpression with nested ternary in callee
        {
          code: 'const result = (a ? (b ? fn1 : fn2) : fn3)();',
          errors: [{ messageId: 'noNestedTernary' }],
        },
        // Nested ConditionalExpression in test position
        {
          code: 'const result = (a ? (b ? c : d) : e) ? "yes" : "no";',
          errors: [{ messageId: 'noNestedTernary' }],
        },
        // AssignmentExpression with nested ternary (2 levels of nesting = 2 errors)
        {
          code: 'let x; const result = condition ? (x = (a ? (b ? 1 : 2) : 3)) : 0;',
          errors: [{ messageId: 'noNestedTernary' }, { messageId: 'noNestedTernary' }],
        },
        // Removed duplicate test case - already covered above
        // LogicalExpression with nested ternary on right side
        {
          code: 'const result = false || (a ? (b ? true : false) : null);',
          errors: [{ messageId: 'noNestedTernary' }],
        },
        // Nested ternary inside TemplateLiteral expression (covers line 154)
        {
          code: 'const result = `value: ${a ? (b ? "x" : "y") : "z"}`;',
          errors: [{ messageId: 'noNestedTernary' }],
        },
        // Nested ternary inside TaggedTemplateExpression (covers lines 157-158)
        {
          code: 'const result = tag`prefix ${a ? (b ? "x" : "y") : "z"} suffix`;',
          errors: [{ messageId: 'noNestedTernary' }],
        },
        // Nested ternary in TaggedTemplateExpression tag (covers line 157)
        {
          code: 'const result = (a ? (b ? tag1 : tag2) : tag3)`template`;',
          errors: [{ messageId: 'noNestedTernary' }],
        },
        // TaggedTemplateExpression inside ternary with nested ternary in expressions (covers line 158)
        // 2 errors: outer ternary has nested, inner ternary has nested
        {
          code: 'const result = cond ? tag`hello ${a ? (b ? "x" : "y") : "z"}` : "default";',
          errors: [{ messageId: 'noNestedTernary' }, { messageId: 'noNestedTernary' }],
        },
        // BinaryExpression inside ternary, left has nested ternary (covers line 135 left branch)
        // 2 errors: outer ternary has nested, inner ternary has nested
        {
          code: 'const result = cond ? ((a ? (b ? 1 : 2) : 3) + 4) : "no";',
          errors: [{ messageId: 'noNestedTernary' }, { messageId: 'noNestedTernary' }],
        },
        // BinaryExpression inside ternary, right has nested ternary (covers line 135 right branch) 
        // 2 errors: outer ternary has nested, inner ternary has nested
        {
          code: 'const result = cond ? (4 + (a ? (b ? 1 : 2) : 3)) : "no";',
          errors: [{ messageId: 'noNestedTernary' }, { messageId: 'noNestedTernary' }],
        },
        // LogicalExpression inside ternary with nested ternary on right (line 135 right branch)
        // 2 errors: outer ternary has nested, inner ternary has nested
        {
          code: 'const result = cond ? (true && (a ? (b ? 1 : 2) : 3)) : "no";',
          errors: [{ messageId: 'noNestedTernary' }, { messageId: 'noNestedTernary' }],
        },
      ],
    });
  });
});
