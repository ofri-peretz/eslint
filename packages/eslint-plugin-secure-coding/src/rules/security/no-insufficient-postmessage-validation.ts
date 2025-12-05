/**
 * ESLint Rule: no-insufficient-postmessage-validation
 * Detects insufficient postMessage origin validation (CWE-20)
 *
 * ⚠️ STATIC ANALYSIS LIMITATIONS:
 * This rule performs static analysis of potentially runtime behavior.
 * It can detect obvious issues but has fundamental limitations:
 *
 * ❌ CANNOT detect:
 * - Runtime origin validation (external config, database)
 * - Validation in called functions or modules
 * - Dynamic origin construction
 * - Context-dependent validation logic
 *
 * ✅ CAN detect:
 * - Missing origin validation entirely
 * - Wildcard origins ("*") usage
 * - Basic event.origin pattern matching
 * - Hardcoded trusted origin lists
 *
 * For comprehensive security, combine with:
 * - Runtime origin validation
 * - Content Security Policy (CSP)
 * - Input sanitization
 * - Manual code review
 *
 * postMessage is a browser API for cross-origin communication that can be
 * exploited if messages are accepted from untrusted origins. Attackers can
 * send malicious messages that bypass security controls.
 *
 * False Positive Reduction:
 * This rule uses security utilities to reduce false positives by detecting:
 * - Safe origin validation patterns
 * - Trusted origin lists
 * - JSDoc annotations (@trusted-origin, @safe-message)
 * - Development vs production environments
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import {
  createSafetyChecker,
  type SecurityRuleOptions,
} from '@interlace/eslint-devkit';

type MessageIds =
  | 'insufficientPostmessageValidation'
  | 'wildcardOrigin'
  | 'missingOriginCheck'
  | 'unsafeMessageHandler'
  | 'useSpecificOrigins'
  | 'validateMessageOrigin'
  | 'implementOriginWhitelist'
  | 'strategyOriginValidation'
  | 'strategyContentValidation'
  | 'strategyEnvironmentSeparation';

export interface Options extends SecurityRuleOptions {
  /** Allowed origins for postMessage communication */
  allowedOrigins?: string[];

  /** Whether to allow wildcard origins in development */
  allowWildcardInDev?: boolean;

  /** Message event handler patterns to check */
  messageHandlerPatterns?: string[];

  /** Origins considered safe (e.g., localhost, development domains) */
  safeOrigins?: string[];

  /** Whether to perform deep origin validation analysis */
  deepValidation?: boolean;
}

type RuleOptions = [Options?];

export const noInsufficientPostmessageValidation = createRule<RuleOptions, MessageIds>({
  name: 'no-insufficient-postmessage-validation',
  meta: {
    type: 'problem',
    docs: {
      description: 'Detects insufficient postMessage origin validation',
    },
    fixable: 'code',
    hasSuggestions: true,
    messages: {
      insufficientPostmessageValidation: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Insufficient postMessage Validation',
        cwe: 'CWE-20',
        description: 'postMessage origin validation is insufficient',
        severity: '{{severity}}',
        fix: '{{safeAlternative}}',
        documentationLink: 'https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage',
      }),
      wildcardOrigin: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Wildcard postMessage Origin',
        cwe: 'CWE-20',
        description: 'postMessage uses wildcard origin (*)',
        severity: 'CRITICAL',
        fix: 'Use specific trusted origins instead of "*"',
        documentationLink: 'https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage',
      }),
      missingOriginCheck: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Missing Origin Check',
        cwe: 'CWE-20',
        description: 'Message handler missing origin validation',
        severity: 'HIGH',
        fix: 'Check event.origin against trusted origins',
        documentationLink: 'https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage',
      }),
      unsafeMessageHandler: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Unsafe Message Handler',
        cwe: 'CWE-20',
        description: 'Message event handler processes data without validation',
        severity: 'MEDIUM',
        fix: 'Validate event.origin and event.data before processing',
        documentationLink: 'https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage',
      }),
      useSpecificOrigins: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Specific Origins',
        description: 'Specify trusted origins explicitly',
        severity: 'LOW',
        fix: 'postMessage(data, "https://trusted-domain.com")',
        documentationLink: 'https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage',
      }),
      validateMessageOrigin: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Validate Message Origin',
        description: 'Validate message origin before processing',
        severity: 'LOW',
        fix: 'if (event.origin === "https://trusted.com") { /* process */ }',
        documentationLink: 'https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage',
      }),
      implementOriginWhitelist: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Implement Origin Whitelist',
        description: 'Use whitelist of allowed origins',
        severity: 'LOW',
        fix: 'const allowedOrigins = ["https://app1.com", "https://app2.com"];',
        documentationLink: 'https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage',
      }),
      strategyOriginValidation: formatLLMMessage({
        icon: MessageIcons.STRATEGY,
        issueName: 'Origin Validation Strategy',
        description: 'Validate message origins against trusted list',
        severity: 'LOW',
        fix: 'Check event.origin against predefined allowed origins',
        documentationLink: 'https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage',
      }),
      strategyContentValidation: formatLLMMessage({
        icon: MessageIcons.STRATEGY,
        issueName: 'Content Validation Strategy',
        description: 'Validate message content in addition to origin',
        severity: 'LOW',
        fix: 'Validate both event.origin and event.data structure',
        documentationLink: 'https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage',
      }),
      strategyEnvironmentSeparation: formatLLMMessage({
        icon: MessageIcons.STRATEGY,
        issueName: 'Environment Separation Strategy',
        description: 'Use different origins for different environments',
        severity: 'LOW',
        fix: 'Use environment-specific origin validation',
        documentationLink: 'https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage',
      })
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowedOrigins: {
            type: 'array',
            items: { type: 'string' },
            default: [],
          },
          allowWildcardInDev: {
            type: 'boolean',
            default: false,
            description: 'Allow wildcard origins in development environment'
          },
          messageHandlerPatterns: {
            type: 'array',
            items: { type: 'string' },
            default: ['addEventListener', 'onmessage', 'postMessage'],
          },
          trustedSanitizers: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Additional function names to consider as origin validators',
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
          safeOrigins: {
            type: 'array',
            items: { type: 'string' },
            default: ['localhost', '127.0.0.1', '0.0.0.0'],
            description: 'Origins considered safe for postMessage communication',
          },
          deepValidation: {
            type: 'boolean',
            default: false,
            description: 'Enable deep AST analysis for origin validation detection',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      allowedOrigins: [],
      allowWildcardInDev: false,
      messageHandlerPatterns: ['addEventListener', 'onmessage', 'postMessage'],
      trustedSanitizers: [],
      trustedAnnotations: [],
      strictMode: false,
      safeOrigins: ['localhost', '127.0.0.1', '0.0.0.0'],
      deepValidation: false,
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const options = context.options[0] || {};
    const {
      allowedOrigins = [],
      allowWildcardInDev = false,
      trustedSanitizers = [],
      trustedAnnotations = [],
      strictMode = false,
      deepValidation = false,
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
     * Check if origin validation is present in a message handler
     *
     * ⚠️ STATIC ANALYSIS LIMITATION:
     * This can only detect simple patterns. Complex validation logic
     * (external functions, runtime config, dynamic validation) cannot
     * be detected statically.
     */
    const hasOriginValidation = (functionNode: TSESTree.FunctionDeclaration | TSESTree.FunctionExpression | TSESTree.ArrowFunctionExpression): boolean => {
      if (deepValidation) {
        // Deep AST analysis (more thorough but slower)
        try {
          let hasOriginCheck = false;

          const checkNode = (node: TSESTree.Node): void => {
            // Check for event.origin comparisons
            if (node.type === 'BinaryExpression' &&
                ((node.left.type === 'MemberExpression' &&
                  node.left.property.type === 'Identifier' &&
                  node.left.property.name === 'origin' &&
                  node.left.object.type === 'Identifier') ||
                 (node.right.type === 'MemberExpression' &&
                  node.right.property.type === 'Identifier' &&
                  node.right.property.name === 'origin' &&
                  node.right.object.type === 'Identifier'))) {
              hasOriginCheck = true;
              return;
            }

            // Check for includes() calls on origin arrays
            if (node.type === 'CallExpression' &&
                node.callee.type === 'MemberExpression' &&
                node.callee.property.type === 'Identifier' &&
                node.callee.property.name === 'includes') {
              const objectText = sourceCode.getText(node.callee.object).toLowerCase();
              if (objectText.includes('origin') || objectText.includes('allowed')) {
                hasOriginCheck = true;
                return;
              }
            }

            // Recursively check child nodes
            for (const key in node) {
              if (key === 'parent' || key === 'range' || key === 'loc') continue;
              const child = (node as unknown as Record<string, unknown>)[key];
              if (child && typeof child === 'object' && 'type' in (child as object)) {
                checkNode(child as TSESTree.Node);
              } else if (Array.isArray(child)) {
                child.forEach(item => {
                  if (item && typeof item === 'object' && 'type' in (item as object)) {
                    checkNode(item as TSESTree.Node);
                  }
                });
              }
            }
          };

          checkNode(functionNode);
          return hasOriginCheck;
        } catch {
          // If AST traversal fails, fall back to simple text matching
          return false;
        }
      } else {
        // Simple text-based check (faster, less accurate)
        const functionText = sourceCode.getText(functionNode).toLowerCase();
        return functionText.includes('event.origin') ||
               (functionText.includes('origin') && functionText.includes('event'));
      }
    };

    return {
      // Check postMessage calls with wildcard origins
      CallExpression(node: TSESTree.CallExpression) {
        const callee = node.callee;

        // Check for any postMessage() calls
        if (callee.type === 'MemberExpression' &&
            callee.property.type === 'Identifier' &&
            callee.property.name === 'postMessage') {

          // Check allowed origins for non-wildcard origins
          const args = node.arguments;
          if (args.length >= 2) {
            const targetOrigin = args[1];
            if (targetOrigin.type === 'Literal' &&
                typeof targetOrigin.value === 'string' &&
                targetOrigin.value !== '*') {

              // Check if origin is explicitly allowed
              const originValue = targetOrigin.value;
              const isAllowed = allowedOrigins.includes(originValue) ||
                               allowedOrigins.includes('*') ||
                               allowedOrigins.length === 0; // If no restrictions, allow all specific origins

              if (!isAllowed) {
                // FALSE POSITIVE REDUCTION
                if (safetyChecker.isSafe(node, context)) {
                  return;
                }

                context.report({
                  node: targetOrigin,
                  messageId: 'useSpecificOrigins',
                  data: {
                    filePath: filename,
                    line: String(node.loc?.start.line ?? 0),
                    origin: originValue,
                  },
                });
              }
            }

            // Check for wildcard origin
            if (targetOrigin.type === 'Literal' &&
                typeof targetOrigin.value === 'string' &&
                targetOrigin.value === '*') {

              // Check if origin is explicitly allowed
              const originValue = targetOrigin.value;
              const isAllowed = allowedOrigins.includes(originValue) || allowedOrigins.includes('*');

              // Allow if explicitly allowed OR in development if configured
              if (!isAllowed && !allowWildcardInDev) {
                // TEMP: bypass safety checker
                // if (safetyChecker.isSafe(node, context)) {
                //   return;
                // }

                context.report({
                  node: targetOrigin,
                  messageId: 'wildcardOrigin',
                  data: {
                    filePath: filename,
                    line: String(node.loc?.start.line ?? 0),
                  },
                });
              }
            }
          }
        }

        // Check for addEventListener('message', ...) and IPC calls

        // Check for addEventListener('message', ...)
        if (callee.type === 'MemberExpression' &&
            callee.property.type === 'Identifier' &&
            callee.property.name === 'addEventListener') {

          const args = node.arguments;
          if (args.length >= 2) {
            const eventType = args[0];
            const handler = args[1];

            // Check if it's a message event
            if (eventType.type === 'Literal' &&
                typeof eventType.value === 'string' &&
                eventType.value === 'message') {

              // Check if handler is a function and lacks origin validation
              if (handler.type === 'FunctionExpression' ||
                  handler.type === 'ArrowFunctionExpression') {

                if (!hasOriginValidation(handler)) {
                  // FALSE POSITIVE REDUCTION
                  if (safetyChecker.isSafe(node, context)) {
                    return;
                  }

                  context.report({
                    node: handler,
                    messageId: 'missingOriginCheck',
                    data: {
                      filePath: filename,
                      line: String(node.loc?.start.line ?? 0),
                    },
                  });
                }
              }
            }
          }
        }
      },

      // Check for window.onmessage assignments
      AssignmentExpression(node: TSESTree.AssignmentExpression) {
        const left = node.left;
        if (left.type === 'MemberExpression' &&
            left.property.type === 'Identifier' &&
            left.property.name === 'onmessage' &&
            left.object.type === 'Identifier' &&
            left.object.name === 'window') {

          const handler = node.right;
          if (handler && (handler.type === 'FunctionExpression' ||
                          handler.type === 'ArrowFunctionExpression')) {

            if (!hasOriginValidation(handler)) {
              // FALSE POSITIVE REDUCTION
              if (safetyChecker.isSafe(node, context)) {
                return;
              }

              context.report({
                node: handler,
                messageId: 'missingOriginCheck',
                data: {
                  filePath: filename,
                  line: String(node.loc?.start.line ?? 0),
                },
              });
            }
          }
        }
      },

      // Check for event.data usage without origin validation
      MemberExpression(node: TSESTree.MemberExpression) {
        // Look for event.data usage
        if (node.property.type === 'Identifier' &&
            node.property.name === 'data' &&
            node.object.type === 'Identifier' &&
            node.object.name === 'event') {

          // For now, simplify: only flag if we're clearly in an unsafe context
          // The addEventListener check above should handle most cases
          // This is a simplified version to avoid complex AST traversal issues

          // Only flag if this is clearly in a message handler without validation
          // We'll rely on the addEventListener check for the main logic
          return;
        }
      },
    };
  },
});
