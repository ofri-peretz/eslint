/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-env-logging
 * Detects logging of environment variables which may contain secrets
 * CWE-532: Insertion of Sensitive Information into Log File
 *
 * @see https://cwe.mitre.org/data/definitions/532.html
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
  isTestFilePath,
  propertyName,
} from '@interlace/eslint-devkit';
import { fileIsLambda } from '../../utils/lambda-evidence';

type MessageIds = 'envLogging';

export interface Options {
  /** Allow in test files. Default: true */
  allowInTests?: boolean;
}

type RuleOptions = [Options?];

/** Calls that hand every value of their argument on to the log line. */
const SERIALIZERS = new Set([
  'JSON.stringify',
  'Object.entries',
  'Object.fromEntries',
  'Object.values',
  'Object.assign',
]);

// Logging function names
const LOGGING_FUNCTIONS = new Set([
  'log',
  'info',
  'warn',
  'error',
  'debug',
  'trace',
]);

export const noEnvLogging = createRule<RuleOptions, MessageIds>({
  name: 'no-env-logging',
  meta: {
    interop: { runtimes: ['eslint', 'oxlint'] },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-lambda-security/docs/rules/no-env-logging.md',
      description: 'Detects logging of process.env which may expose secrets',
      cwe: 'CWE-532',
      cvss: 5.3,
    },
    messages: {
      envLogging: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Environment Variable Logging',
        cwe: 'CWE-532',
        description:
          'Logging process.env may expose secrets (API keys, passwords, tokens)',
        severity: 'HIGH',
        fix: 'Remove process.env from log statements or log specific non-sensitive values',
        documentationLink: 'https://cwe.mitre.org/data/definitions/532.html',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: { type: 'boolean', default: true },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ allowInTests: true }],
  createOnce(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    currentOptions,
  ) {
    /** `process.env` / `process['env']` — the whole environment object. */
    function isProcessEnv(node: TSESTree.Node): boolean {
      return (
        node.type === AST_NODE_TYPES.MemberExpression &&
        node.object.type === AST_NODE_TYPES.Identifier &&
        node.object.name === 'process' &&
        propertyName(node) === 'env'
      );
    }

    /**
     * Whether evaluating `node` hands the environment's VALUES to the logger.
     *
     * Read off the AST, not the printed source. The previous check regexed the
     * argument text for `process.env` followed by `,`, `)` or `]`, so
     * `{ env: process.env }` and `{ ...process.env }` — the structured-logger
     * payloads the docs lead with — passed, while `Object.keys(process.env)`,
     * which prints only names, was reported.
     *
     * A template literal or `+` coerces a bare `process.env` to
     * "[object Object]" and leaks nothing; only what is serialized inside them
     * counts.
     */
    function leaksEnv(node: TSESTree.Node): boolean {
      switch (node.type) {
        case AST_NODE_TYPES.MemberExpression:
          return isProcessEnv(node);
        case AST_NODE_TYPES.TSAsExpression:
        case AST_NODE_TYPES.TSNonNullExpression:
        case AST_NODE_TYPES.SpreadElement:
          return leaksEnv(
            node.type === AST_NODE_TYPES.SpreadElement
              ? node.argument
              : node.expression,
          );
        case AST_NODE_TYPES.ObjectExpression:
          return node.properties.some((p) =>
            leaksEnv(p.type === AST_NODE_TYPES.Property ? p.value : p),
          );
        case AST_NODE_TYPES.ArrayExpression:
          return node.elements.some((e) => e !== null && leaksEnv(e));
        case AST_NODE_TYPES.ConditionalExpression:
          return leaksEnv(node.consequent) || leaksEnv(node.alternate);
        case AST_NODE_TYPES.LogicalExpression:
          return leaksEnv(node.left) || leaksEnv(node.right);
        case AST_NODE_TYPES.AssignmentExpression:
          // console.log(saved = process.env) logs the assigned value.
          return node.operator === '=' && leaksEnv(node.right);
        case AST_NODE_TYPES.SequenceExpression:
          return leaksEnv(node.expressions[node.expressions.length - 1]);
        case AST_NODE_TYPES.TemplateLiteral:
          return node.expressions.some(leaksWhenCoerced);
        case AST_NODE_TYPES.BinaryExpression:
          // Only `+` builds a string; `===` and friends log a boolean.
          return (
            node.operator === '+' &&
            [node.left, node.right].some(leaksWhenCoerced)
          );
        case AST_NODE_TYPES.CallExpression:
          return (
            node.callee.type === AST_NODE_TYPES.MemberExpression &&
            node.callee.object.type === AST_NODE_TYPES.Identifier &&
            SERIALIZERS.has(
              `${node.callee.object.name}.${propertyName(node.callee)}`,
            ) &&
            node.arguments.some(leaksEnv)
          );
        default:
          return false;
      }
    }

    /**
     * Inside a template literal or a `+`, an object is coerced to
     * "[object Object]" — `${process.env}` and `${{ env: process.env }}` print
     * nothing. Only an expression that is already a string carries the
     * values: a serializer call, or a nested template / concatenation.
     */
    function leaksWhenCoerced(node: TSESTree.Node): boolean {
      return (
        (node.type === AST_NODE_TYPES.CallExpression ||
          node.type === AST_NODE_TYPES.TemplateLiteral ||
          node.type === AST_NODE_TYPES.BinaryExpression) &&
        leaksEnv(node)
      );
    }

    /**
     * Check if this is a console/logger call
     */
    function isLoggingCall(node: TSESTree.CallExpression): boolean {
      if (node.callee.type !== AST_NODE_TYPES.MemberExpression) return false;
      const obj = node.callee.object;
      const methodName = propertyName(node.callee);
      if (methodName === null || !LOGGING_FUNCTIONS.has(methodName)) {
        return false;
      }
      // console.log, console.info, logger.log, log.info, etc.
      return (
        obj.type === AST_NODE_TYPES.Identifier &&
        (obj.name === 'console' || /log(ger)?/i.test(obj.name))
      );
    }

    return {
      before() {
        const [options = {}] = currentOptions();
        // Every rule here is Lambda-specific, and none of them knew it: over 107,382
        // files, 98% of this plugin's findings were in files with no AWS anything.
        // Registering no visitors is both the gate and the cheap path.
        if (!fileIsLambda(context.sourceCode.ast)) return false;

        const { allowInTests = true } = options as Options;
        const filename = context.filename;
        const isTestFile = isTestFilePath(filename);

        if (allowInTests && isTestFile) {
          return false;
        }

        return true;
      },
      CallExpression(node: TSESTree.CallExpression) {
        if (!isLoggingCall(node)) return;
        for (const arg of node.arguments) {
          if (leaksEnv(arg)) {
            context.report({ node: arg, messageId: 'envLogging' });
          }
        }
      },
    };
  },
});
