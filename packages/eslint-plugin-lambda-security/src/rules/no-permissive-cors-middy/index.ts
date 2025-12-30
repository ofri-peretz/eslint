/**
 * ESLint Rule: no-permissive-cors-middy
 * Detects @middy/http-cors middleware with permissive origin configuration
 * CWE-942: Permissive Cross-domain Policy with Untrusted Domains
 *
 * @see https://cwe.mitre.org/data/definitions/942.html
 * @see https://middy.js.org/docs/middlewares/http-cors
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { AST_NODE_TYPES, createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'permissiveCors' | 'useSpecificOrigins';

export interface Options {
  /** Allow in test files. Default: true */
  allowInTests?: boolean;
}

type RuleOptions = [Options?];

export const noPermissiveCorsMidly = createRule<RuleOptions, MessageIds>({
  name: 'no-permissive-cors-middy',
  meta: {
    type: 'problem',
    docs: {
      description: 'Detects @middy/http-cors middleware with permissive origin (*)',
    },
    hasSuggestions: true,
    messages: {
      permissiveCors: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Permissive CORS in Middy',
        cwe: 'CWE-942',
        description: 'Wildcard CORS origin in @middy/http-cors allows any domain',
        severity: 'HIGH',
        fix: 'Use specific origins: httpCors({ origins: ["https://your-domain.com"] })',
        documentationLink: 'https://middy.js.org/docs/middlewares/http-cors',
      }),
      useSpecificOrigins: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Specific Origins',
        description: 'Configure allowed origins in httpCors middleware',
        severity: 'LOW',
        fix: 'httpCors({ origins: ["https://allowed-domain.com"] })',
        documentationLink: 'https://middy.js.org/docs/middlewares/http-cors',
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
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>, [options = {}]) {
    const { allowInTests = true } = options as Options;
    const filename = context.filename || context.getFilename();
    const isTestFile = /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);

    if (allowInTests && isTestFile) {
      return {};
    }

    /**
     * Check if a call is to httpCors/cors middleware
     */
    function isCorsMiddlewareCall(node: TSESTree.CallExpression): boolean {
      if (node.callee.type === AST_NODE_TYPES.Identifier) {
        const name = node.callee.name.toLowerCase();
        return name === 'httpcors' || name === 'cors';
      }
      return false;
    }

    /**
     * Check cors options for permissive origin
     */
    function checkCorsOptions(
      node: TSESTree.CallExpression,
      optionsObj: TSESTree.ObjectExpression
    ): void {
      for (const prop of optionsObj.properties) {
        if (prop.type !== AST_NODE_TYPES.Property) continue;

        // Check for 'origin' or 'origins' property
        if (prop.key.type === AST_NODE_TYPES.Identifier) {
          const keyName = prop.key.name.toLowerCase();
          
          if (keyName === 'origin' || keyName === 'origins') {
            // Check for wildcard string
            if (prop.value.type === AST_NODE_TYPES.Literal && prop.value.value === '*') {
              context.report({
                node: prop,
                messageId: 'permissiveCors',
                suggest: [
                  {
                    messageId: 'useSpecificOrigins',
                    fix: () => null,
                  },
                ],
              });
            }
            // Check for array with wildcard
            else if (prop.value.type === AST_NODE_TYPES.ArrayExpression) {
              for (const element of prop.value.elements) {
                if (element?.type === AST_NODE_TYPES.Literal && element.value === '*') {
                  context.report({
                    node: element,
                    messageId: 'permissiveCors',
                    suggest: [
                      {
                        messageId: 'useSpecificOrigins',
                        fix: () => null,
                      },
                    ],
                  });
                }
              }
            }
          }
        }
      }
    }

    return {
      CallExpression(node: TSESTree.CallExpression) {
        if (!isCorsMiddlewareCall(node)) return;

        // httpCors() with no arguments defaults to permissive
        if (node.arguments.length === 0) {
          context.report({
            node,
            messageId: 'permissiveCors',
            suggest: [
              {
                messageId: 'useSpecificOrigins',
                fix: () => null,
              },
            ],
          });
          return;
        }

        // Check options object
        if (node.arguments[0]?.type === AST_NODE_TYPES.ObjectExpression) {
          checkCorsOptions(node, node.arguments[0]);
        }
      },
    };
  },
});
