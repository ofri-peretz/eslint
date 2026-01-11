/**
 * ESLint Rule: require-timeout-handling
 * Warns when Lambda handlers lack timeout handling
 * CWE-400: Uncontrolled Resource Consumption
 *
 * @see https://cwe.mitre.org/data/definitions/400.html
 * @see https://owasp.org/www-project-serverless-top-10/
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';

type MessageIds = 'missingTimeoutHandling' | 'addTimeoutCheck';

export interface Options {
  /** Allow in test files. Default: true */
  allowInTests?: boolean;
}

type RuleOptions = [Options?];

// Lambda context parameter names
const CONTEXT_PARAM_NAMES = ['context', 'ctx', 'lambdaContext'];

// Event parameter names (to identify Lambda handlers)
const EVENT_PARAM_NAMES = ['event', 'evt', 'e', 'request', 'req'];

// External call patterns that could timeout
const EXTERNAL_CALL_PATTERNS = [
  // HTTP clients
  'fetch',
  'axios',
  'got',
  'request',
  // AWS SDK
  'send',
  'invoke',
  // Database
  'query',
  'execute',
  'connect',
  // Other
  'promise',
  'wait',
];

export const requireTimeoutHandling = createRule<RuleOptions, MessageIds>({
  name: 'require-timeout-handling',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Warns when Lambda handlers with external calls lack timeout handling',
    },
    hasSuggestions: true,
    messages: {
      missingTimeoutHandling: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Missing Timeout Handling',
        cwe: 'CWE-400',
        cvss: 6.0,
        description:
          'Lambda handler makes external calls without timeout handling. Function may timeout without cleanup.',
        severity: 'MEDIUM',
        fix: 'Use context.getRemainingTimeInMillis() to check available time before external calls, or use AbortController',
        documentationLink:
          'https://docs.aws.amazon.com/lambda/latest/dg/nodejs-context.html',
      }),
      addTimeoutCheck: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Add Timeout Check',
        description:
          'Check remaining time before making external calls to prevent timeouts',
        severity: 'LOW',
        fix: "const remainingTime = context.getRemainingTimeInMillis(); if (remainingTime < 5000) { return { statusCode: 503 } }",
        documentationLink:
          'https://docs.aws.amazon.com/lambda/latest/dg/nodejs-context.html',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: {
            type: 'boolean',
            default: true,
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ allowInTests: true }],
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options = {}],
  ) {
    const { allowInTests = true } = options as Options;
    const filename = context.filename || context.getFilename();
    const isTestFile = /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);

    if (allowInTests && isTestFile) {
      return {};
    }

    // Track handler functions
    let currentHandlerNode:
      | TSESTree.ArrowFunctionExpression
      | TSESTree.FunctionExpression
      | TSESTree.FunctionDeclaration
      | null = null;
    let hasTimeoutCheck = false;
    let hasExternalCalls = false;
    let hasContextParam = false;

    function enterFunction(
      node:
        | TSESTree.ArrowFunctionExpression
        | TSESTree.FunctionExpression
        | TSESTree.FunctionDeclaration,
    ) {
      // Check if this looks like a Lambda handler (event, context)
      const params = node.params;
      const hasEvent = params.some(
        (p) =>
          p.type === AST_NODE_TYPES.Identifier &&
          EVENT_PARAM_NAMES.includes(p.name),
      );
      const hasContext = params.some(
        (p) =>
          p.type === AST_NODE_TYPES.Identifier &&
          CONTEXT_PARAM_NAMES.includes(p.name),
      );

      if (hasEvent) {
        currentHandlerNode = node;
        hasTimeoutCheck = false;
        hasExternalCalls = false;
        hasContextParam = hasContext;
      }
    }

    function exitFunction(
      node:
        | TSESTree.ArrowFunctionExpression
        | TSESTree.FunctionExpression
        | TSESTree.FunctionDeclaration,
    ) {
      if (currentHandlerNode !== node) return;

      // Report if handler has external calls but no timeout handling and has context param
      if (hasExternalCalls && !hasTimeoutCheck && hasContextParam) {
        context.report({
          node,
          messageId: 'missingTimeoutHandling',
          suggest: [
            {
              messageId: 'addTimeoutCheck',
              fix: () => null,
            },
          ],
        });
      }

      currentHandlerNode = null;
    }

    return {
      'ArrowFunctionExpression, FunctionExpression, FunctionDeclaration'(
        node:
          | TSESTree.ArrowFunctionExpression
          | TSESTree.FunctionExpression
          | TSESTree.FunctionDeclaration,
      ) {
        enterFunction(node);
      },

      'ArrowFunctionExpression:exit, FunctionExpression:exit, FunctionDeclaration:exit'(
        node:
          | TSESTree.ArrowFunctionExpression
          | TSESTree.FunctionExpression
          | TSESTree.FunctionDeclaration,
      ) {
        exitFunction(node);
      },

      // Detect getRemainingTimeInMillis() call
      MemberExpression(node: TSESTree.MemberExpression) {
        if (!currentHandlerNode) return;

        if (
          node.property.type === AST_NODE_TYPES.Identifier &&
          node.property.name === 'getRemainingTimeInMillis'
        ) {
          hasTimeoutCheck = true;
        }
      },

      // Detect AbortController usage
      NewExpression(node: TSESTree.NewExpression) {
        if (!currentHandlerNode) return;

        if (
          node.callee.type === AST_NODE_TYPES.Identifier &&
          node.callee.name === 'AbortController'
        ) {
          hasTimeoutCheck = true;
        }
      },

      // Detect external calls
      CallExpression(node: TSESTree.CallExpression) {
        if (!currentHandlerNode) return;

        // Check for external call patterns
        if (node.callee.type === AST_NODE_TYPES.Identifier) {
          if (EXTERNAL_CALL_PATTERNS.includes(node.callee.name)) {
            hasExternalCalls = true;
          }
        }

        if (node.callee.type === AST_NODE_TYPES.MemberExpression) {
          const property = node.callee.property;
          if (
            property.type === AST_NODE_TYPES.Identifier &&
            EXTERNAL_CALL_PATTERNS.includes(property.name)
          ) {
            hasExternalCalls = true;
          }
        }

        // Check for Promise.race (timeout pattern)
        if (
          node.callee.type === AST_NODE_TYPES.MemberExpression &&
          node.callee.object.type === AST_NODE_TYPES.Identifier &&
          node.callee.object.name === 'Promise' &&
          node.callee.property.type === AST_NODE_TYPES.Identifier &&
          node.callee.property.name === 'race'
        ) {
          hasTimeoutCheck = true;
        }
      },
    };
  },
});
