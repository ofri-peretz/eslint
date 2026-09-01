/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: require-timeout-handling
 * Warns when Lambda handlers lack timeout handling
 * CWE-400: Uncontrolled Resource Consumption
 *
 * @see https://cwe.mitre.org/data/definitions/400.html
 * @see https://owasp.org/www-project-serverless-top-10/
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { fileIsLambda } from '../../utils/lambda-evidence';
import {
  DEFAULT_CONTEXT_PARAM_NAMES,
  DEFAULT_EVENT_PARAM_NAMES,
  HANDLER_PARAM_SCHEMA,
} from '../../utils/handler-params';
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
  isTestFilePath,
} from '@interlace/eslint-devkit';

type MessageIds = 'missingTimeoutHandling';

export interface Options {
  /**
   * Parameter names that identify the Lambda EVENT argument. REPLACES the
   * default.
   *
   * AWS documents the signature as `(event, context, callback)` but the
   * parameters are POSITIONAL — a handler written `(payload, runtime)` is
   * ordinary and matched none of the hardcoded list. Position alone cannot
   * decide it either: `params.length >= 1` would make every one-argument
   * function a handler. The name is doing real work, which is why the consumer
   * has to be able to state it.
   */
  eventParamNames?: string[];
  /** Parameter names that identify the Lambda CONTEXT argument. REPLACES the default. */
  contextParamNames?: string[];
  /** Allow in test files. Default: true */
  allowInTests?: boolean;
}

type RuleOptions = [Options?];

// Lambda context parameter names

// Event parameter names (to identify Lambda handlers)

// External call patterns that could timeout
const EXTERNAL_CALL_PATTERNS = new Set([
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
]);

export const requireTimeoutHandling = createRule<RuleOptions, MessageIds>({
  name: 'require-timeout-handling',
  meta: {
    type: 'suggestion',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-lambda-security/docs/rules/require-timeout-handling.md',
      description:
        'Warns when Lambda handlers with external calls lack timeout handling',
      cwe: 'CWE-400',
      cvss: 6,
    },
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
    },
    schema: [
      {
        type: 'object',
        properties: {
          ...HANDLER_PARAM_SCHEMA,
          contextParamNames: {
            type: 'array',
            items: { type: 'string' },
            default: [...DEFAULT_CONTEXT_PARAM_NAMES],
            description:
              'Parameter names that identify the Lambda context argument. Replaces the default.',
          },
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

    const eventParamNames = new Set(
      options.eventParamNames ?? DEFAULT_EVENT_PARAM_NAMES,
    );
    const contextParamNames = new Set(
      options.contextParamNames ?? DEFAULT_CONTEXT_PARAM_NAMES,
    );

    const { allowInTests = true } = options as Options;
    const filename = context.filename;
    const isTestFile = isTestFilePath(filename);

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
          p.type === AST_NODE_TYPES.Identifier && eventParamNames.has(p.name),
      );
      const hasContext = params.some(
        (p) =>
          p.type === AST_NODE_TYPES.Identifier && contextParamNames.has(p.name),
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

      'ArrowFunctionExpression:exit'(node: TSESTree.ArrowFunctionExpression) {
        exitFunction(node);
      },
      'FunctionExpression:exit'(node: TSESTree.FunctionExpression) {
        exitFunction(node);
      },
      'FunctionDeclaration:exit'(node: TSESTree.FunctionDeclaration) {
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
          if (EXTERNAL_CALL_PATTERNS.has(node.callee.name)) {
            hasExternalCalls = true;
          }
        }

        if (node.callee.type === AST_NODE_TYPES.MemberExpression) {
          const property = node.callee.property;
          if (
            property.type === AST_NODE_TYPES.Identifier &&
            EXTERNAL_CALL_PATTERNS.has(property.name)
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
