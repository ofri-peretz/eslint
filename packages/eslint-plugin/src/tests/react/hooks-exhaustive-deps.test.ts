/**
 * Comprehensive tests for hooks-exhaustive-deps rule
 * Detect missing or extra dependencies in React hooks
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { hooksExhaustiveDeps } from '../../rules/react/hooks-exhaustive-deps';

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
    parserOptions: {
      ecmaFeatures: {
        jsx: true,
      },
    },
  },
});

describe('hooks-exhaustive-deps', () => {
  describe('useEffect - Valid Cases', () => {
    ruleTester.run('valid useEffect usage', hooksExhaustiveDeps, {
      valid: [
        // Empty deps array - run once
        {
          code: `
            function Component() {
              useEffect(() => {
                console.log('mounted');
              }, []);
            }
          `,
        },
        // All deps included
        {
          code: `
            function Component({ value }) {
              useEffect(() => {
                console.log(value);
              }, [value]);
            }
          `,
        },
        // Multiple deps all included
        {
          code: `
            function Component({ a, b, c }) {
              useEffect(() => {
                console.log(a, b, c);
              }, [a, b, c]);
            }
          `,
        },
        // No deps array (runs every render) - different concern
        {
          code: `
            function Component({ value }) {
              useEffect(() => {
                console.log(value);
              });
            }
          `,
        },
        // Stable references (setState functions)
        {
          code: `
            function Component() {
              const [count, setCount] = useState(0);
              useEffect(() => {
                setCount(1);
              }, []);
            }
          `,
        },
        // Using local variables defined inside effect
        {
          code: `
            function Component() {
              useEffect(() => {
                const local = 1;
                console.log(local);
              }, []);
            }
          `,
        },
      ],
      invalid: [],
    });
  });

  describe('useEffect - Missing Dependencies', () => {
    ruleTester.run('detect missing deps in useEffect', hooksExhaustiveDeps, {
      valid: [],
      invalid: [
        // Missing single dependency
        {
          code: `
            function Component({ value }) {
              useEffect(() => {
                console.log(value);
              }, []);
            }
          `,
          errors: [
            {
              messageId: 'missingDep',
              suggestions: [
                {
                  messageId: 'suggestAddDep',
                  output: `
            function Component({ value }) {
              useEffect(() => {
                console.log(value);
              }, [value]);
            }
          `,
                },
              ],
            },
          ],
        },
        // Missing multiple dependencies - reports as single error with both deps
        {
          code: `
            function Component({ a, b }) {
              useEffect(() => {
                console.log(a, b);
              }, []);
            }
          `,
          errors: [
            {
              messageId: 'missingDep',
              suggestions: [
                {
                  messageId: 'suggestAddDep',
                  output: `
            function Component({ a, b }) {
              useEffect(() => {
                console.log(a, b);
              }, [a]);
            }
          `,
                },
                {
                  messageId: 'suggestAddDep',
                  output: `
            function Component({ a, b }) {
              useEffect(() => {
                console.log(a, b);
              }, [b]);
            }
          `,
                },
              ],
            },
          ],
        },
        // Missing one of multiple deps
        {
          code: `
            function Component({ a, b }) {
              useEffect(() => {
                console.log(a, b);
              }, [a]);
            }
          `,
          errors: [
            {
              messageId: 'missingDep',
              suggestions: [
                {
                  messageId: 'suggestAddDep',
                  output: `
            function Component({ a, b }) {
              useEffect(() => {
                console.log(a, b);
              }, [a, b]);
            }
          `,
                },
              ],
            },
          ],
        },
      ],
    });
  });

  describe('useEffect - Extra Dependencies', () => {
    ruleTester.run('detect extra deps in useEffect', hooksExhaustiveDeps, {
      valid: [],
      invalid: [
        // Extra dependency not used in effect
        {
          code: `
            function Component({ value, unused }) {
              useEffect(() => {
                console.log(value);
              }, [value, unused]);
            }
          `,
          errors: [
            {
              messageId: 'extraDep',
              suggestions: [
                {
                  messageId: 'suggestRemoveDep',
                  output: `
            function Component({ value, unused }) {
              useEffect(() => {
                console.log(value);
              }, [value]);
            }
          `,
                },
              ],
            },
          ],
        },
      ],
    });
  });

  describe('useCallback - Valid Cases', () => {
    ruleTester.run('valid useCallback usage', hooksExhaustiveDeps, {
      valid: [
        // All deps included
        {
          code: `
            function Component({ onClick }) {
              const handleClick = useCallback(() => {
                onClick();
              }, [onClick]);
            }
          `,
        },
        // Empty deps for stable callback
        {
          code: `
            function Component() {
              const handleClick = useCallback(() => {
                console.log('clicked');
              }, []);
            }
          `,
        },
      ],
      invalid: [],
    });
  });

  describe('useCallback - Missing Dependencies', () => {
    ruleTester.run('detect missing deps in useCallback', hooksExhaustiveDeps, {
      valid: [],
      invalid: [
        // Missing dependency
        {
          code: `
            function Component({ value }) {
              const getValue = useCallback(() => {
                return value;
              }, []);
            }
          `,
          errors: [
            {
              messageId: 'missingDep',
              suggestions: [
                {
                  messageId: 'suggestAddDep',
                  output: `
            function Component({ value }) {
              const getValue = useCallback(() => {
                return value;
              }, [value]);
            }
          `,
                },
              ],
            },
          ],
        },
      ],
    });
  });

  describe('useMemo - Valid Cases', () => {
    ruleTester.run('valid useMemo usage', hooksExhaustiveDeps, {
      valid: [
        // All deps included
        {
          code: `
            function Component({ items }) {
              const sorted = useMemo(() => {
                return items.sort();
              }, [items]);
            }
          `,
        },
        // Multiple deps
        {
          code: `
            function Component({ a, b }) {
              const sum = useMemo(() => a + b, [a, b]);
            }
          `,
        },
      ],
      invalid: [],
    });
  });

  describe('useMemo - Missing Dependencies', () => {
    ruleTester.run('detect missing deps in useMemo', hooksExhaustiveDeps, {
      valid: [],
      invalid: [
        // Missing dependency
        {
          code: `
            function Component({ multiplier }) {
              const result = useMemo(() => {
                return 10 * multiplier;
              }, []);
            }
          `,
          errors: [
            {
              messageId: 'missingDep',
              suggestions: [
                {
                  messageId: 'suggestAddDep',
                  output: `
            function Component({ multiplier }) {
              const result = useMemo(() => {
                return 10 * multiplier;
              }, [multiplier]);
            }
          `,
                },
              ],
            },
          ],
        },
      ],
    });
  });

  describe('useLayoutEffect', () => {
    ruleTester.run('detect issues in useLayoutEffect', hooksExhaustiveDeps, {
      valid: [
        // Valid usage
        {
          code: `
            function Component({ width }) {
              useLayoutEffect(() => {
                console.log(width);
              }, [width]);
            }
          `,
        },
      ],
      invalid: [
        // Missing dependency
        {
          code: `
            function Component({ height }) {
              useLayoutEffect(() => {
                console.log(height);
              }, []);
            }
          `,
          errors: [
            {
              messageId: 'missingDep',
              suggestions: [
                {
                  messageId: 'suggestAddDep',
                  output: `
            function Component({ height }) {
              useLayoutEffect(() => {
                console.log(height);
              }, [height]);
            }
          `,
                },
              ],
            },
          ],
        },
      ],
    });
  });

  describe('React.useEffect (namespaced)', () => {
    ruleTester.run('detect issues in React.useEffect', hooksExhaustiveDeps, {
      valid: [
        // Valid namespaced usage
        {
          code: `
            function Component({ value }) {
              React.useEffect(() => {
                console.log(value);
              }, [value]);
            }
          `,
        },
      ],
      invalid: [
        // Missing dependency in namespaced call
        {
          code: `
            function Component({ data }) {
              React.useEffect(() => {
                console.log(data);
              }, []);
            }
          `,
          errors: [
            {
              messageId: 'missingDep',
              suggestions: [
                {
                  messageId: 'suggestAddDep',
                  output: `
            function Component({ data }) {
              React.useEffect(() => {
                console.log(data);
              }, [data]);
            }
          `,
                },
              ],
            },
          ],
        },
      ],
    });
  });

  describe('Complex Dependency Patterns', () => {
    ruleTester.run('complex patterns', hooksExhaustiveDeps, {
      valid: [
        // Object property access
        {
          code: `
            function Component({ config }) {
              useEffect(() => {
                console.log(config.value);
              }, [config]);
            }
          `,
        },
        // Function expression as callback
        {
          code: `
            function Component({ handler }) {
              useEffect(function effect() {
                handler();
              }, [handler]);
            }
          `,
        },
      ],
      invalid: [],
    });
  });

  describe('Options', () => {
    ruleTester.run('additionalHooks option', hooksExhaustiveDeps, {
      valid: [],
      invalid: [
        // Custom hook with missing dependency
        {
          code: `
            function Component({ value }) {
              useMyCustomEffect(() => {
                console.log(value);
              }, []);
            }
          `,
          options: [{ additionalHooks: 'useMyCustomEffect' }],
          errors: [
            {
              messageId: 'missingDep',
              suggestions: [
                {
                  messageId: 'suggestAddDep',
                  output: `
            function Component({ value }) {
              useMyCustomEffect(() => {
                console.log(value);
              }, [value]);
            }
          `,
                },
              ],
            },
          ],
        },
      ],
    });
  });

  describe('Suggestions', () => {
    ruleTester.run('provides fix suggestions', hooksExhaustiveDeps, {
      valid: [],
      invalid: [
        // Should provide suggestion to add missing dep
        {
          code: `
            function Component({ value }) {
              useEffect(() => {
                console.log(value);
              }, []);
            }
          `,
          errors: [
            {
              messageId: 'missingDep',
              suggestions: [
                {
                  messageId: 'suggestAddDep',
                  output: `
            function Component({ value }) {
              useEffect(() => {
                console.log(value);
              }, [value]);
            }
          `,
                },
              ],
            },
          ],
        },
      ],
    });
  });

  describe('Edge Cases', () => {
    ruleTester.run('edge cases', hooksExhaustiveDeps, {
      valid: [
        // No arguments to hook
        {
          code: `
            function Component() {
              const value = useEffect();
            }
          `,
        },
        // Non-function first argument
        {
          code: `
            function Component() {
              useEffect(someCallback, []);
            }
          `,
        },
        // Not a hook (doesn't start with use)
        {
          code: `
            function Component({ value }) {
              myEffect(() => {
                console.log(value);
              }, []);
            }
          `,
        },
      ],
      invalid: [],
    });
  });

  describe('Global/Built-in Identifiers (Not Dependencies)', () => {
    ruleTester.run('ignore globals', hooksExhaustiveDeps, {
      valid: [
        // console is a global
        {
          code: `
            function Component() {
              useEffect(() => {
                console.log('test');
              }, []);
            }
          `,
        },
        // window/document are globals
        {
          code: `
            function Component() {
              useEffect(() => {
                window.scrollTo(0, 0);
                document.title = 'Test';
              }, []);
            }
          `,
        },
        // Math, JSON, etc are globals
        {
          code: `
            function Component() {
              useEffect(() => {
                const random = Math.random();
                const parsed = JSON.parse('{}');
              }, []);
            }
          `,
        },
        // setTimeout, fetch are globals
        {
          code: `
            function Component() {
              useEffect(() => {
                setTimeout(() => {}, 1000);
                fetch('/api');
              }, []);
            }
          `,
        },
      ],
      invalid: [],
    });
  });
});

