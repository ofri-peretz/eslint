/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-exposed-error-details
 * Detects Lambda handlers exposing internal error details
 * CWE-209: Generation of Error Message Containing Sensitive Information
 *
 * @see https://cwe.mitre.org/data/definitions/209.html
 * @see https://owasp.org/www-project-serverless-top-10/
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { fileIsLambda } from '../../utils/lambda-evidence';
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
  isTestFilePath,
} from '@interlace/eslint-devkit';

type MessageIds = 'exposedErrorDetails';

export interface Options {
  /** Allow in test files. Default: true */
  allowInTests?: boolean;
}

type RuleOptions = [Options?];

// Properties that expose internal details
const SENSITIVE_ERROR_PROPERTIES = new Set([
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
]);

export const noExposedErrorDetails = createRule<RuleOptions, MessageIds>({
  name: 'no-exposed-error-details',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-lambda-security/docs/rules/no-exposed-error-details.md',
      description:
        'Detects Lambda handlers exposing internal error details in responses',
      cwe: 'CWE-209',
      cvss: 4.3,
    },
    messages: {
      exposedErrorDetails: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Exposed Error Details',
        cwe: 'CWE-209',
        cvss: 4.3,
        description:
          'Response exposes {{property}} which may leak internal paths, configs, or stack traces.',
        severity: 'MEDIUM',
        fix: 'Return generic error message. Log detailed errors server-side: console.error(error)',
        documentationLink: 'https://cwe.mitre.org/data/definitions/209.html',
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
    // Every rule here is Lambda-specific, and none of them knew it: over 107,382
    // files, 98% of this plugin's findings were in files with no AWS anything.
    // Registering no visitors is both the gate and the cheap path.
    if (!fileIsLambda(context.sourceCode.ast)) return {};

    const { allowInTests = true } = options as Options;
    const filename = context.filename;
    const isTestFile = isTestFilePath(filename);

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
        if (SENSITIVE_ERROR_PROPERTIES.has(node.property.name)) {
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
              });
            }
          }
        }
      },
    };
  },
});
