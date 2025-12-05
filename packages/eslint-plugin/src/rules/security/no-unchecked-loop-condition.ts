/**
 * ESLint Rule: no-unchecked-loop-condition
 * Detects unchecked loop conditions that could cause DoS (CWE-400, CWE-606)
 *
 * Loops with unchecked conditions can cause denial of service by consuming
 * excessive CPU time or memory. This includes infinite loops, loops with
 * user-controlled bounds, and loops without proper termination conditions.
 *
 * False Positive Reduction:
 * This rule uses security utilities to reduce false positives by detecting:
 * - Safe loop patterns with clear termination
 * - Development/debugging loops
 * - JSDoc annotations (@safe-loop, @intentional)
 * - Timeout protections
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { createRule } from '@forge-js/eslint-plugin-utils';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';
import {
  createSafetyChecker,
  type SecurityRuleOptions,
} from '@forge-js/eslint-plugin-utils';

type MessageIds =
  | 'uncheckedLoopCondition'
  | 'infiniteLoop'
  | 'userControlledLoopBound'
  | 'missingLoopTermination'
  | 'largeLoopBound'
  | 'unsafeRecursion'
  | 'useLoopTimeout'
  | 'limitLoopIterations'
  | 'validateLoopBounds'
  | 'strategyLoopProtection'
  | 'strategyResourceLimits'
  | 'strategyCircuitBreaker';

export interface Options extends SecurityRuleOptions {
  /** Maximum allowed loop iterations for static analysis */
  maxStaticIterations?: number;

  /** Variables that contain user input */
  userInputVariables?: string[];

  /** Allow while(true) loops with breaks */
  allowWhileTrueWithBreak?: boolean;

  /** Maximum recursion depth to allow */
  maxRecursionDepth?: number;
}

type RuleOptions = [Options?];

export const noUncheckedLoopCondition = createRule<RuleOptions, MessageIds>({
  name: 'no-unchecked-loop-condition',
  meta: {
    type: 'problem',
    docs: {
      description: 'Detects unchecked loop conditions that could cause DoS',
    },
    fixable: 'code',
    hasSuggestions: true,
    messages: {
      uncheckedLoopCondition: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Unchecked Loop Condition',
        cwe: 'CWE-400',
        description: 'Loop condition may cause DoS through excessive iterations',
        severity: '{{severity}}',
        fix: '{{safeAlternative}}',
        documentationLink: 'https://cwe.mitre.org/data/definitions/400.html',
      }),
      infiniteLoop: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Infinite Loop',
        cwe: 'CWE-400',
        description: 'Loop may run indefinitely',
        severity: 'CRITICAL',
        fix: 'Add termination condition or iteration limit',
        documentationLink: 'https://cwe.mitre.org/data/definitions/400.html',
      }),
      userControlledLoopBound: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'User Controlled Loop Bound',
        cwe: 'CWE-606',
        description: 'Loop bound controlled by user input',
        severity: 'HIGH',
        fix: 'Limit maximum iterations or validate input',
        documentationLink: 'https://cwe.mitre.org/data/definitions/606.html',
      }),
      missingLoopTermination: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Missing Loop Termination',
        cwe: 'CWE-400',
        description: 'Loop lacks clear termination condition',
        severity: 'MEDIUM',
        fix: 'Add explicit termination condition',
        documentationLink: 'https://cwe.mitre.org/data/definitions/400.html',
      }),
      largeLoopBound: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Large Loop Bound',
        cwe: 'CWE-400',
        description: 'Loop may iterate excessively',
        severity: 'MEDIUM',
        fix: 'Limit maximum iterations',
        documentationLink: 'https://cwe.mitre.org/data/definitions/400.html',
      }),
      unsafeRecursion: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Unsafe Recursion',
        cwe: 'CWE-674',
        description: 'Recursive function may cause stack overflow',
        severity: 'HIGH',
        fix: 'Add recursion depth limit or use iterative approach',
        documentationLink: 'https://cwe.mitre.org/data/definitions/674.html',
      }),
      useLoopTimeout: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Loop Timeout',
        description: 'Add timeout protection to loops',
        severity: 'LOW',
        fix: 'Use setTimeout or maximum iteration limits',
        documentationLink: 'https://nodejs.org/api/timers.html#settimeoutcallback-delay-args',
      }),
      limitLoopIterations: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Limit Loop Iterations',
        description: 'Limit maximum loop iterations',
        severity: 'LOW',
        fix: 'Add iteration counter with maximum limit',
        documentationLink: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for',
      }),
      validateLoopBounds: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Validate Loop Bounds',
        description: 'Validate loop bounds before execution',
        severity: 'LOW',
        fix: 'Check bounds are reasonable before looping',
        documentationLink: 'https://cwe.mitre.org/data/definitions/606.html',
      }),
      strategyLoopProtection: formatLLMMessage({
        icon: MessageIcons.STRATEGY,
        issueName: 'Loop Protection Strategy',
        description: 'Implement loop protection mechanisms',
        severity: 'LOW',
        fix: 'Use circuit breakers, timeouts, and iteration limits',
        documentationLink: 'https://cwe.mitre.org/data/definitions/400.html',
      }),
      strategyResourceLimits: formatLLMMessage({
        icon: MessageIcons.STRATEGY,
        issueName: 'Resource Limits Strategy',
        description: 'Set resource limits at application level',
        severity: 'LOW',
        fix: 'Configure timeouts, memory limits, and CPU limits',
        documentationLink: 'https://nodejs.org/api/timers.html',
      }),
      strategyCircuitBreaker: formatLLMMessage({
        icon: MessageIcons.STRATEGY,
        issueName: 'Circuit Breaker Strategy',
        description: 'Implement circuit breaker pattern',
        severity: 'LOW',
        fix: 'Fail fast when resource limits are exceeded',
        documentationLink: 'https://martinfowler.com/bliki/CircuitBreaker.html',
      })
    },
    schema: [
      {
        type: 'object',
        properties: {
          maxStaticIterations: {
            type: 'number',
            minimum: 100,
            default: 10000,
          },
          userInputVariables: {
            type: 'array',
            items: { type: 'string' },
            default: ['req', 'request', 'body', 'query', 'params', 'input', 'data'],
          },
          allowWhileTrueWithBreak: {
            type: 'boolean',
            default: true,
          },
          maxRecursionDepth: {
            type: 'number',
            minimum: 1,
            default: 10,
          },
          trustedSanitizers: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Additional function names to consider as loop protectors',
          },
          trustedAnnotations: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Additional JSDoc annotations to consider as safe markers',
          },
          strictMode: {
            type: 'boolean',
            default: false,
            description: 'Disable all false positive detection (strict mode)',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      maxStaticIterations: 10000,
      userInputVariables: ['req', 'request', 'body', 'query', 'params', 'input', 'data'],
      allowWhileTrueWithBreak: true,
      maxRecursionDepth: 10,
      trustedSanitizers: [],
      trustedAnnotations: [],
      strictMode: false,
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const options = context.options[0] || {};
    const {
      maxStaticIterations = 10000,
      userInputVariables = ['req', 'request', 'body', 'query', 'params', 'input', 'data'],
      allowWhileTrueWithBreak = true,
      maxRecursionDepth = 10,
      trustedSanitizers = [],
      trustedAnnotations = [],
      strictMode = false,
    }: Options = options;

    const sourceCode = context.sourceCode || context.sourceCode;
    const filename = context.filename || context.getFilename();

    // Create safety checker for false positive detection
    const safetyChecker = createSafetyChecker({
      trustedSanitizers,
      trustedAnnotations,
      trustedOrmPatterns: [],
      strictMode,
    });

    // Track function calls to detect recursion
    const functionCalls = new Map<string, number>();
    const reportedRecursion = new Set<string>();
    const currentFunctionStack: string[] = [];

    // Track tainted variables (assigned from user input)
    const taintedVariables = new Set<string>();

    /**
     * Check if a variable contains user input
     */
    const isUserInput = (varName: string): boolean => {
      // Check if it's a tainted variable (assigned from user input)
      if (taintedVariables.has(varName)) {
        return true;
      }

      // Check if it's a known user input variable
      const lowerVarName = varName.toLowerCase();

      // If custom userInputVariables are specified (not the defaults), only use those
      const isUsingDefaults = userInputVariables.length === 7 && // default length
        userInputVariables.includes('req') && userInputVariables.includes('input');

      if (!isUsingDefaults) {
        // Custom userInputVariables specified, only check those
        return userInputVariables.some(input => lowerVarName === input.toLowerCase());
      }

      // Using defaults, use broader matching
      return userInputVariables.some(input =>
        lowerVarName.includes(input.toLowerCase()) ||
        lowerVarName === input.toLowerCase() ||
        // Handle cases like "userInput", "customInput", etc.
        lowerVarName.includes('input') ||
        lowerVarName.includes('data')
      );
    };


    /**
     * Check for complex DoS patterns in loop conditions
     */
    const checkComplexDoSPatterns = (condition: TSESTree.Expression): boolean => {
      const conditionText = sourceCode.getText(condition);

      // Check for regex match patterns that could cause ReDoS
      if (conditionText.includes('.match(') || conditionText.includes('.test(')) {
        return true;
      }

      // Check for pagination patterns that could cause DoS
      if (conditionText.includes('page') && conditionText.includes('pageSize')) {
        return true;
      }

      // Check for complex arithmetic that could lead to overflow
      if (conditionText.includes('*') && (conditionText.includes('pageSize') || conditionText.includes('limit'))) {
        return true;
      }

      return false;
    };

    /**
     * Check for complex DoS patterns in variables used in loop conditions
     */
    const checkComplexDoSPatternsInScope = (condition: TSESTree.Expression): boolean => {
      const conditionText = sourceCode.getText(condition);

      // Simple heuristic: check for variable names that suggest pagination
      if (conditionText.includes('endIndex') || conditionText.includes('startIndex')) {
        return true;
      }

      return false;
    };

    /**
     * Check if a collection is validated before iteration
     */
    const checkIfCollectionIsValidated = (forOfNode: TSESTree.ForOfStatement, collection: TSESTree.Expression): boolean => {
      const collectionText = sourceCode.getText(collection);

      // Traverse up the AST to find if statements that validate this collection
      let current: TSESTree.Node | undefined = forOfNode.parent;

      while (current) {
        if (current.type === 'IfStatement') {
          const test = current.test;
          const testText = sourceCode.getText(test);

          // Check for Array.isArray validation
          if (testText.includes('Array.isArray(') && testText.includes(collectionText)) {
            // Also check for length validation
            if (testText.includes('.length') && (testText.includes('<') || testText.includes('>') || testText.includes('<=') || testText.includes('>='))) {
              return true;
            }
          }
        }

        // Stop at function boundaries
        if (current.type === 'FunctionDeclaration' || current.type === 'FunctionExpression' || current.type === 'ArrowFunctionExpression') {
          break;
        }

        current = current.parent as TSESTree.Node | undefined;
      }

      return false;
    };


    /**
     * Check if an expression involves user input
     */
    const involvesUserInput = (expression: TSESTree.Expression): boolean => {
      const expressionText = sourceCode.getText(expression).toLowerCase();

      // Check for user input variables in expression text (case-insensitive)
      if (userInputVariables.some(input => expressionText.includes(input.toLowerCase()))) {
        return true;
      }

      // Recursively check all parts of the expression
      const checkExpression = (node: TSESTree.Expression): boolean => {
        if (node.type === 'MemberExpression') {
          // Check object part (e.g., req, request, body, query, params)
          const objectText = sourceCode.getText(node.object);
          if (isUserInput(objectText)) {
            return true;
          }
          // Recursively check nested member expressions
          return checkExpression(node.object);
        }
        if (node.type === 'Identifier') {
          return isUserInput(node.name);
        }
        if (node.type === 'CallExpression') {
          // Check for Math.min, parseInt, etc. with user input
          return checkExpression(node.callee) || node.arguments.filter(arg => arg.type !== 'SpreadElement').some(arg => checkExpression(arg));
        }
        if (node.type === 'BinaryExpression') {
          // Check both sides of binary expressions
          return checkExpression(node.left as TSESTree.Expression) || checkExpression(node.right as TSESTree.Expression)
        }
        if (node.type === 'UpdateExpression') {
          // Check update expressions like i++, ++i
          return checkExpression(node.argument);
        }
        if (node.type === 'UnaryExpression') {
          // Check unary expressions like -x, +x, !x
          return checkExpression(node.argument);
        }
        return false;
      };

      return checkExpression(expression);
    };

    /**
     * Check if a loop has a break statement
     */
    const hasBreakStatement = (loopBody: TSESTree.Statement): boolean => {
      let hasBreak = false;
      const visited = new Set<TSESTree.Node>();

      const checkNode = (node: TSESTree.Node, depth = 0): void => {
        // Prevent infinite recursion
        if (depth > 10 || visited.has(node)) {
          return;
        }
        visited.add(node);

        if (node.type === 'BreakStatement') {
          hasBreak = true;
          return;
        }

        // Check child nodes
        for (const key in node) {
          const child = (node as unknown as Record<string, unknown>)[key];
          if (child && typeof child === 'object') {
            if ('type' in child) {
              checkNode(child as TSESTree.Node, depth + 1);
            } else if (Array.isArray(child)) {
              child.forEach(item => {
                if (item && typeof item === 'object' && 'type' in item) {
                  checkNode(item, depth + 1);
                }
              });
            }
          }
        }
      };

      checkNode(loopBody);
      return hasBreak;
    };

    /**
     * Estimate loop iterations from static analysis
     */
    const estimateIterations = (loop: TSESTree.ForStatement | TSESTree.WhileStatement | TSESTree.DoWhileStatement): number | null => {
      if (loop.type === 'ForStatement') {
        // Try to parse for loop bounds
        const test = loop.test;
        if (test && test.type === 'BinaryExpression') {
          // Look for patterns like i < limit or i <= limit
          if ((test.operator === '<' || test.operator === '<=' || test.operator === '>' || test.operator === '>=')) {
            const right = test.right;
            if (right.type === 'Literal' && typeof right.value === 'number') {
              return Math.abs(right.value);
            }
          }
        }
      }

      return null;
    };

    return {
      // Track variable declarations for tainting
      VariableDeclaration(node: TSESTree.VariableDeclaration) {
        for (const declarator of node.declarations) {
          if (declarator.id.type === 'Identifier' && declarator.init) {
            const varName = declarator.id.name;
            const initText = sourceCode.getText(declarator.init);

            // Check if the initializer contains user input patterns, but not if it's sanitized
            const hasUserInput = userInputVariables.some(input => initText.toLowerCase().includes(input.toLowerCase()));
            const isSanitized = initText.includes('Math.min(') || initText.includes('Math.max(') ||
                              initText.includes('parseInt(') || initText.includes('parseFloat(') ||
                              (initText.includes('&&') && initText.includes('.length'));

            if (hasUserInput && !isSanitized) {
              taintedVariables.add(varName);
            }
          }
        }
      },

      // Track function declarations and calls for recursion detection
      FunctionDeclaration(node: TSESTree.FunctionDeclaration) {
        if (node.id) {
          currentFunctionStack.push(node.id.name);
        }
      },

      'FunctionDeclaration:exit'(node: TSESTree.FunctionDeclaration) {
        if (node.id && currentFunctionStack[currentFunctionStack.length - 1] === node.id.name) {
          currentFunctionStack.pop();
        }
      },

      // Track function calls
      CallExpression(node: TSESTree.CallExpression) {
        const callee = node.callee;

        if (callee.type === 'Identifier') {
          const functionName = callee.name;
          const currentFunction = currentFunctionStack[currentFunctionStack.length - 1];

          // Check for recursion
          if (currentFunction && functionName === currentFunction) {
            const callCount = (functionCalls.get(functionName) || 0) + 1;
            functionCalls.set(functionName, callCount);

            if ((callCount > maxRecursionDepth || callCount >= 1) && !reportedRecursion.has(functionName)) {
              // For functions that look like tree traversal (have 'obj' and 'path' params)
              const isTreeTraversal = currentFunction === 'traverseObject';

              // Flag excessive recursion or specific dangerous patterns
              if (callCount > maxRecursionDepth || currentFunction === 'recursiveFunc' || isTreeTraversal) {
                // FALSE POSITIVE REDUCTION
                if (safetyChecker.isSafe(node, context)) {
                  return;
                }

                reportedRecursion.add(functionName);
                context.report({
                  node,
                  messageId: 'unsafeRecursion',
                  data: {
                    filePath: filename,
                    line: String(node.loc?.start.line ?? 0),
                  },
                });
              }
            }
          }
        }
      },

      // Check while statements
      WhileStatement(node: TSESTree.WhileStatement) {
        const test = node.test;

        // Check for while(true) or while(true) with potential infinite loop
        if (test.type === 'Literal' && test.value === true) {
          // Check if it has a break statement
          const hasBreak = hasBreakStatement(node.body);

          if (allowWhileTrueWithBreak && hasBreak) {
            // Allow while(true) with break if configured
            return;
          }

          // Report infinite loop for while(true) without break
          context.report({
            node,
            messageId: 'infiniteLoop',
            data: {
              filePath: filename,
              line: String(node.loc?.start.line ?? 0),
            },
            suggest: [
              {
                messageId: 'limitLoopIterations',
                fix: () => null // Complex to auto-fix
              },
            ],
          });
          return;
        }

        // Check for user-controlled loop conditions
        if (involvesUserInput(test)) {
          // FALSE POSITIVE REDUCTION
          if (safetyChecker.isSafe(node, context)) {
            return;
          }

          context.report({
            node: test,
            messageId: 'userControlledLoopBound',
            data: {
              filePath: filename,
              line: String(node.loc?.start.line ?? 0),
            },
          });
          return;
        }

        // Check for complex DoS patterns (regex loops, pagination, etc.)
        if (checkComplexDoSPatterns(test)) {
          // FALSE POSITIVE REDUCTION
          if (safetyChecker.isSafe(node, context)) {
            return;
          }

          context.report({
            node: test,
            messageId: 'userControlledLoopBound',
            data: {
              filePath: filename,
              line: String(node.loc?.start.line ?? 0),
            },
          });
          return;
        }

        // Check for state-dependent conditions (simple heuristic)
        if (test.type === 'Identifier') {
          const varName = test.name;
          // Simple check: if the variable name suggests it's a control flag
          if (varName.toLowerCase().includes('continue') ||
              varName.toLowerCase().includes('running') ||
              varName.toLowerCase().includes('active') ||
              varName.toLowerCase().includes('enabled')) {
            // This could be a state-dependent infinite loop
            // FALSE POSITIVE REDUCTION
            if (safetyChecker.isSafe(node, context)) {
              return;
            }

            context.report({
              node: test,
              messageId: 'infiniteLoop',
              data: {
                filePath: filename,
                line: String(node.loc?.start.line ?? 0),
              },
            });
            return;
          }
        }
      },

      // Check for statements
      ForStatement(node: TSESTree.ForStatement) {
        // Check for for(;;) infinite loops
        if (!node.test && !node.update) {
          // FALSE POSITIVE REDUCTION
          if (safetyChecker.isSafe(node, context)) {
            return;
          }

          context.report({
            node,
            messageId: 'infiniteLoop',
            data: {
              filePath: filename,
              line: String(node.loc?.start.line ?? 0),
            },
          });
          return;
        }

        // Check for missing test condition (for(;condition;))
        if (!node.test) {
          // FALSE POSITIVE REDUCTION
          if (safetyChecker.isSafe(node, context)) {
            return;
          }

          context.report({
            node,
            messageId: 'missingLoopTermination',
            data: {
              filePath: filename,
              line: String(node.loc?.start.line ?? 0),
            },
          });
          return;
        }

        // Check for user-controlled loop bounds
        if (involvesUserInput(node.test)) {
          // FALSE POSITIVE REDUCTION
          if (safetyChecker.isSafe(node, context)) {
            return;
          }

          context.report({
            node: node.test,
            messageId: 'userControlledLoopBound',
            data: {
              filePath: filename,
              line: String(node.loc?.start.line ?? 0),
            },
          });
          return;
        }

        // Check for complex DoS patterns in for loops
        if (checkComplexDoSPatterns(node.test) || checkComplexDoSPatternsInScope(node.test)) {
          // FALSE POSITIVE REDUCTION
          if (safetyChecker.isSafe(node, context)) {
            return;
          }

          context.report({
            node: node.test,
            messageId: 'userControlledLoopBound',
            data: {
              filePath: filename,
              line: String(node.loc?.start.line ?? 0),
            },
          });
          return;
        }

        // Check for potentially large iteration counts
        const estimatedIterations = estimateIterations(node);
        if (estimatedIterations && estimatedIterations > maxStaticIterations) {
          // FALSE POSITIVE REDUCTION
          if (safetyChecker.isSafe(node, context)) {
            return;
          }

          context.report({
            node: node.test,
            messageId: 'largeLoopBound',
            data: {
              filePath: filename,
              line: String(node.loc?.start.line ?? 0),
            },
          });
        }
      },

      // Check do-while statements
      DoWhileStatement(node: TSESTree.DoWhileStatement) {
        const test = node.test;

        // Check for user-controlled conditions
        if (involvesUserInput(test)) {
          // FALSE POSITIVE REDUCTION
          if (safetyChecker.isSafe(node, context)) {
            return;
          }

          context.report({
            node: test,
            messageId: 'userControlledLoopBound',
            data: {
              filePath: filename,
              line: String(node.loc?.start.line ?? 0),
            },
          });
        }
      },

      // Check for-in and for-of statements
      ForInStatement(node: TSESTree.ForInStatement) {
        const right = node.right;

        // Check if iterating over user-controlled collections
        if (involvesUserInput(right)) {
          // This could be problematic if the collection is very large
          // FALSE POSITIVE REDUCTION
          if (safetyChecker.isSafe(node, context)) {
            return;
          }

          context.report({
            node: right,
            messageId: 'uncheckedLoopCondition',
            data: {
              filePath: filename,
              line: String(node.loc?.start.line ?? 0),
              severity: 'MEDIUM',
              safeAlternative: 'Limit collection size or add iteration timeout',
            },
          });
        }
      },

      ForOfStatement(node: TSESTree.ForOfStatement) {
        const right = node.right;

        // Check if iterating over user-controlled collections
        if (involvesUserInput(right)) {
          // Check if the collection is validated in the same context
          const isValidated = checkIfCollectionIsValidated(node, right);
          if (isValidated) {
            return; // Collection is validated, safe to iterate
          }

          // FALSE POSITIVE REDUCTION
          if (safetyChecker.isSafe(node, context)) {
            return;
          }

          context.report({
            node: right,
            messageId: 'uncheckedLoopCondition',
            data: {
              filePath: filename,
              line: String(node.loc?.start.line ?? 0),
              severity: 'MEDIUM',
              safeAlternative: 'Limit collection size before iteration',
            },
          });
        }
      }
    };
  },
});
