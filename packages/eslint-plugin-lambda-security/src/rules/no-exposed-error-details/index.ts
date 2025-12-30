/**
 * ESLint Rule: no-exposed-error-details
 * Detects Lambda handlers exposing internal error details
 * CWE-209: Generation of Error Message Containing Sensitive Information
 *
 * @see https://cwe.mitre.org/data/definitions/209.html
 * @see https://owasp.org/www-project-serverless-top-10/
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';

type MessageIds = 'exposedErrorDetails' | 'sanitizeError';

export interface Options {
  /** Allow in test files. Default: true */
  allowInTests?: boolean;
}

type RuleOptions = [Options?];

// Properties that expose internal details
const SENSITIVE_ERROR_PROPERTIES = [
  'stack',
  'stackTrace',
  'trace',
  'cause',
  '__dirname',
  '__filename',
  'path',
  'hostname',
  'config',
  'env',
];

export const noExposedErrorDetails = createRule<RuleOptions, MessageIds>({
  name: 'no-exposed-error-details',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Detects Lambda handlers exposing internal error details in responses',
    },
    hasSuggestions: true,
    messages: {
      exposedErrorDetails: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Exposed Error Details',
        cwe: 'CWE-209',
        owasp: 'SAS-9',
        cvss: 4.3,
        description:
          'Response exposes {{property}} which may leak internal paths, configs, or stack traces.',
        severity: 'MEDIUM',
        fix: 'Return generic error message. Log detailed errors server-side: console.error(error)',
        documentationLink: 'https://cwe.mitre.org/data/definitions/209.html',
      }),
      sanitizeError: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Sanitize Error Response',
        description: 'Return a generic error message without internal details',
        severity: 'LOW',
        fix: 'return { statusCode: 500, body: JSON.stringify({ message: "Internal server error" }) }',
        documentationLink:
          'https://owasp.org/www-community/Improper_Error_Handling',
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

    // Track if we're inside a return statement that looks like API response
    let insideApiResponse = false;

    /**
     * Check if this return looks like an API Gateway response
     */
    function isApiResponse(node: TSESTree.ObjectExpression): boolean {
      return node.properties.some(
        (prop) =>
          prop.type === AST_NODE_TYPES.Property &&
          prop.key.type === AST_NODE_TYPES.Identifier &&
          ['statusCode', 'body', 'headers'].includes(prop.key.name),
      );
    }

    /**
     * Check if member expression accesses sensitive property
     */
    function getSensitiveProperty(
      node: TSESTree.MemberExpression,
    ): string | null {
      if (node.property.type === AST_NODE_TYPES.Identifier) {
        if (SENSITIVE_ERROR_PROPERTIES.includes(node.property.name)) {
          return node.property.name;
        }
      }
      return null;
    }

    return {
      ReturnStatement(node: TSESTree.ReturnStatement) {
        if (
          node.argument?.type === AST_NODE_TYPES.ObjectExpression &&
          isApiResponse(node.argument)
        ) {
          insideApiResponse = true;
        }
      },

      'ReturnStatement:exit'() {
        insideApiResponse = false;
      },

      MemberExpression(node: TSESTree.MemberExpression) {
        if (!insideApiResponse) return;

        const sensitiveProperty = getSensitiveProperty(node);
        if (sensitiveProperty) {
          // Check if this is in a body property or response
          const parent = node.parent;

          // error.stack in response
          if (
            parent?.type === AST_NODE_TYPES.Property ||
            parent?.type === AST_NODE_TYPES.CallExpression
          ) {
            context.report({
              node,
              messageId: 'exposedErrorDetails',
              data: {
                property: sensitiveProperty,
              },
              suggest: [
                {
                  messageId: 'sanitizeError',
                  fix: () => null,
                },
              ],
            });
          }
        }
      },

      // JSON.stringify(error) - stringifying entire error object
      CallExpression(node: TSESTree.CallExpression) {
        if (!insideApiResponse) return;

        if (
          node.callee.type === AST_NODE_TYPES.MemberExpression &&
          node.callee.object.type === AST_NODE_TYPES.Identifier &&
          node.callee.object.name === 'JSON' &&
          node.callee.property.type === AST_NODE_TYPES.Identifier &&
          node.callee.property.name === 'stringify'
        ) {
          const arg = node.arguments[0];
          if (arg?.type === AST_NODE_TYPES.Identifier) {
            // Check if it looks like an error variable
            if (/error|err|e|exception/i.test(arg.name)) {
              context.report({
                node,
                messageId: 'exposedErrorDetails',
                data: {
                  property: 'error object',
                },
                suggest: [
                  {
                    messageId: 'sanitizeError',
                    fix: () => null,
                  },
                ],
              });
            }
          }
        }
      },
    };
  },
});
