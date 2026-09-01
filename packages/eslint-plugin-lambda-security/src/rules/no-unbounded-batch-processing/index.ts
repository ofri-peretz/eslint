/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-unbounded-batch-processing
 * Detects processing arrays/records without size limits
 * CWE-770: Allocation of Resources Without Limits
 *
 * @see https://cwe.mitre.org/data/definitions/770.html
 * @see https://owasp.org/www-project-serverless-top-10/
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { fileIsLambda } from '../../utils/lambda-evidence';
import {
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

type MessageIds = 'unboundedBatch';

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
  /** Allow in test files. Default: true */
  allowInTests?: boolean;
  /** Maximum allowed batch size before warning. Default: 100 */
  maxBatchSize?: number;
}

type RuleOptions = [Options?];

// Event sources with Records array
const BATCH_SOURCE_PROPERTIES = new Set([
  'Records', // SQS, SNS, DynamoDB Streams, Kinesis, S3
  'records', // Some custom structures
  'items', // Custom batches
  'messages', // Custom message batches
]);

// Event parameter names

export const noUnboundedBatchProcessing = createRule<RuleOptions, MessageIds>({
  name: 'no-unbounded-batch-processing',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-lambda-security/docs/rules/no-unbounded-batch-processing.md',
      description: 'Detects processing batch records without size validation',
      cwe: 'CWE-770',
      cvss: 5.5,
    },
    messages: {
      unboundedBatch: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Unbounded Batch Processing',
        cwe: 'CWE-770',
        cvss: 5.5,
        description:
          'Processing {{source}} without size check. Large batches may cause timeout or memory exhaustion.',
        severity: 'MEDIUM',
        fix: 'Validate batch size before processing: if (event.Records.length > MAX_BATCH) throw new Error("Batch too large")',
        documentationLink:
          'https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          ...HANDLER_PARAM_SCHEMA,
          allowInTests: {
            type: 'boolean',
            default: true,
          },
          maxBatchSize: {
            type: 'number',
            default: 100,
            description:
              'Batch size above which processing must be explicitly bounded',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ allowInTests: true, maxBatchSize: 100 }],
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
    let hasBatchSizeCheck = false;
    const batchAccessNodes: { node: TSESTree.Node; source: string }[] = [];
    const eventParamName: string[] = [];

    function enterFunction(
      node:
        | TSESTree.ArrowFunctionExpression
        | TSESTree.FunctionExpression
        | TSESTree.FunctionDeclaration,
    ) {
      const hasEvent = node.params.some((p) => {
        if (
          p.type === AST_NODE_TYPES.Identifier &&
          eventParamNames.has(p.name)
        ) {
          eventParamName.push(p.name);
          return true;
        }
        return false;
      });

      if (hasEvent) {
        currentHandlerNode = node;
        hasBatchSizeCheck = false;
        batchAccessNodes.length = 0;
      }
    }

    function exitFunction(
      node:
        | TSESTree.ArrowFunctionExpression
        | TSESTree.FunctionExpression
        | TSESTree.FunctionDeclaration,
    ) {
      if (currentHandlerNode !== node) return;

      // Report if batch is processed without size check
      if (!hasBatchSizeCheck) {
        for (const { node: batchNode, source } of batchAccessNodes) {
          context.report({
            node: batchNode,
            messageId: 'unboundedBatch',
            data: { source },
          });
        }
      }

      currentHandlerNode = null;
      eventParamName.length = 0;
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

      // Detect event.Records access
      MemberExpression(node: TSESTree.MemberExpression) {
        if (!currentHandlerNode) return;

        // event.Records
        if (
          node.object.type === AST_NODE_TYPES.Identifier &&
          eventParamName.includes(node.object.name) &&
          node.property.type === AST_NODE_TYPES.Identifier &&
          BATCH_SOURCE_PROPERTIES.has(node.property.name)
        ) {
          batchAccessNodes.push({
            node,
            source: `${node.object.name}.${node.property.name}`,
          });
        }

        // Check for .length access (indicates size check)
        if (
          node.property.type === AST_NODE_TYPES.Identifier &&
          node.property.name === 'length'
        ) {
          // Check if this is Records.length
          if (
            node.object.type === AST_NODE_TYPES.MemberExpression &&
            node.object.property.type === AST_NODE_TYPES.Identifier &&
            BATCH_SOURCE_PROPERTIES.has(node.object.property.name)
          ) {
            hasBatchSizeCheck = true;
          }
        }
      },

      // Detect slice/splice (limiting)
      CallExpression(node: TSESTree.CallExpression) {
        if (!currentHandlerNode) return;

        if (
          node.callee.type === AST_NODE_TYPES.MemberExpression &&
          node.callee.property.type === AST_NODE_TYPES.Identifier &&
          ['slice', 'splice', 'take', 'chunk'].includes(
            node.callee.property.name,
          )
        ) {
          hasBatchSizeCheck = true;
        }

        // Also detect top-level function calls: chunk(arr, n), take(arr, n)
        if (
          node.callee.type === AST_NODE_TYPES.Identifier &&
          ['slice', 'splice', 'take', 'chunk'].includes(node.callee.name)
        ) {
          hasBatchSizeCheck = true;
        }
      },

      // Detect size comparisons
      BinaryExpression(node: TSESTree.BinaryExpression) {
        if (!currentHandlerNode) return;

        if (['<', '<=', '>', '>='].includes(node.operator)) {
          const sourceCode = context.sourceCode;
          const text = sourceCode.getText(node);

          if (/\.length|Records|records/.test(text)) {
            hasBatchSizeCheck = true;
          }
        }
      },
    };
  },
});
