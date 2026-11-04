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
  namesOneOf,
  objectKeyName,
  propertyName,
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
  'path',
  'hostname',
  'config',
  'env',
]);

/** Node's module-scope paths: where the function is deployed. */
const DEPLOYMENT_PATHS = new Set(['__dirname', '__filename']);

/**
 * Names that hold an error when nothing binds them to a `catch`: a helper's
 * `(error)` parameter, a `.catch((err) => …)` callback.
 */
const ERROR_NAME = /^(e|ex|err|error|exception)$|Error$/;

export const noExposedErrorDetails = createRule<RuleOptions, MessageIds>({
  name: 'no-exposed-error-details',
  meta: {
    interop: { runtimes: ['eslint', 'oxlint'] },
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
  createOnce(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    currentOptions,
  ) {
    /**
     * Whether an object literal is a Lambda proxy-integration response.
     *
     * Wherever it is written — returned, built in a variable first, or handed
     * to the Lambda `callback` — it is what API Gateway sends to the caller.
     * The rule previously looked only inside a `return` statement.
     */
    function isApiResponse(node: TSESTree.ObjectExpression): boolean {
      return node.properties.some(
        (prop) =>
          prop.type === AST_NODE_TYPES.Property &&
          // @vocabulary AWS Lambda proxy-integration response shape
          namesOneOf(objectKeyName(prop), ['statusCode', 'body', 'headers']),
      );
    }

    function resolve(id: TSESTree.Identifier) {
      for (
        let scope: TSESLint.Scope.Scope | null =
          context.sourceCode.getScope(id);
        scope;
        scope = scope.upper
      ) {
        const variable = scope.set.get(id.name);
        if (variable) return variable;
      }
      return undefined;
    }

    /**
     * Whether an expression is the caught error — bound by a `catch` clause,
     * or named as one. A `deployment.stack` or `JSON.stringify(order)` is the
     * application's own data: the previous name test, `/error|err|e|exception/i`,
     * matched any identifier containing an `e`.
     */
    function isError(node: TSESTree.Node): boolean {
      if (node.type !== AST_NODE_TYPES.Identifier) return false;
      const variable = resolve(node);
      return (
        ERROR_NAME.test(node.name) ||
        (variable?.defs.some((d) => d.type === 'CatchClause') ?? false)
      );
    }

    /** What, if anything, this node discloses: a property name or a label. */
    function disclosure(node: TSESTree.Node): string | null {
      if (node.type === AST_NODE_TYPES.MemberExpression) {
        // `error['stack']` exposes the same trace `error.stack` exposes.
        const field = propertyName(node);
        return field !== null &&
          SENSITIVE_ERROR_PROPERTIES.has(field) &&
          isError(node.object)
          ? field
          : null;
      }
      if (node.type === AST_NODE_TYPES.Identifier) {
        // `__dirname` is the module's own location on disk — and so is the
        // ESM `const __dirname = dirname(fileURLToPath(import.meta.url))`.
        return DEPLOYMENT_PATHS.has(node.name) ? node.name : null;
      }
      if (
        node.type === AST_NODE_TYPES.CallExpression &&
        node.callee.type === AST_NODE_TYPES.MemberExpression &&
        node.callee.object.type === AST_NODE_TYPES.Identifier &&
        node.callee.object.name === 'JSON' &&
        propertyName(node.callee) === 'stringify' &&
        node.arguments.length > 0 &&
        isError(node.arguments[0])
      ) {
        return 'error object';
      }
      return null;
    }

    /** Report every disclosure in a response's property values. */
    function scan(node: TSESTree.Node): void {
      const property = disclosure(node);
      if (property !== null) {
        context.report({
          node,
          messageId: 'exposedErrorDetails',
          data: { property },
        });
        return;
      }
      for (const key of Object.keys(node)) {
        if (key === 'parent') continue;
        // A non-computed key or member property names something; it is not
        // a value that reaches the response.
        if (
          (key === 'key' || key === 'property') &&
          !(node as { computed?: boolean }).computed
        ) {
          continue;
        }
        const value = (node as unknown as Record<string, unknown>)[key];
        for (const child of Array.isArray(value) ? value : [value]) {
          if (child && typeof (child as TSESTree.Node).type === 'string') {
            scan(child as TSESTree.Node);
          }
        }
      }
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
      ObjectExpression(node: TSESTree.ObjectExpression) {
        if (!isApiResponse(node)) return;
        for (const prop of node.properties) scan(prop);
      },
    };
  },
});
