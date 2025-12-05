/**
 * Comprehensive tests for no-deprecated rule
 * Forbid imported names marked with @deprecated documentation tag
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noDeprecated } from '../../rules/architecture/no-deprecated';

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

describe('no-deprecated', () => {
  describe('JSDoc @deprecated detection', () => {
    ruleTester.run('detect deprecated functions', noDeprecated, {
      valid: [
        // Non-deprecated function
        {
          code: `
            /**
             * A regular function
             */
            function regularFunction() {}
          `,
        },
        // Function with different comment
        {
          code: `
            /**
             * @param {string} param
             */
            function documentedFunction(param) {}
          `,
        },
      ],
      invalid: [
        // Function with @deprecated
        {
          code: `
            /**
             * @deprecated Use newFunction instead
             */
            function oldFunction() {}
            oldFunction();
          `,
          errors: [
            {
              messageId: 'deprecatedUsage',
              data: {
                name: 'oldFunction',
                usage: 'oldFunction()',
                reason: 'Use newFunction instead',
                replacement: 'newFunction',
              },
              suggestions: [
                {
                  messageId: 'deprecatedUsage',
                  data: {
                    replacement: 'newFunction',
                    suggestion: 'Replace with newFunction',
                  },
                  output: `
            /**
             * @deprecated Use newFunction instead
             */
            function oldFunction() {}
            newFunction;
          `,
                },
              ],
            },
          ],
        },
        // Variable with @deprecated
        {
          code: `
            /**
             * @deprecated Use newVar instead
             */
            const oldVar = 42;
            console.log(oldVar);
          `,
          errors: [
            {
              messageId: 'deprecatedUsage',
              data: {
                name: 'oldVar',
                usage: 'oldVar',
                reason: 'Use newVar instead',
                replacement: 'newVar',
              },
              suggestions: [
                {
                  messageId: 'deprecatedUsage',
                  data: {
                    replacement: 'newVar',
                    suggestion: 'Replace with newVar',
                  },
                  output: `
            /**
             * @deprecated Use newVar instead
             */
            const oldVar = 42;
            console.log(newVar);
          `,
                },
              ],
            },
          ],
        },
        // Class with @deprecated
        {
          code: `
            /**
             * @deprecated Use NewClass instead
             */
            class OldClass {}
            new OldClass();
          `,
          errors: [
            {
              messageId: 'deprecatedUsage',
              data: {
                name: 'OldClass',
                usage: 'new OldClass()',
              },
              suggestions: [
                {
                  messageId: 'deprecatedUsage',
                  data: {
                    replacement: 'NewClass',
                    suggestion: 'Replace with NewClass',
                  },
                  output: `
            /**
             * @deprecated Use NewClass instead
             */
            class OldClass {}
            NewClass;
          `,
                },
              ],
            },
          ],
        },
      ],
    });

    ruleTester.run('parse complex JSDoc deprecation', noDeprecated, {
      valid: [],
      invalid: [
        // Deprecated with reason only
        {
          code: `
            /**
             * @deprecated This function is no longer maintained
             */
            function deprecatedFunc() {}
            deprecatedFunc();
          `,
          errors: [
            {
              messageId: 'deprecatedUsage',
              data: {
                name: 'deprecatedFunc',
                usage: 'deprecatedFunc',
                reason: 'This function is no longer maintained',
              },
            },
          ],
        },
        // Deprecated with replacement
        {
          code: `
            /**
             * @deprecated Use calculateSum instead of this old method
             */
            function oldCalc() {}
            oldCalc();
          `,
          errors: [
            {
              messageId: 'deprecatedUsage',
              data: {
                name: 'oldCalc',
                usage: 'oldCalc()',
                reason: 'Use calculateSum instead of this old method',
                replacement: 'calculateSum',
              },
              suggestions: [
                {
                  messageId: 'deprecatedUsage',
                  data: {
                    replacement: 'calculateSum',
                    suggestion: 'Replace with calculateSum',
                  },
                  output: `
            /**
             * @deprecated Use calculateSum instead of this old method
             */
            function oldCalc() {}
            calculateSum;
          `,
                },
              ],
            },
          ],
        },
        // Deprecated with "replaced by"
        {
          code: `
            /**
             * @deprecated Replaced by NewAPI.process
             */
            function oldAPI() {}
            oldAPI();
          `,
          errors: [
            {
              messageId: 'deprecatedUsage',
              data: {
                name: 'oldAPI',
                usage: 'oldAPI()',
                reason: 'Replaced by NewAPI.process',
                replacement: 'NewAPI.process',
              },
              suggestions: [
                {
                  messageId: 'deprecatedUsage',
                  data: {
                    replacement: 'NewAPI.process',
                    suggestion: 'Replace with NewAPI.process',
                  },
                  output: `
            /**
             * @deprecated Replaced by NewAPI.process
             */
            function oldAPI() {}
            NewAPI.process;
          `,
                },
              ],
            },
          ],
        },
        // Deprecated with "see"
        {
          code: `
            /**
             * @deprecated See NewModule for updated implementation
             */
            function legacyFunc() {}
            legacyFunc();
          `,
          errors: [
            {
              messageId: 'deprecatedUsage',
              data: {
                name: 'legacyFunc',
                usage: 'legacyFunc()',
                reason: 'See NewModule for updated implementation',
                replacement: 'NewModule',
              },
              suggestions: [
                {
                  messageId: 'deprecatedUsage',
                  data: {
                    replacement: 'NewModule',
                    suggestion: 'Replace with NewModule',
                  },
                  output: `
            /**
             * @deprecated See NewModule for updated implementation
             */
            function legacyFunc() {}
            NewModule;
          `,
                },
              ],
            },
          ],
        },
      ],
    });
  });

  describe('TypeScript @deprecated decorator', () => {
    ruleTester.run('detect deprecated decorator', noDeprecated, {
      valid: [
        // Regular class without decorator
        {
          code: 'class RegularClass {}',
        },
        // Class with other decorators
        {
          code: `
            @injectable
            class ServiceClass {}
          `,
        },
      ],
      invalid: [
        // Class with @deprecated decorator
        {
          code: `
            @deprecated
            class OldClass {}
            new OldClass();
          `,
          errors: [
            {
              messageId: 'deprecatedUsage',
              data: {
                name: 'OldClass',
                usage: 'OldClass',
                reason: 'Marked with @deprecated decorator',
              },
            },
          ],
        },
      ],
    });
  });

  describe('Allow list functionality', () => {
    ruleTester.run('allow specific deprecated items', noDeprecated, {
      valid: [
        // Deprecated function but allowed
        {
          code: `
            /**
             * @deprecated Use newFunction instead
             */
            function oldFunction() {}
            oldFunction();
          `,
          options: [{ allow: ['oldFunction'] }],
        },
        // Multiple allowed items
        {
          code: `
            /**
             * @deprecated Use newVar instead
             */
            const oldVar = 42;
            /**
             * @deprecated Use NewClass instead
             */
            class OldClass {}

            console.log(oldVar);
            new OldClass();
          `,
          options: [{ allow: ['oldVar', 'OldClass'] }],
        },
      ],
      invalid: [
        // Deprecated but not in allow list
        {
          code: `
            /**
             * @deprecated Use newFunction instead
             */
            function oldFunction() {}
            /**
             * @deprecated Use newVar instead
             */
            const oldVar = 42;

            oldFunction();
            console.log(oldVar);
          `,
          options: [{ allow: ['oldFunction'] }],
          errors: [
            {
              messageId: 'deprecatedUsage',
              data: {
                name: 'oldVar',
                usage: 'oldVar',
              },
              suggestions: [
                {
                  messageId: 'deprecatedUsage',
                  data: {
                    replacement: 'newVar',
                    suggestion: 'Replace with newVar',
                  },
                  output: `
            /**
             * @deprecated Use newFunction instead
             */
            function oldFunction() {}
            /**
             * @deprecated Use newVar instead
             */
            const oldVar = 42;

            oldFunction();
            console.log(newVar);
          `,
                },
              ],
            },
          ],
        },
      ],
    });
  });

  describe('Custom deprecation markers', () => {
    ruleTester.run('use custom deprecation markers', noDeprecated, {
      valid: [
        // Standard @deprecated not caught with custom markers
        {
          code: `
            /**
             * @deprecated Use newFunction instead
             */
            function oldFunction() {}
          `,
          options: [{ deprecationMarkers: ['@obsolete'] }],
        },
      ],
      invalid: [
        // Custom marker detected
        {
          code: `
            /**
             * @obsolete Use newFunction instead
             */
            function oldFunction() {}
            oldFunction();
          `,
            options: [{ deprecationMarkers: ['@obsolete'] }],
          errors: [
            {
              messageId: 'deprecatedUsage',
              data: {
                name: 'oldFunction',
                usage: 'oldFunction()',
                reason: 'Use newFunction instead',
                replacement: 'newFunction',
              },
              suggestions: [
                {
                  messageId: 'deprecatedUsage',
                  data: {
                    replacement: 'newFunction',
                    suggestion: 'Replace with newFunction',
                  },
                  output: `
            /**
             * @obsolete Use newFunction instead
             */
            function oldFunction() {}
            newFunction;
          `,
                },
              ],
            },
          ],
        },
        // Multiple custom markers
        {
          code: `
            /**
             * @legacy This will be removed
             */
            function legacyFunc() {}
            /**
             * @outdated Use modernFunc instead
             */
            function outdatedFunc() {}

            legacyFunc();
            outdatedFunc();
          `,
          options: [{ deprecationMarkers: ['@legacy', '@outdated'] }],
          errors: [
            {
              messageId: 'deprecatedUsage',
              data: {
                name: 'legacyFunc',
                usage: 'legacyFunc()',
                reason: 'This will be removed',
              },
            },
            {
              messageId: 'deprecatedUsage',
              data: {
                name: 'outdatedFunc',
                usage: 'outdatedFunc()',
                reason: 'Use modernFunc instead',
                replacement: 'modernFunc',
              },
              suggestions: [
                {
                  messageId: 'deprecatedUsage',
                  data: {
                    replacement: 'modernFunc',
                    suggestion: 'Replace with modernFunc',
                  },
                  output: `
            /**
             * @legacy This will be removed
             */
            function legacyFunc() {}
            /**
             * @outdated Use modernFunc instead
             */
            function outdatedFunc() {}

            legacyFunc();
            modernFunc;
          `,
                },
              ],
            },
          ],
        },
      ],
    });
  });

  describe('Configuration options', () => {
    ruleTester.run('disable JSDoc checking', noDeprecated, {
      valid: [
        // JSDoc deprecated not caught when disabled
        {
          code: `
            /**
             * @deprecated Use newFunction instead
             */
            function oldFunction() {}
            oldFunction();
          `,
          options: [{ checkJSDoc: false }],
        },
      ],
      invalid: [
        // But decorator still caught
        {
          code: `
            @deprecated
            class OldClass {}
            new OldClass();
          `,
          options: [{ checkJSDoc: false }],
          errors: [
            {
              messageId: 'deprecatedUsage',
              data: {
                name: 'OldClass',
                usage: 'new OldClass()',
                reason: 'Marked with @deprecated decorator',
              },
            },
          ],
        },
      ],
    });

    ruleTester.run('disable decorator checking', noDeprecated, {
      valid: [
        // Decorator deprecated not caught when disabled
        {
          code: `
            @deprecated
            class OldClass {}
          `,
          options: [{ checkDecorators: false }],
        },
      ],
      invalid: [
        // But JSDoc still caught
        {
          code: `
            /**
             * @deprecated Use NewClass instead
             */
            class OldClass {}
            new OldClass();
          `,
          options: [{ checkDecorators: false }],
          errors: [
            {
              messageId: 'deprecatedUsage',
              data: {
                name: 'OldClass',
                usage: 'new OldClass()',
                reason: 'Use NewClass instead',
                replacement: 'NewClass',
              },
              suggestions: [
                {
                  messageId: 'deprecatedUsage',
                  data: {
                    replacement: 'NewClass',
                    suggestion: 'Replace with NewClass',
                  },
                  output: `
            /**
             * @deprecated Use NewClass instead
             */
            class OldClass {}
            NewClass;
          `,
                },
              ],
            },
          ],
        },
      ],
    });

    ruleTester.run('disable both checks', noDeprecated, {
      valid: [
        // Neither JSDoc nor decorator caught
        {
          code: `
            /**
             * @deprecated Use newFunction instead
             */
            function oldFunction() {}

            @deprecated
            class OldClass {}

            oldFunction();
            new OldClass();
          `,
          options: [{ checkJSDoc: false, checkDecorators: false }],
        },
      ],
      invalid: [],
    });
  });

  describe('Usage detection', () => {
    ruleTester.run('detect various usage patterns', noDeprecated, {
      valid: [
        // Declaration only (no usage)
        {
          code: `
            /**
             * @deprecated Use newFunction instead
             */
            function oldFunction() {}
          `,
        },
      ],
      invalid: [
        // Function call
        {
          code: `
            /**
             * @deprecated Use newFunction instead
             */
            function oldFunction() {}
            oldFunction();
          `,
          errors: [
            {
              messageId: 'deprecatedUsage',
              data: {
                name: 'oldFunction',
                usage: 'oldFunction()',
              },
              suggestions: [
                {
                  messageId: 'deprecatedUsage',
                  data: {
                    replacement: 'newFunction',
                    suggestion: 'Replace with newFunction',
                  },
                  output: `
            /**
             * @deprecated Use newFunction instead
             */
            function oldFunction() {}
            newFunction;
          `,
                },
              ],
            },
          ],
        },
        // Variable reference
        {
          code: `
            /**
             * @deprecated Use newVar instead
             */
            const oldVar = 42;
            const result = oldVar + 1;
          `,
          errors: [
            {
              messageId: 'deprecatedUsage',
              data: {
                name: 'oldVar',
                usage: 'oldVar',
              },
              suggestions: [
                {
                  messageId: 'deprecatedUsage',
                  data: {
                    replacement: 'newVar',
                    suggestion: 'Replace with newVar',
                  },
                  output: `
            /**
             * @deprecated Use newVar instead
             */
            const oldVar = 42;
            const result = newVar + 1;
          `,
                },
              ],
            },
          ],
        },
        // Property access
        {
          code: `
            /**
             * @deprecated Use newObject instead
             */
            const oldObject = { prop: 'value' };
            console.log(oldObject.prop);
          `,
          errors: [
            {
              messageId: 'deprecatedUsage',
              data: {
                name: 'oldObject',
                usage: 'oldObject.prop',
              },
              suggestions: [
                {
                  messageId: 'deprecatedUsage',
                  data: {
                    replacement: 'newObject',
                    suggestion: 'Replace with newObject',
                  },
                  output: `
            /**
             * @deprecated Use newObject instead
             */
            const oldObject = { prop: 'value' };
            console.log(newObject);
          `,
                },
              ],
            },
          ],
        },
        // Class instantiation
        {
          code: `
            /**
             * @deprecated Use NewClass instead
             */
            class OldClass {}
            const instance = new OldClass();
          `,
          errors: [
            {
              messageId: 'deprecatedUsage',
              data: {
                name: 'OldClass',
                usage: 'OldClass',
              },
              suggestions: [
                {
                  messageId: 'deprecatedUsage',
                  data: {
                    replacement: 'NewClass',
                    suggestion: 'Replace with NewClass',
                  },
                  output: `
            /**
             * @deprecated Use NewClass instead
             */
            class OldClass {}
            const instance = NewClass;
          `,
                },
              ],
            },
          ],
        },
      ],
    });
  });

  describe('Export handling', () => {
    ruleTester.run('handle different export patterns', noDeprecated, {
      valid: [
        // Default export (different handling)
        {
          code: `
            /**
             * @deprecated Use default export from new module
             */
            export default function oldDefault() {}
          `,
        },
      ],
      invalid: [
        // Named export
        {
          code: `
            /**
             * @deprecated Use newNamedExport instead
             */
            export function oldNamedExport() {}
            oldNamedExport();
          `,
          errors: [
            {
              messageId: 'deprecatedUsage',
              data: {
                name: 'oldNamedExport',
                usage: 'oldNamedExport()',
              },
              suggestions: [
                {
                  messageId: 'deprecatedUsage',
                  data: {
                    replacement: 'newNamedExport',
                    suggestion: 'Replace with newNamedExport',
                  },
                  output: `
            /**
             * @deprecated Use newNamedExport instead
             */
            export function oldNamedExport() {}
            newNamedExport;
          `,
                },
              ],
            },
          ],
        },
        // Export specifier
        {
          code: `
            /**
             * @deprecated Use newFunction instead
             */
            function oldFunction() {}
            export { oldFunction };
            oldFunction();
          `,
          errors: [
            {
              messageId: 'deprecatedUsage',
              data: {
                name: 'oldFunction',
                usage: 'oldFunction()',
              },
              suggestions: [
                {
                  messageId: 'deprecatedUsage',
                  data: {
                    replacement: 'newFunction',
                    suggestion: 'Replace with newFunction',
                  },
                  output: `
            /**
             * @deprecated Use newFunction instead
             */
            function oldFunction() {}
            export { oldFunction };
            newFunction;
          `,
                },
              ],
            },
          ],
        },
      ],
    });
  });

  describe('Suggestion capabilities', () => {
    ruleTester.run('provide replacement suggestions', noDeprecated, {
      valid: [],
      invalid: [
        // With replacement suggestion
        {
          code: `
            /**
             * @deprecated Use newFunction instead
             */
            function oldFunction() {}
            oldFunction();
          `,
          errors: [
            {
              messageId: 'deprecatedUsage',
              suggestions: [
                {
                  messageId: 'deprecatedUsage',
                  data: {
                    replacement: 'newFunction',
                    suggestion: 'Replace with newFunction',
                  },
                  output: `
            /**
             * @deprecated Use newFunction instead
             */
            function oldFunction() {}
            newFunction;
          `,
                },
              ],
            },
          ],
        },
        // Without replacement (no suggestions)
        {
          code: `
            /**
             * @deprecated This is old
             */
            function oldFunction() {}
            oldFunction();
          `,
          errors: [
            {
              messageId: 'deprecatedUsage',
              suggestions: [],
            },
          ],
        },
      ],
    });
  });

  describe('Edge cases', () => {
    ruleTester.run('handle edge cases', noDeprecated, {
      valid: [
        // Empty JSDoc
        {
          code: `
            /**
             */
            function func() {}
          `,
        },
        // JSDoc without @deprecated
        {
          code: `
            /**
             * @param {string} param
             * @returns {void}
             */
            function func(param) {}
          `,
        },
        // Comments that look like JSDoc but aren't
        {
          code: `
            /*
             * @deprecated This is not JSDoc
             */
            function func() {}
          `,
        },
      ],
      invalid: [
        // Multiple deprecated items
        {
          code: `
            /**
             * @deprecated Use A instead
             */
            function funcA() {}
            /**
             * @deprecated Use B instead
             */
            function funcB() {}

            funcA();
            funcB();
          `,
          errors: [
            {
              messageId: 'deprecatedUsage',
              data: {
                name: 'funcA',
                usage: 'funcA()',
                replacement: 'A',
              },
              suggestions: [
                {
                  messageId: 'deprecatedUsage',
                  data: {
                    replacement: 'A',
                    suggestion: 'Replace with A',
                  },
                  output: `
            /**
             * @deprecated Use A instead
             */
            function funcA() {}
            /**
             * @deprecated Use B instead
             */
            function funcB() {}

            A;
            funcB();
          `,
                },
              ],
            },
            {
              messageId: 'deprecatedUsage',
              data: {
                name: 'funcB',
                usage: 'funcB()',
                replacement: 'B',
              },
              suggestions: [
                {
                  messageId: 'deprecatedUsage',
                  data: {
                    replacement: 'B',
                    suggestion: 'Replace with B',
                  },
                  output: `
            /**
             * @deprecated Use A instead
             */
            function funcA() {}
            /**
             * @deprecated Use B instead
             */
            function funcB() {}

            funcA();
            B;
          `,
                },
              ],
            },
          ],
        },
        // Deprecated item used multiple times
        {
          code: `
            /**
             * @deprecated Use newVar instead
             */
            const oldVar = 42;

            console.log(oldVar);
            const result = oldVar * 2;
            if (oldVar > 0) {}
          `,
          errors: [
            {
              messageId: 'deprecatedUsage',
              data: {
                name: 'oldVar',
                usage: 'oldVar',
              },
              suggestions: [
                {
                  messageId: 'deprecatedUsage',
                  data: {
                    replacement: 'newVar',
                    suggestion: 'Replace with newVar',
                  },
                  output: `
            /**
             * @deprecated Use newVar instead
             */
            const oldVar = 42;

            console.log(newVar);
            const result = oldVar * 2;
            if (oldVar > 0) {}
          `,
                },
              ],
            },
            {
              messageId: 'deprecatedUsage',
              data: {
                name: 'oldVar',
                usage: 'oldVar',
              },
              suggestions: [
                {
                  messageId: 'deprecatedUsage',
                  data: {
                    replacement: 'newVar',
                    suggestion: 'Replace with newVar',
                  },
                  output: `
            /**
             * @deprecated Use newVar instead
             */
            const oldVar = 42;

            console.log(oldVar);
            const result = newVar * 2;
            if (oldVar > 0) {}
          `,
                },
              ],
            },
            {
              messageId: 'deprecatedUsage',
              data: {
                name: 'oldVar',
                usage: 'oldVar',
              },
              suggestions: [
                {
                  messageId: 'deprecatedUsage',
                  data: {
                    replacement: 'newVar',
                    suggestion: 'Replace with newVar',
                  },
                  output: `
            /**
             * @deprecated Use newVar instead
             */
            const oldVar = 42;

            console.log(oldVar);
            const result = oldVar * 2;
            if (newVar > 0) {}
          `,
                },
              ],
            },
          ],
        },
      ],
    });
  });
});
