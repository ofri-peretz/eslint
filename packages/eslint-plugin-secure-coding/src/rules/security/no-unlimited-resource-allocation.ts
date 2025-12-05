/**
 * ESLint Rule: no-unlimited-resource-allocation
 * Detects unlimited resource allocation vulnerabilities (CWE-770)
 *
 * Unlimited resource allocation can cause denial of service by exhausting
 * system resources like memory, file handles, or network connections.
 * This rule detects patterns where resources are allocated without limits.
 *
 * False Positive Reduction:
 * This rule uses security utilities to reduce false positives by detecting:
 * - Safe resource allocation patterns
 * - Proper resource limits
 * - JSDoc annotations (@limited-resource, @safe-allocation)
 * - Resource cleanup patterns
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import {
  createSafetyChecker,
  type SecurityRuleOptions,
} from '@interlace/eslint-devkit';

type MessageIds =
  | 'unlimitedResourceAllocation'
  | 'unlimitedBufferAllocation'
  | 'unlimitedFileOperations'
  | 'unlimitedNetworkConnections'
  | 'unlimitedMemoryAllocation'
  | 'userControlledResourceSize'
  | 'missingResourceLimits'
  | 'resourceAllocationInLoop'
  | 'implementResourceLimits'
  | 'validateResourceSize'
  | 'useResourcePools'
  | 'strategyResourceManagement'
  | 'strategyRateLimiting'
  | 'strategyResourceCleanup';

export interface Options extends SecurityRuleOptions {
  /** Maximum allowed resource size for static analysis */
  maxResourceSize?: number;

  /** Variables that contain user input */
  userInputVariables?: string[];

  /** Safe resource allocation functions */
  safeResourceFunctions?: string[];

  /** Require resource validation */
  requireResourceValidation?: boolean;
}

type RuleOptions = [Options?];

export const noUnlimitedResourceAllocation = createRule<RuleOptions, MessageIds>({
  name: 'no-unlimited-resource-allocation',
  meta: {
    type: 'problem',
    docs: {
      description: 'Detects unlimited resource allocation that could cause DoS',
    },
    fixable: 'code',
    hasSuggestions: true,
    messages: {
      unlimitedResourceAllocation: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Unlimited Resource Allocation',
        cwe: 'CWE-770',
        description: 'Resource allocation without limits',
        severity: '{{severity}}',
        fix: '{{safeAlternative}}',
        documentationLink: 'https://cwe.mitre.org/data/definitions/770.html',
      }),
      unlimitedBufferAllocation: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Unlimited Buffer Allocation',
        cwe: 'CWE-770',
        description: 'Buffer allocated without size limits',
        severity: 'HIGH',
        fix: 'Set maximum buffer size limits',
        documentationLink: 'https://nodejs.org/api/buffer.html',
      }),
      unlimitedFileOperations: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Unlimited File Operations',
        cwe: 'CWE-770',
        description: 'File operations without size limits',
        severity: 'MEDIUM',
        fix: 'Validate file size before operations',
        documentationLink: 'https://nodejs.org/api/fs.html',
      }),
      unlimitedNetworkConnections: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Unlimited Network Connections',
        cwe: 'CWE-770',
        description: 'Network connections without limits',
        severity: 'MEDIUM',
        fix: 'Limit concurrent connections',
        documentationLink: 'https://nodejs.org/api/http.html',
      }),
      unlimitedMemoryAllocation: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Unlimited Memory Allocation',
        cwe: 'CWE-770',
        description: 'Memory allocated without limits',
        severity: 'MEDIUM',
        fix: 'Set memory allocation limits',
        documentationLink: 'https://nodejs.org/api/buffer.html',
      }),
      userControlledResourceSize: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'User Controlled Resource Size',
        cwe: 'CWE-770',
        description: 'Resource size controlled by user input',
        severity: 'HIGH',
        fix: 'Validate and limit user-controlled resource sizes',
        documentationLink: 'https://cwe.mitre.org/data/definitions/770.html',
      }),
      missingResourceLimits: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Missing Resource Limits',
        cwe: 'CWE-770',
        description: 'Resource allocation lacks proper limits',
        severity: 'MEDIUM',
        fix: 'Implement resource size validation',
        documentationLink: 'https://cwe.mitre.org/data/definitions/770.html',
      }),
      resourceAllocationInLoop: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Resource Allocation in Loop',
        cwe: 'CWE-770',
        description: 'Resource allocation inside loop without limits',
        severity: 'HIGH',
        fix: 'Move resource allocation outside loop or add iteration limits',
        documentationLink: 'https://cwe.mitre.org/data/definitions/770.html',
      }),
      implementResourceLimits: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Implement Resource Limits',
        description: 'Add limits to resource allocation',
        severity: 'LOW',
        fix: 'const limitedSize = Math.min(userSize, MAX_SIZE);',
        documentationLink: 'https://cwe.mitre.org/data/definitions/770.html',
      }),
      validateResourceSize: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Validate Resource Size',
        description: 'Validate resource size before allocation',
        severity: 'LOW',
        fix: 'if (size > MAX_SIZE) throw new Error("Size too large");',
        documentationLink: 'https://cwe.mitre.org/data/definitions/770.html',
      }),
      useResourcePools: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Resource Pools',
        description: 'Use resource pools for better control',
        severity: 'LOW',
        fix: 'Implement connection pooling and resource reuse',
        documentationLink: 'https://en.wikipedia.org/wiki/Object_pool_pattern',
      }),
      strategyResourceManagement: formatLLMMessage({
        icon: MessageIcons.STRATEGY,
        issueName: 'Resource Management Strategy',
        description: 'Implement comprehensive resource management',
        severity: 'LOW',
        fix: 'Use resource pools, limits, and cleanup mechanisms',
        documentationLink: 'https://cwe.mitre.org/data/definitions/770.html',
      }),
      strategyRateLimiting: formatLLMMessage({
        icon: MessageIcons.STRATEGY,
        issueName: 'Rate Limiting Strategy',
        description: 'Implement rate limiting for resource allocation',
        severity: 'LOW',
        fix: 'Use rate limiters to prevent resource exhaustion',
        documentationLink: 'https://en.wikipedia.org/wiki/Rate_limiting',
      }),
      strategyResourceCleanup: formatLLMMessage({
        icon: MessageIcons.STRATEGY,
        issueName: 'Resource Cleanup Strategy',
        description: 'Ensure proper resource cleanup',
        severity: 'LOW',
        fix: 'Implement try-finally blocks and resource disposal',
        documentationLink: 'https://en.wikipedia.org/wiki/Resource_management_(computing)',
      })
    },
    schema: [
      {
        type: 'object',
        properties: {
          maxResourceSize: {
            type: 'number',
            minimum: 1024,
            default: 1048576, // 1MB
          },
          userInputVariables: {
            type: 'array',
            items: { type: 'string' },
            default: ['req', 'request', 'body', 'query', 'params', 'input', 'data'],
          },
          safeResourceFunctions: {
            type: 'array',
            items: { type: 'string' },
            default: ['validateSize', 'checkLimits', 'limitResource', 'safeAlloc'],
          },
          requireResourceValidation: {
            type: 'boolean',
            default: true,
          },
          trustedSanitizers: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Additional function names to consider as resource validators',
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
      maxResourceSize: 1048576, // 1MB
      userInputVariables: ['req', 'request', 'body', 'query', 'params', 'input', 'data'],
      safeResourceFunctions: ['validateSize', 'checkLimits', 'limitResource', 'safeAlloc'],
      requireResourceValidation: true,
      trustedSanitizers: [],
      trustedAnnotations: [],
      strictMode: false,
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const options = context.options[0] || {};
    const {
      maxResourceSize = 1048576,
      userInputVariables = ['req', 'request', 'body', 'query', 'params', 'input', 'data'],
      safeResourceFunctions = ['validateSize', 'checkLimits', 'limitResource', 'safeAlloc'],
      requireResourceValidation = true,
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

    /**
     * Check if an expression contains user input
     */
    const isUserInput = (expression: TSESTree.Expression): boolean => {
      const exprText = sourceCode.getText(expression);
      return userInputVariables.some(input => exprText.includes(input));
    };

    /**
     * Check if resource allocation has size validation
     */
    const hasSizeValidation = (node: TSESTree.CallExpression | TSESTree.NewExpression): boolean => {
      const args = node.arguments;
      if (args.length === 0) {
        return false;
      }

      // Check if size argument is a validated expression
      const sizeArg = args[0];
      const sizeText = sourceCode.getText(sizeArg);

      // Look for validation patterns
      return sizeText.includes('Math.min(') ||
             sizeText.includes('Math.max(') ||
             sizeText.includes('Math.clamp(') ||
             safeResourceFunctions.some(func => sizeText.includes(func));
    };

    /**
     * Check if we're inside a loop
     */
    const isInsideLoop = (node: TSESTree.Node): boolean => {
      let current: TSESTree.Node | undefined = node;

      while (current) {
        if (current.type === 'ForStatement' ||
            current.type === 'WhileStatement' ||
            current.type === 'DoWhileStatement' ||
            current.type === 'ForInStatement' ||
            current.type === 'ForOfStatement') {
          return true;
        }
        current = current.parent as TSESTree.Node;
      }

      return false;
    };

    /**
     * Estimate resource size from static analysis
     */
    const estimateResourceSize = (sizeExpression: TSESTree.Expression): number | null => {
      if (sizeExpression.type === 'Literal' && typeof sizeExpression.value === 'number') {
        return sizeExpression.value;
      }

      // Handle binary expressions like 1024 * 1024 * 100
      if (sizeExpression.type === 'BinaryExpression') {
        const left = estimateResourceSize(sizeExpression.left as TSESTree.Expression);
        const right = estimateResourceSize(sizeExpression.right as TSESTree.Expression);

        if (left !== null && right !== null) {
          switch (sizeExpression.operator) {
            case '*':
              return left * right;
            case '+':
              return left + right;
            case '-':
              return left - right;
            case '/':
              return right !== 0 ? left / right : null;
            default:
              return null;
          }
        }
      }

      return null;
    };

    return {
      // Check Buffer allocation
      CallExpression(node: TSESTree.CallExpression) {
        const callee = node.callee;
        const calleeText = sourceCode.getText(callee);

        // Check for Buffer.alloc() or new Buffer()
        if ((callee.type === 'MemberExpression' &&
             callee.object.type === 'Identifier' &&
             callee.object.name === 'Buffer' &&
             callee.property.type === 'Identifier' &&
             callee.property.name === 'alloc') ||
            (callee.type === 'NewExpression' &&
             callee.callee.type === 'Identifier' &&
             callee.callee.name === 'Buffer')) {

          const args = node.arguments;
          if (args.length > 0) {
            const sizeArg = args[0];

            // Check if size comes from user input (but skip if validated)
            if (sizeArg.type !== 'SpreadElement' && isUserInput(sizeArg) && !hasSizeValidation(node)) {
              // FALSE POSITIVE REDUCTION
              if (safetyChecker.isSafe(node, context)) {
                return;
              }

              context.report({
                node: sizeArg,
                messageId: 'userControlledResourceSize',
                data: {
                  filePath: filename,
                  line: String(node.loc?.start.line ?? 0),
                },
              });
              return;
            }

            // Check if size exceeds limits
            const estimatedSize = sizeArg.type === 'SpreadElement' ? null : estimateResourceSize(sizeArg);
            if (estimatedSize && estimatedSize > maxResourceSize) {
              // FALSE POSITIVE REDUCTION
              if (safetyChecker.isSafe(node, context)) {
                return;
              }

              context.report({
                node: sizeArg,
                messageId: 'unlimitedBufferAllocation',
                data: {
                  filePath: filename,
                  line: String(node.loc?.start.line ?? 0),
                },
              });
              return;
            }

            // Check if no size validation present (only for non-literal sizes from user input)
            const isLiteralSize = sizeArg.type === 'Literal' && typeof sizeArg.value === 'number';
            const comesFromUserInput = sizeArg.type !== 'SpreadElement' && isUserInput(sizeArg);
            if (requireResourceValidation && !hasSizeValidation(node) && !isLiteralSize && comesFromUserInput) {
              // FALSE POSITIVE REDUCTION
              if (safetyChecker.isSafe(node, context)) {
                return;
              }

              context.report({
                node,
                messageId: 'missingResourceLimits',
                data: {
                  filePath: filename,
                  line: String(node.loc?.start.line ?? 0),
                },
              });
            }
          }
        }

        // Check for multer configuration without limits
        if (callee.type === 'Identifier' && callee.name === 'multer') {
          const args = node.arguments;
          if (args.length > 0 && args[0].type === 'ObjectExpression') {
            const props = args[0].properties;
            const hasLimits = props.some(prop =>
              prop.type === 'Property' &&
              prop.key.type === 'Identifier' &&
              prop.key.name === 'limits'
            );

            if (!hasLimits) {
              // FALSE POSITIVE REDUCTION
              if (safetyChecker.isSafe(node, context)) {
                return;
              }

              context.report({
                node,
                messageId: 'unlimitedFileOperations',
                data: {
                  filePath: filename,
                  line: String(node.loc?.start.line ?? 0),
                },
              });
            }
          }
          return;
        }

        // Check for fs operations
        if (callee.type === 'MemberExpression' &&
            callee.object.type === 'Identifier' &&
            callee.object.name === 'fs' &&
            callee.property.type === 'Identifier' &&
            ['readFile', 'writeFile', 'readFileSync', 'writeFileSync'].includes(callee.property.name)) {

          const args = node.arguments;
          if (args.length > 0) {
            // Check if file path comes from user input (potential for large files)
            const pathArg = args[0];
            if (pathArg.type !== 'SpreadElement' && isUserInput(pathArg)) {
              // FALSE POSITIVE REDUCTION
              if (safetyChecker.isSafe(node, context)) {
                return;
              }

              context.report({
                node: pathArg,
                messageId: 'unlimitedFileOperations',
                data: {
                  filePath: filename,
                  line: String(node.loc?.start.line ?? 0),
                },
              });
            }
          }
        }

        // Check for Array constructor with user input
        if (callee.type === 'Identifier' && callee.name === 'Array') {
          const args = node.arguments;
          if (args.length === 1) {
            const sizeArg = args[0];
            if (sizeArg.type !== 'SpreadElement' && isUserInput(sizeArg)) {
              // FALSE POSITIVE REDUCTION
              if (safetyChecker.isSafe(node, context)) {
                return;
              }

              context.report({
                node: sizeArg,
                messageId: 'unlimitedMemoryAllocation',
                data: {
                  filePath: filename,
                  line: String(node.loc?.start.line ?? 0),
                },
              });
            }
          }
        }

        // Check for new Array() constructor
        if (callee.type === 'NewExpression' &&
            callee.callee.type === 'Identifier' &&
            callee.callee.name === 'Array') {

          const args = callee.arguments;
          if (args.length === 1) {
            const sizeArg = args[0];
            if (sizeArg.type !== 'SpreadElement' && isUserInput(sizeArg)) {
              // FALSE POSITIVE REDUCTION
              if (safetyChecker.isSafe(node, context)) {
                return;
              }

              context.report({
                node: sizeArg,
                messageId: 'unlimitedMemoryAllocation',
                data: {
                  filePath: filename,
                  line: String(node.loc?.start.line ?? 0),
                },
              });
            }
          }
        }

        // Check for complex resource exhaustion patterns
        // ZIP bomb detection - unlimited decompression
        if (calleeText.includes('unzipper') || calleeText.includes('Extract')) {
          // Check for unlimited ZIP extraction
          context.report({
            node,
            messageId: 'unlimitedFileOperations',
            data: {
              filePath: filename,
              line: String(node.loc?.start.line ?? 0),
            },
          });
        }

        // XML expansion attack detection
        if (calleeText.includes('xml2js') || calleeText.includes('parseString')) {
          context.report({
            node,
            messageId: 'unlimitedMemoryAllocation',
            data: {
              filePath: filename,
              line: String(node.loc?.start.line ?? 0),
            },
          });
        }

        // File upload without limits detection
        if (calleeText.includes('multer') && calleeText.includes('limits')) {
          const args = node.arguments;
          // Check if limits object is empty or missing size limits
          if (args.length > 0 && args[0].type === 'ObjectExpression') {
            const props = args[0].properties;
            const hasSizeLimit = props.some((prop: TSESTree.ObjectLiteralElement) =>
              prop.type === 'Property' &&
              prop.key.type === 'Identifier' &&
              (prop.key.name === 'limits' || prop.key.name === 'fileSize')
            );
            if (!hasSizeLimit) {
              context.report({
                node,
                messageId: 'unlimitedFileOperations',
                data: {
                  filePath: filename,
                  line: String(node.loc?.start.line ?? 0),
                },
              });
            }
          }
        }

        // Check for cache with unlimited growth
        if (calleeText.includes('set') && sourceCode.getText(node).includes('Buffer.alloc')) {
          // Detect cache patterns that allocate buffers without limits
          const args = node.arguments;
          if (args.length >= 2) {
            const valueArg = args[1];
            const valueText = sourceCode.getText(valueArg);
            if (valueText.includes('Buffer.alloc') && valueText.includes('length')) {
              context.report({
                node,
                messageId: 'unlimitedMemoryAllocation',
                data: {
                  filePath: filename,
                  line: String(node.loc?.start.line ?? 0),
                },
              });
            }
          }
        }

        // Check for recursive data structure processing
        if (calleeText.includes('map') || calleeText.includes('forEach')) {
          const args = node.arguments;
          if (args.length > 0) {
            const callbackArg = args[0];
            const callbackText = sourceCode.getText(callbackArg);
            // Detect patterns that create arrays from nested object properties
            if (callbackText.includes('Object.keys') && callbackText.includes('map')) {
              context.report({
                node,
                messageId: 'unlimitedMemoryAllocation',
                data: {
                  filePath: filename,
                  line: String(node.loc?.start.line ?? 0),
                },
              });
            }
          }
        }

        // Check for resource allocation inside loops
        if (isInsideLoop(node)) {
          const calleeText = sourceCode.getText(callee);

          // Check if this allocates resources
          if (calleeText.includes('alloc') ||
              calleeText.includes('Array') ||
              calleeText.includes('Buffer') ||
              calleeText.includes('readFile') ||
              calleeText.includes('writeFile')) {

            // FALSE POSITIVE REDUCTION
            if (safetyChecker.isSafe(node, context)) {
              return;
            }

            // Skip if this is an assignment to an array element (pre-allocated pattern)
            const parent = node.parent;
            if (parent && parent.type === 'AssignmentExpression' &&
                parent.left.type === 'MemberExpression' &&
                parent.left.object.type === 'Identifier') {
              // This is assigning to an array element, likely pre-allocated
              return;
            }

            // Report resourceAllocationInLoop - this can be in addition to user input errors
            context.report({
              node,
              messageId: 'resourceAllocationInLoop',
              data: {
                filePath: filename,
                line: String(node.loc?.start.line ?? 0),
              },
            });
          }
        }
      },

      // Check new expressions for resource allocation
      NewExpression(node: TSESTree.NewExpression) {
        const callee = node.callee;

        // Check for new Buffer() with user input
        if (callee.type === 'Identifier' && callee.name === 'Buffer') {
          const args = node.arguments;
          if (args.length > 0) {
            const sizeArg = args[0];

            // Check if size comes from user input (but skip if validated)
            if (sizeArg.type !== 'SpreadElement' && isUserInput(sizeArg) && !hasSizeValidation(node)) {
              // FALSE POSITIVE REDUCTION
              if (safetyChecker.isSafe(node, context)) {
                return;
              }

              context.report({
                node: sizeArg,
                messageId: 'userControlledResourceSize',
                data: {
                  filePath: filename,
                  line: String(node.loc?.start.line ?? 0),
                },
              });
              return;
            }

            // Check if size exceeds limits
            const estimatedSize = sizeArg.type === 'SpreadElement' ? null : estimateResourceSize(sizeArg);
            if (estimatedSize && estimatedSize > maxResourceSize) {
              // FALSE POSITIVE REDUCTION
              if (safetyChecker.isSafe(node, context)) {
                return;
              }

              context.report({
                node: sizeArg,
                messageId: 'unlimitedBufferAllocation',
                data: {
                  filePath: filename,
                  line: String(node.loc?.start.line ?? 0),
                },
              });
              return;
            }

            // Check if no size validation present (only for non-literal sizes from user input)
            const isLiteralSize = sizeArg.type === 'Literal' && typeof sizeArg.value === 'number';
            const comesFromUserInput = sizeArg.type !== 'SpreadElement' && isUserInput(sizeArg);
            if (requireResourceValidation && !hasSizeValidation(node) && !isLiteralSize && comesFromUserInput) {
              // FALSE POSITIVE REDUCTION
              if (safetyChecker.isSafe(node, context)) {
                return;
              }

              context.report({
                node,
                messageId: 'missingResourceLimits',
                data: {
                  filePath: filename,
                  line: String(node.loc?.start.line ?? 0),
                },
              });
            }
          }
        }

        // Check for new Array() with user input
        if (callee.type === 'Identifier' && callee.name === 'Array') {
          const args = node.arguments;
          if (args.length === 1) {
            const sizeArg = args[0];
            if (sizeArg.type !== 'SpreadElement' && isUserInput(sizeArg)) {
              // FALSE POSITIVE REDUCTION
              if (safetyChecker.isSafe(node, context)) {
                return;
              }

              context.report({
                node: sizeArg,
                messageId: 'unlimitedMemoryAllocation',
                data: {
                  filePath: filename,
                  line: String(node.loc?.start.line ?? 0),
                },
              });
            }
          }
        }

        // Check for resource allocation inside loops
        if (isInsideLoop(node)) {
          const calleeText = sourceCode.getText(callee);

          // Check if this allocates resources
          if (calleeText.includes('Buffer') ||
              calleeText.includes('Array') ||
              calleeText.includes('Map') ||
              calleeText.includes('Set')) {

            // FALSE POSITIVE REDUCTION
            if (safetyChecker.isSafe(node, context)) {
              return;
            }

            context.report({
              node,
              messageId: 'resourceAllocationInLoop',
              data: {
                filePath: filename,
                line: String(node.loc?.start.line ?? 0),
              },
            });
          }
        }
      }
    };
  },
});
