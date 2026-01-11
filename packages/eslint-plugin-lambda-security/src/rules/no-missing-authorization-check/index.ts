/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-missing-authorization-check
 * Detects Lambda handlers without authorization checks
 * CWE-862: Missing Authorization
 *
 * @see https://cwe.mitre.org/data/definitions/862.html
 * @see https://owasp.org/www-project-serverless-top-10/
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';

type MessageIds = 'missingAuthCheck' | 'addAuthCheck';

export interface Options {
  /** Allow in test files. Default: true */
  allowInTests?: boolean;
  /** Handler file patterns to check. Default: common Lambda patterns */
  handlerPatterns?: string[];
}

type RuleOptions = [Options?];

// Property accesses that indicate authorization checks
const AUTHORIZATION_CHECK_PATTERNS = [
  // API Gateway authorizer
  'requestContext.authorizer',
  'requestContext.identity',
  // JWT/Token validation
  'Authorization',
  'authorization',
  // Common auth checks
  'claims',
  'principalId',
  'isAdmin',
  'isAuthenticated',
  'userId',
  'sub',
  'scope',
  'permissions',
];

// Sensitive operations that require authorization
const SENSITIVE_OPERATIONS = [
  // Database operations
  'query',
  'put',
  'delete',
  'update',
  'insert',
  'remove',
  'create',
  // AWS SDK operations
  'send',
  'invoke',
  'putObject',
  'deleteObject',
  'getObject',
  'putItem',
  'deleteItem',
  'updateItem',
  'getItem',
];

// Event parameter names
const EVENT_PARAM_NAMES = ['event', 'evt', 'e', 'request', 'req'];

export const noMissingAuthorizationCheck = createRule<RuleOptions, MessageIds>({
  name: 'no-missing-authorization-check',
  meta: {
    type: 'problem',
    docs: {
      description: 'Detects Lambda handlers without authorization checks',
    },
    hasSuggestions: true,
    messages: {
      missingAuthCheck: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Missing Authorization Check',
        cwe: 'CWE-862',
        cvss: 7.5,
        description:
          'Lambda handler performs {{operation}} operation without authorization check. Users may access resources without proper permissions.',
        severity: 'HIGH',
        fix: "Add authorization check: const claims = event.requestContext.authorizer?.claims; if (!claims?.sub) { return { statusCode: 401 } }",
        documentationLink: 'https://cwe.mitre.org/data/definitions/862.html',
      }),
      addAuthCheck: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Add Authorization Check',
        description:
          'Check event.requestContext.authorizer for API Gateway or implement custom JWT validation',
        severity: 'LOW',
        fix: "const userId = event.requestContext.authorizer?.claims?.sub; if (!userId) throw new Error('Unauthorized');",
        documentationLink:
          'https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-jwt-authorizer.html',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: {
            type: 'boolean',
            default: true,
            description: 'Allow missing auth in test files',
          },
          handlerPatterns: {
            type: 'array',
            items: { type: 'string' },
            description: 'Handler file patterns to check',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      allowInTests: true,
      handlerPatterns: [],
    },
  ],
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

    // Track state within each handler function
    let currentFunctionNode:
      | TSESTree.ArrowFunctionExpression
      | TSESTree.FunctionExpression
      | TSESTree.FunctionDeclaration
      | null = null;
    let hasAuthCheck = false;
    let hasEventParameter = false;
    const sensitiveOperations: {
      node: TSESTree.CallExpression;
      operation: string;
    }[] = [];

    /**
     * Reset state when entering a new function
     */
    function enterFunction(
      node:
        | TSESTree.ArrowFunctionExpression
        | TSESTree.FunctionExpression
        | TSESTree.FunctionDeclaration,
    ) {
      // Check if this function has an event parameter
      const hasEvent = node.params.some(
        (param) =>
          param.type === AST_NODE_TYPES.Identifier &&
          EVENT_PARAM_NAMES.includes(param.name),
      );

      if (hasEvent) {
        currentFunctionNode = node;
        hasAuthCheck = false;
        hasEventParameter = true;
        sensitiveOperations.length = 0;
      }
    }

    /**
     * Check and report on function exit
     */
    function exitFunction(
      node:
        | TSESTree.ArrowFunctionExpression
        | TSESTree.FunctionExpression
        | TSESTree.FunctionDeclaration,
    ) {
      if (currentFunctionNode !== node) return;

      // Report if we have sensitive operations without auth check
      if (hasEventParameter && !hasAuthCheck) {
        for (const { node: opNode, operation } of sensitiveOperations) {
          context.report({
            node: opNode,
            messageId: 'missingAuthCheck',
            data: { operation },
            suggest: [
              {
                messageId: 'addAuthCheck',
                fix: () => null,
              },
            ],
          });
        }
      }

      currentFunctionNode = null;
      hasEventParameter = false;
    }

    /**
     * Check if a member expression chain indicates auth check
     */
    function isAuthorizationAccess(node: TSESTree.MemberExpression): boolean {
      const sourceCode = context.sourceCode || context.getSourceCode();
      const text = sourceCode.getText(node);

      return AUTHORIZATION_CHECK_PATTERNS.some(
        (pattern) =>
          text.includes(pattern) ||
          text.toLowerCase().includes(pattern.toLowerCase()),
      );
    }

    /**
     * Check if call is a sensitive operation
     */
    function getSensitiveOperationName(
      node: TSESTree.CallExpression,
    ): string | null {
      if (node.callee.type === AST_NODE_TYPES.MemberExpression) {
        const property = node.callee.property;
        if (property.type === AST_NODE_TYPES.Identifier) {
          if (SENSITIVE_OPERATIONS.includes(property.name)) {
            return property.name;
          }
        }
      }
      return null;
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

      // Detect authorization checks
      MemberExpression(node: TSESTree.MemberExpression) {
        if (!currentFunctionNode) return;

        if (isAuthorizationAccess(node)) {
          hasAuthCheck = true;
        }
      },

      // Track sensitive operations
      CallExpression(node: TSESTree.CallExpression) {
        if (!currentFunctionNode) return;

        const operation = getSensitiveOperationName(node);
        if (operation) {
          sensitiveOperations.push({ node, operation });
        }
      },

      // Detect early returns (401/403) as auth checks
      ReturnStatement(node: TSESTree.ReturnStatement) {
        if (!currentFunctionNode) return;

        if (node.argument?.type === AST_NODE_TYPES.ObjectExpression) {
          for (const prop of node.argument.properties) {
            if (
              prop.type === AST_NODE_TYPES.Property &&
              prop.key.type === AST_NODE_TYPES.Identifier &&
              prop.key.name === 'statusCode' &&
              prop.value.type === AST_NODE_TYPES.Literal &&
              (prop.value.value === 401 || prop.value.value === 403)
            ) {
              hasAuthCheck = true;
            }
          }
        }
      },
    };
  },
});
