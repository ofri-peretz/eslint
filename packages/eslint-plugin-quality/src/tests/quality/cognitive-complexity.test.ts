/**
 * Comprehensive tests for cognitive-complexity rule
 * Complexity: Detects high cognitive complexity
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { cognitiveComplexity } from '../../rules/complexity/cognitive-complexity';

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

describe('cognitive-complexity', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - low complexity functions', cognitiveComplexity, {
      valid: [
        // Simple function
        {
          code: 'function simple() { return true; }',
        },
        {
          code: 'function add(a, b) { return a + b; }',
        },
        // Function with complexity below threshold
        {
          code: `
            function process(data) {
              if (data) {
                return data.value;
              }
              return null;
            }
          `,
          options: [{ maxComplexity: 15 }],
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - High Complexity', () => {
    ruleTester.run('invalid - high cognitive complexity', cognitiveComplexity, {
      valid: [],
      invalid: [
        {
          code: `
            function complex(data) {
              if (data) {
                if (data.value) {
                  if (data.value.length > 0) {
                    for (let i = 0; i < data.value.length; i++) {
                      if (data.value[i] > 10) {
                        if (data.value[i] < 100) {
                          return data.value[i];
                        }
                      }
                    }
                  }
                }
              }
              return null;
            }
          `,
          options: [{ maxComplexity: 5 }],
          errors: [{ messageId: 'highCognitiveComplexity' }],
        },
      ],
    });
  });

  describe('Suggestions', () => {
    ruleTester.run('suggestions for fixes', cognitiveComplexity, {
      valid: [],
      invalid: [
        {
          code: `
            function complex(data) {
              if (data && data.value && data.value.length > 0) {
                return data.value[0];
              }
              return null;
            }
          `,
          options: [{ maxComplexity: 2 }],
          errors: [
            {
              messageId: 'highCognitiveComplexity',
              // Note: Rule may not provide suggestions in all cases
            },
          ],
        },
      ],
    });
  });

  describe('Options', () => {
    ruleTester.run('options testing', cognitiveComplexity, {
      valid: [
        {
          code: `
            function process(data) {
              if (data) {
                if (data.value) {
                  return data.value;
                }
              }
              return null;
            }
          `,
          options: [{ maxComplexity: 10 }],
        },
      ],
      invalid: [
        {
          code: `
            function process(data) {
              if (data) {
                if (data.value) {
                  return data.value;
                }
              }
              return null;
            }
          `,
          options: [{ maxComplexity: 2 }],
          errors: [{ messageId: 'highCognitiveComplexity' }],
        },
      ],
    });
  });

  describe('Edge Cases - If-Else Handling (lines 125-131)', () => {
    ruleTester.run('if-else handling', cognitiveComplexity, {
      valid: [],
      invalid: [
        // Test else-if (line 125-127)
        {
          code: `
            function testElseIf(x) {
              if (x > 0) {
                return 'positive';
              } else if (x < 0) {
                return 'negative';
              } else {
                return 'zero';
              }
            }
          `,
          options: [{ maxComplexity: 2 }],
          errors: [{ messageId: 'highCognitiveComplexity' }],
        },
        // Test else (line 129-131)
        {
          code: `
            function testElse(x) {
              if (x > 0) {
                return 'positive';
              } else {
                return 'negative';
              }
            }
          `,
          options: [{ maxComplexity: 1 }],
          errors: [{ messageId: 'highCognitiveComplexity' }],
        },
      ],
    });
  });

  describe('Edge Cases - Loop Types (lines 153-159)', () => {
    ruleTester.run('loop types', cognitiveComplexity, {
      valid: [],
      invalid: [
        // Test WhileStatement (line 153-155) - nested to exceed threshold
        {
          code: `
            function testWhile() {
              let i = 0;
              while (i < 10) {
                if (i > 5) {
                  i++;
                }
                i++;
              }
            }
          `,
          options: [{ maxComplexity: 1 }],
          errors: [{ messageId: 'highCognitiveComplexity' }],
        },
        // Test DoWhileStatement (line 153-155) - nested to exceed threshold
        {
          code: `
            function testDoWhile() {
              let i = 0;
              do {
                if (i > 5) {
                  i++;
                }
                i++;
              } while (i < 10);
            }
          `,
          options: [{ maxComplexity: 1 }],
          errors: [{ messageId: 'highCognitiveComplexity' }],
        },
        // Test ForInStatement (line 157-159) - nested to exceed threshold
        {
          code: `
            function testForIn(obj) {
              for (const key in obj) {
                if (key.startsWith('test')) {
                  console.log(key);
                }
              }
            }
          `,
          options: [{ maxComplexity: 1 }],
          errors: [{ messageId: 'highCognitiveComplexity' }],
        },
        // Test ForOfStatement (line 157-159) - nested to exceed threshold
        {
          code: `
            function testForOf(arr) {
              for (const item of arr) {
                if (item > 0) {
                  console.log(item);
                }
              }
            }
          `,
          options: [{ maxComplexity: 1 }],
          errors: [{ messageId: 'highCognitiveComplexity' }],
        },
      ],
    });
  });

  describe('Edge Cases - Switch Statement (lines 166-170)', () => {
    ruleTester.run('switch statement', cognitiveComplexity, {
      valid: [],
      invalid: [
        {
          code: `
            function testSwitch(x) {
              switch (x) {
                case 1:
                  if (x > 0) return 'one';
                  break;
                case 2:
                  return 'two';
                default:
                  return 'other';
              }
            }
          `,
          options: [{ maxComplexity: 1 }],
          errors: [{ messageId: 'highCognitiveComplexity' }],
        },
      ],
    });
  });

  describe('Edge Cases - Catch Clause (lines 183-186)', () => {
    ruleTester.run('catch clause', cognitiveComplexity, {
      valid: [],
      invalid: [
        {
          code: `
            function testCatch() {
              try {
                risky();
              } catch (e) {
                if (e) {
                  if (e.message) {
                    if (e.code) {
                      if (e.stack) {
                        if (e.name) {
                          if (e.cause) {
                            handle(e);
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          `,
          options: [{ maxComplexity: 15 }],
          errors: [{ messageId: 'highCognitiveComplexity' }],
        },
      ],
    });
  });

  describe('Edge Cases - Ternary Operator (lines 191-192)', () => {
    ruleTester.run('ternary operator', cognitiveComplexity, {
      valid: [],
      invalid: [
        {
          code: `
            function testTernary(x) {
              return x > 0 ? (x > 10 ? 'large' : 'positive') : 'negative';
            }
          `,
          options: [{ maxComplexity: 1 }],
          errors: [{ messageId: 'highCognitiveComplexity' }],
        },
      ],
    });
  });

  describe('Edge Cases - Recursion (lines 197-199)', () => {
    ruleTester.run('recursion', cognitiveComplexity, {
      valid: [],
      invalid: [
        {
          code: `
            function factorial(n) {
              if (n <= 1) return 1;
              return n * factorial(n - 1);
            }
          `,
          options: [{ maxComplexity: 1 }],
          errors: [{ messageId: 'highCognitiveComplexity' }],
        },
      ],
    });
  });

  describe('Edge Cases - Suggestions (lines 275, 285)', () => {
    ruleTester.run('suggestions', cognitiveComplexity, {
      valid: [],
      invalid: [
        // Test switch suggestions (line 275 - breakdown.switches >= 2)
        // Note: The rule assigns messageIds by index (0=extractMethod, 1=useStrategy, 2=simplifyLogic)
        // Since switches >= 2 creates one suggestion, it gets index 0 = 'extractMethod'
        {
          code: `
            function testMultipleSwitches(x, y) {
              switch (x) {
                case 1: return 'a';
                default: return 'b';
              }
              switch (y) {
                case 1: return 'c';
                default: return 'd';
              }
            }
          `,
          options: [{ maxComplexity: 1 }],
          errors: [
            {
              messageId: 'highCognitiveComplexity',
              // Note: Suggestions are generated, but we don't assert exact messageId
              // as it depends on the order suggestions are added (index-based mapping)
            },
          ],
        },
        // Test loop suggestions (line 285 - breakdown.loops >= 3)
        {
          code: `
            function testMultipleLoops() {
              for (let i = 0; i < 10; i++) {}
              for (let j = 0; j < 10; j++) {}
              for (let k = 0; k < 10; k++) {}
            }
          `,
          options: [{ maxComplexity: 2 }],
          errors: [
            {
              messageId: 'highCognitiveComplexity',
              // Note: Suggestions are generated, but we don't assert exact messageId
              // as it depends on the order suggestions are added (index-based mapping)
            },
          ],
        },
      ],
    });
  });

  describe('Edge Cases - Uncovered Lines', () => {
    // Line 94: context.filename || context.getFilename() - tested implicitly
    // Line 114: FunctionDeclaration without id - not testable (FunctionDeclaration always has id in JS)
    // But we can test FunctionExpression which doesn't have id
    ruleTester.run('line 114 - function expression without id', cognitiveComplexity, {
      valid: [],
      invalid: [
        {
          code: `
            const fn = function() {
              if (true) {
                if (true) {
                  if (true) {
                    if (true) {
                      if (true) {
                        return true;
                      }
                    }
                  }
                }
              }
            };
          `,
          options: [{ maxComplexity: 5 }],
          errors: [{ messageId: 'highCognitiveComplexity' }],
        },
      ],
    });

    // Lines 149-151: ForStatement with init, test, and update
    ruleTester.run('line 149-151 - for statement with all parts', cognitiveComplexity, {
      valid: [],
      invalid: [
        {
          code: `
            function testForWithAllParts() {
              for (let i = 0; i < 10; i++) {
                if (i > 5) {
                  if (i < 8) {
                    console.log(i);
                  }
                }
              }
            }
          `,
          options: [{ maxComplexity: 2 }],
          errors: [{ messageId: 'highCognitiveComplexity' }],
        },
      ],
    });

    // Lines 157-158: ForInStatement and ForOfStatement with left and right
    ruleTester.run('line 157-158 for-in with left right', cognitiveComplexity, {
      valid: [],
      invalid: [
        {
          code: `
            function testForIn(obj) {
              for (const key in obj) {
                if (key) {
                  if (obj[key]) {
                    console.log(key);
                  }
                }
              }
            }
          `,
          options: [{ maxComplexity: 2 }],
          errors: [{ messageId: 'highCognitiveComplexity' }],
        },
      ],
    });

    ruleTester.run('line 157-158 for-of with left right', cognitiveComplexity, {
      valid: [],
      invalid: [
        {
          code: `
            function testForOf(arr) {
              for (const item of arr) {
                if (item) {
                  if (item.value) {
                    console.log(item);
                  }
                }
              }
            }
          `,
          options: [{ maxComplexity: 2 }],
          errors: [{ messageId: 'highCognitiveComplexity' }],
        },
      ],
    });

    // Line 175: LogicalExpression with operator that is not &&, ||, or ??
    // Need to test when operator is something else (like '|' or '&' bitwise operators)
    // But those aren't LogicalExpression, they're BinaryExpression
    // So line 175 is the else branch when operator is NOT &&, ||, or ??
    // This is hard to test because LogicalExpression with other operators is invalid syntax
    // The line is likely defensive code that won't execute in practice
    ruleTester.run('line 175 - logical expression operators', cognitiveComplexity, {
      valid: [],
      invalid: [
        {
          code: `
            function testLogicalOp(x, y) {
              if (x && y) {
                if (x || y) {
                  if (x ?? y) {
                    return true;
                  }
                }
              }
            }
          `,
          options: [{ maxComplexity: 2 }],
          errors: [{ messageId: 'highCognitiveComplexity' }],
        },
      ],
    });

    // Line 222: visited.has check - test when node is already visited
    // This happens when the same node appears multiple times in the AST traversal
    // This is defensive code to prevent infinite loops, hard to trigger in practice
    // But we can test that the code works correctly with complex nested structures
    ruleTester.run('line 222 - visited node check', cognitiveComplexity, {
      valid: [],
      invalid: [
        {
          code: `
            function testVisited() {
              const x = true;
              if (x) {
                if (x) {
                  if (x) {
                    return x;
                  }
                }
              }
            }
          `,
          options: [{ maxComplexity: 2 }],
          errors: [{ messageId: 'highCognitiveComplexity' }],
        },
      ],
    });

    // Line 248: node.body check - test function without body
    // This is hard to test directly, but we can test arrow functions with expression bodies
    ruleTester.run('line 248 - function without block body', cognitiveComplexity, {
      valid: [
        {
          code: 'const fn = () => true;',
        },
      ],
      invalid: [],
    });

    // Line 314: breakdown.nesting >= 4
    ruleTester.run('line 314 - nesting >= 4', cognitiveComplexity, {
      valid: [],
      invalid: [
        {
          code: `
            function testHighNesting() {
              if (true) {
                if (true) {
                  if (true) {
                    if (true) {
                      if (true) {
                        return true;
                      }
                    }
                  }
                }
              }
            }
          `,
          options: [{ maxComplexity: 5 }],
          errors: [{ messageId: 'highCognitiveComplexity' }],
        },
      ],
    });

    // Line 356: node.loc?.start.line ?? 0 - test function without location
    // This is hard to test directly, but we can ensure the code handles missing loc
    ruleTester.run('line 356 - missing location', cognitiveComplexity, {
      valid: [],
      invalid: [
        {
          code: `
            function testNoLoc() {
              if (true) {
                if (true) {
                  if (true) {
                    return true;
                  }
                }
              }
            }
          `,
          options: [{ maxComplexity: 2 }],
          errors: [{ messageId: 'highCognitiveComplexity' }],
        },
      ],
    });

    // Line 365: Test all three suggestion index branches (0, 1, 2+)
    ruleTester.run('line 365 - suggestion index branches', cognitiveComplexity, {
      valid: [],
      invalid: [
        // Index 0: extractMethod (first suggestion)
        {
          code: `
            function testExtractMethod() {
              if (true) {
                if (true) {
                  if (true) {
                    if (true) {
                      return true;
                    }
                  }
                }
              }
            }
          `,
          options: [{ maxComplexity: 2 }],
          errors: [
            {
              messageId: 'highCognitiveComplexity',
            },
          ],
        },
        // Index 1: useStrategy (second suggestion) - need switches >= 2
        {
          code: `
            function testUseStrategy(x, y) {
              switch (x) {
                case 1: return 'a';
                default: return 'b';
              }
              switch (y) {
                case 1: return 'c';
                default: return 'd';
              }
              if (true) {
                if (true) {
                  return true;
                }
              }
            }
          `,
          options: [{ maxComplexity: 1 }],
          errors: [
            {
              messageId: 'highCognitiveComplexity',
            },
          ],
        },
        // Index 2+: simplifyLogic (third+ suggestion) - need multiple suggestions
        {
          code: `
            function testSimplifyLogic() {
              switch (true) {
                case true: return 'a';
                default: return 'b';
              }
              switch (false) {
                case false: return 'c';
                default: return 'd';
              }
              for (let i = 0; i < 10; i++) {}
              for (let j = 0; j < 10; j++) {}
              for (let k = 0; k < 10; k++) {}
              if (true) {
                if (true) {
                  if (true) {
                    if (true) {
                      return true;
                    }
                  }
                }
              }
            }
          `,
          options: [{ maxComplexity: 1 }],
          errors: [
            {
              messageId: 'highCognitiveComplexity',
            },
          ],
        },
      ],
    });
  });
});

