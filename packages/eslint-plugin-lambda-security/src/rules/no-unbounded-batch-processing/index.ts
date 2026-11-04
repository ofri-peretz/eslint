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
  namesOneOf,
  objectKeyName,
  propertyName,
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
    interop: { runtimes: ['eslint', 'oxlint'] },
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
  createOnce(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    currentOptions,
  ) {
    let eventParamNames: Set<string>;
    let currentHandlerNode:
      | TSESTree.ArrowFunctionExpression
      | TSESTree.FunctionExpression
      | TSESTree.FunctionDeclaration
      | null;
    let hasBatchSizeCheck: boolean;
    let batchAccessNodes: { node: TSESTree.Node; source: string }[];
    let eventParamName: string[];
    /** Locals destructured out of the event: `const { Records } = event`. */
    let batchAliases: Set<string>;
    let maxBatchSize: number;

    /** `event.Records`, `event['Records']`, or a `Records` destructured from it. */
    function isBatch(node: TSESTree.Node): boolean {
      if (node.type === AST_NODE_TYPES.Identifier) {
        return batchAliases.has(node.name);
      }
      return (
        node.type === AST_NODE_TYPES.MemberExpression &&
        node.object.type === AST_NODE_TYPES.Identifier &&
        eventParamName.includes(node.object.name) &&
        namesOneOf(propertyName(node), BATCH_SOURCE_PROPERTIES)
      );
    }

    /**
     * Whether `limit` bounds the batch: anything but a literal above
     * `maxBatchSize`. `if (event.Records.length > 10000)` lets ten thousand
     * records through, which is the unbounded case with a check written on it.
     */
    function bounds(limit: TSESTree.Node | undefined): boolean {
      return !(
        limit?.type === AST_NODE_TYPES.Literal &&
        typeof limit.value === 'number' &&
        limit.value > maxBatchSize
      );
    }

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
      before() {
        const [options = {}] = currentOptions();
        // Every rule here is Lambda-specific, and none of them knew it: over 107,382
        // files, 98% of this plugin's findings were in files with no AWS anything.
        // Registering no visitors is both the gate and the cheap path.
        if (!fileIsLambda(context.sourceCode.ast)) return false;

        eventParamNames = new Set(
          options.eventParamNames ?? DEFAULT_EVENT_PARAM_NAMES,
        );

        const { allowInTests = true } = options as Options;
        ({ maxBatchSize } = { maxBatchSize: 100, ...options });
        const filename = context.filename;
        const isTestFile = isTestFilePath(filename);

        if (allowInTests && isTestFile) {
          return false;
        }

        // Track handler functions
        currentHandlerNode = null;
        hasBatchSizeCheck = false;
        batchAccessNodes = [];
        eventParamName = [];
        batchAliases = new Set();
        return true;
      },
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
        if (isBatch(node)) {
          batchAccessNodes.push({
            node,
            source: `${(node.object as TSESTree.Identifier).name}.${propertyName(node)}`,
          });
        }
      },

      // const { Records } = event
      VariableDeclarator(node: TSESTree.VariableDeclarator) {
        if (
          !currentHandlerNode ||
          node.id.type !== AST_NODE_TYPES.ObjectPattern ||
          node.init?.type !== AST_NODE_TYPES.Identifier ||
          !eventParamName.includes(node.init.name)
        ) {
          return;
        }
        for (const prop of node.id.properties) {
          if (
            prop.type === AST_NODE_TYPES.Property &&
            prop.value.type === AST_NODE_TYPES.Identifier &&
            namesOneOf(objectKeyName(prop), BATCH_SOURCE_PROPERTIES)
          ) {
            batchAliases.add(prop.value.name);
            batchAccessNodes.push({
              node: prop,
              source: `${node.init.name}.${objectKeyName(prop)}`,
            });
          }
        }
      },

      // Detect slice/splice/take/chunk limiting THE BATCH — `id.slice(0, 8)`
      // on a message id bounds nothing.
      CallExpression(node: TSESTree.CallExpression) {
        if (!currentHandlerNode) return;
        const callee = node.callee;
        // event.Records.slice(0, n), .splice(0, n), .take(n)
        if (
          callee.type === AST_NODE_TYPES.MemberExpression &&
          isBatch(callee.object)
        ) {
          const method = propertyName(callee);
          if (method === 'slice' || method === 'splice') {
            hasBatchSizeCheck ||= bounds(node.arguments[1]);
          } else if (method === 'take') {
            hasBatchSizeCheck ||= bounds(node.arguments[0]);
          }
        }
        // chunk(event.Records, n), take(event.Records, n)
        if (
          callee.type === AST_NODE_TYPES.Identifier &&
          ['take', 'chunk'].includes(callee.name) &&
          node.arguments.length > 0 &&
          isBatch(node.arguments[0])
        ) {
          hasBatchSizeCheck ||= bounds(node.arguments[1]);
        }
      },

      // Detect size comparisons on the batch's own length
      BinaryExpression(node: TSESTree.BinaryExpression) {
        if (!currentHandlerNode) return;
        if (!['<', '<=', '>', '>='].includes(node.operator)) return;
        for (const [side, other] of [
          [node.left, node.right],
          [node.right, node.left],
        ]) {
          if (
            side.type === AST_NODE_TYPES.MemberExpression &&
            propertyName(side) === 'length' &&
            isBatch(side.object)
          ) {
            hasBatchSizeCheck ||= bounds(other);
          }
        }
      },
    };
  },
});
