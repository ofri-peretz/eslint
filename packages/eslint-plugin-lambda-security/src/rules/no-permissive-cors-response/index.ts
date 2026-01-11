/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-permissive-cors-response
 * Detects `Access-Control-Allow-Origin: '*'` in Lambda response headers
 * CWE-942: Permissive Cross-domain Policy with Untrusted Domains
 *
 * @see https://cwe.mitre.org/data/definitions/942.html
 * @see https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-cors.html
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { AST_NODE_TYPES, createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'permissiveCors' | 'useSpecificOrigin';

export interface Options {
  /** Allow in test files. Default: true */
  allowInTests?: boolean;
  /** Allowed origins (patterns). Default: [] */
  allowedOrigins?: string[];
}

type RuleOptions = [Options?];

export const noPermissiveCorsResponse = createRule<RuleOptions, MessageIds>({
  name: 'no-permissive-cors-response',
  meta: {
    type: 'problem',
    docs: {
      description: 'Detects permissive CORS (Access-Control-Allow-Origin: *) in Lambda response headers',
    },
    fixable: 'code',
    messages: {
      permissiveCors: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Permissive CORS in Lambda Response',
        cwe: 'CWE-942',
        description: 'Wildcard CORS origin (*) allows any domain to access this Lambda function',
        severity: 'HIGH',
        fix: 'Use specific origins: headers: { "Access-Control-Allow-Origin": "https://your-domain.com" }',
        documentationLink: 'https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-cors.html',
      }),
      useSpecificOrigin: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Specific Origin',
        description: 'Specify allowed origins instead of wildcard',
        severity: 'LOW',
        fix: 'Replace "*" with specific domain(s)',
        documentationLink: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: {
            type: 'boolean',
            default: true,
            description: 'Allow permissive CORS in test files',
          },
          allowedOrigins: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Patterns for allowed origins',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      allowInTests: true,
      allowedOrigins: [],
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>, [options = {}]) {
    const { allowInTests = true } = options as Options;
    const filename = context.filename || context.getFilename();
    const isTestFile = /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);

    if (allowInTests && isTestFile) {
      return {};
    }

    /**
     * Check if this is a Lambda response structure
     * { statusCode, headers, body }
     */
    function isLambdaResponse(obj: TSESTree.ObjectExpression): boolean {
      const propNames = obj.properties
        .filter((p): p is TSESTree.Property => p.type === AST_NODE_TYPES.Property)
        .map(p => (p.key.type === AST_NODE_TYPES.Identifier ? p.key.name : ''));
      
      return propNames.includes('statusCode') || propNames.includes('body');
    }

    /**
     * Check headers object for permissive CORS
     */
    function checkHeadersObject(obj: TSESTree.ObjectExpression): void {
      for (const prop of obj.properties) {
        if (prop.type !== AST_NODE_TYPES.Property) continue;

        // Get header name
        let headerName = '';
        if (prop.key.type === AST_NODE_TYPES.Identifier) {
          headerName = prop.key.name;
        } else if (prop.key.type === AST_NODE_TYPES.Literal && typeof prop.key.value === 'string') {
          headerName = prop.key.value;
        }

        // Check for Access-Control-Allow-Origin
        if (headerName.toLowerCase() === 'access-control-allow-origin') {
          // Check if value is wildcard
          if (prop.value.type === AST_NODE_TYPES.Literal && prop.value.value === '*') {
            context.report({
              node: prop,
              messageId: 'permissiveCors',
              fix: (fixer) => {
                return fixer.replaceText(prop.value, '"https://your-domain.com"');
              },
            });
          }
        }
      }
    }

    return {
      // Check return statements that return Lambda response objects
      ReturnStatement(node: TSESTree.ReturnStatement) {
        if (node.argument?.type === AST_NODE_TYPES.ObjectExpression) {
          const obj = node.argument;
          
          if (isLambdaResponse(obj)) {
            // Find headers property
            for (const prop of obj.properties) {
              if (
                prop.type === AST_NODE_TYPES.Property &&
                prop.key.type === AST_NODE_TYPES.Identifier &&
                prop.key.name === 'headers' &&
                prop.value.type === AST_NODE_TYPES.ObjectExpression
              ) {
                checkHeadersObject(prop.value);
              }
            }
          }
        }
      },

      // Also check variable declarations with Lambda response pattern
      VariableDeclarator(node: TSESTree.VariableDeclarator) {
        if (
          node.id.type === AST_NODE_TYPES.Identifier &&
          node.id.name.toLowerCase().includes('response') &&
          node.init?.type === AST_NODE_TYPES.ObjectExpression
        ) {
          const obj = node.init;
          
          if (isLambdaResponse(obj)) {
            for (const prop of obj.properties) {
              if (
                prop.type === AST_NODE_TYPES.Property &&
                prop.key.type === AST_NODE_TYPES.Identifier &&
                prop.key.name === 'headers' &&
                prop.value.type === AST_NODE_TYPES.ObjectExpression
              ) {
                checkHeadersObject(prop.value);
              }
            }
          }
        }
      },
    };
  },
});
