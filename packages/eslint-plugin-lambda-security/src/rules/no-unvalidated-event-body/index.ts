/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-unvalidated-event-body
 * Detects Lambda handlers using event body/params without validation
 * CWE-20: Improper Input Validation
 *
 * @see https://cwe.mitre.org/data/definitions/20.html
 * @see https://owasp.org/www-project-serverless-top-10/
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';

type MessageIds = 'unvalidatedInput' | 'useValidation';

export interface Options {
  /** Allow in test files. Default: true */
  allowInTests?: boolean;
  /** Additional event properties to check. Default: [] */
  additionalProperties?: string[];
}

type RuleOptions = [Options?];

// Properties on 'event' that contain untrusted user input
const DANGEROUS_EVENT_PROPERTIES = [
  'body',
  'queryStringParameters',
  'pathParameters',
  'multiValueQueryStringParameters',
  'headers',
  'multiValueHeaders',
  'rawPath',
  'rawQueryString',
];

// Property accesses that indicate validation
const VALIDATION_INDICATORS = new Set([
  // Middy validators
  'validator',
  'httpJsonBodyParser',
  '@middy/validator',
  // Schema libraries
  'parse', // zod.parse()
  'validate', // joi.validate(), yup.validate()
  'parseAsync', // zod.parseAsync()
  'safeParse',
  'safeParseAsync',
  'assert', // superstruct.assert()
  'is', // superstruct.is()
]);

export const noUnvalidatedEventBody = createRule<RuleOptions, MessageIds>({
  name: 'no-unvalidated-event-body',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-lambda-security/docs/rules/no-unvalidated-event-body.md',
      description:
        'Detects Lambda handlers using event body/params without validation',
      cwe: 'CWE-20',
      cvss: 8,
    },
    hasSuggestions: true,
    messages: {
      unvalidatedInput: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Unvalidated Event Input',
        cwe: 'CWE-20',
        cvss: 8.0,
        description:
          'Lambda handler uses {{property}} without validation. This can lead to injection attacks.',
        severity: 'HIGH',
        fix: 'Validate event input using Middy validator, Zod, or Joi before use',
        documentationLink:
          'https://owasp.org/www-project-serverless-top-10/',
      }),
      useValidation: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Add Input Validation',
        description:
          'Add input validation using Middy validator middleware or a schema library',
        severity: 'LOW',
        fix: "import { validator } from '@middy/validator'; middy(handler).use(validator({ inputSchema }))",
        documentationLink:
          'https://middy.js.org/docs/middlewares/validator',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: {
            type: 'boolean',
            default: true,
            description: 'Allow unvalidated input in test files',
          },
          additionalProperties: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Additional event properties to check',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      allowInTests: true,
      additionalProperties: [],
    },
  ],
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options = {}],
  ) {
    const { allowInTests = true, additionalProperties = [] } = options as Options;
    const filename = context.filename;
    const isTestFile = /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);

    if (allowInTests && isTestFile) {
      return {};
    }

    const dangerousProperties = new Set([
      ...DANGEROUS_EVENT_PROPERTIES,
      ...additionalProperties,
    ]);

    // Track which variables have been validated
    const validatedVariables = new Set<string>();
    // Track which event parameters we're monitoring
    const eventParameters = new Set<string>();
    // Track if we're inside a handler that uses validation middleware
    let hasValidationMiddleware = false;

    /**
     * Check if an expression indicates validation has occurred
     */
    function isValidationCall(node: TSESTree.Node): boolean {
      if (node.type === AST_NODE_TYPES.CallExpression) {
        // Check for schema.parse(x), schema.validate(x), etc.
        if (node.callee.type === AST_NODE_TYPES.MemberExpression) {
          const property = node.callee.property;
          if (
            property.type === AST_NODE_TYPES.Identifier &&
            VALIDATION_INDICATORS.has(property.name)
          ) {
            return true;
          }
        }
        // Check for direct function calls like validate(x)
        if (node.callee.type === AST_NODE_TYPES.Identifier) {
          if (VALIDATION_INDICATORS.has(node.callee.name)) {
            return true;
          }
        }
      }
      return false;
    }

    /**
     * Check if this is an event parameter access (e.g., event.body)
     */
    function isEventPropertyAccess(
      node: TSESTree.MemberExpression,
    ): { eventName: string; property: string } | null {
      if (
        node.object.type === AST_NODE_TYPES.Identifier &&
        eventParameters.has(node.object.name) &&
        node.property.type === AST_NODE_TYPES.Identifier &&
        dangerousProperties.has(node.property.name)
      ) {
        return {
          eventName: node.object.name,
          property: node.property.name,
        };
      }
      return null;
    }

    // NOTE: a dedicated `isJsonParseOfEventBody(parent)` check used to live
    // here, but it was dead code: `JSON.parse(...)` always satisfies
    // `isValidationCall` first ('parse' is in VALIDATION_INDICATORS), so the
    // early return above it made it unreachable for every possible AST.

    // Determine whether THIS file looks like Lambda code at all. We're
    // strict: a function parameter is only treated as a Lambda event if
    // (a) it's named `event` AND its sibling is `context` (the AWS
    // signature `(event, context)` or `(event, context, callback)`),
    // or (b) the file imports `aws-lambda` types / `@aws-sdk/*` /
    // `@middy/*`. This eliminates the audit-reported FP class where
    // Express handlers (`function handler(req, res)` or
    // `(request, response)`) were misclassified as Lambda. The previous
    // allowlist of `['event', 'evt', 'e', 'request', 'req']` was too
    // loose — see benchmarks/AUDIT_PATTERNS.md §2.4.
    const sourceCode = context.sourceCode;
    const fileImportsLambda = sourceCode.ast.body.some((n) => {
      if (n.type !== AST_NODE_TYPES.ImportDeclaration) return false;
      const src = String((n as TSESTree.ImportDeclaration).source.value);
      return (
        src === 'aws-lambda' ||
        src.startsWith('@aws-sdk/') ||
        src.startsWith('@middy/') ||
        src === '@aws-cdk/aws-lambda'
      );
    });

    // Detect the `export const handler = ...`, `exports.handler = ...`,
    // and `module.exports.handler = ...` Lambda export conventions. A
    // function attached to one of these is a Lambda handler regardless
    // of whether it has the (event, context) signature or just a single
    // `event` parameter — that's the AWS Lambda convention.
    function isExportedAsHandler(
      node: TSESTree.ArrowFunctionExpression | TSESTree.FunctionExpression | TSESTree.FunctionDeclaration,
    ): boolean {
      // function handler() {}  /  export function handler() {}
      if (
        node.type === AST_NODE_TYPES.FunctionDeclaration &&
        node.id?.name === 'handler'
      ) {
        return true;
      }
      const parent = (node as TSESTree.Node & { parent?: TSESTree.Node }).parent;
      if (!parent) return false;
      // const handler = (...)  /  export const handler = (...)
      if (
        parent.type === AST_NODE_TYPES.VariableDeclarator &&
        parent.id.type === AST_NODE_TYPES.Identifier &&
        parent.id.name === 'handler'
      ) {
        return true;
      }
      // exports.handler = (...) / module.exports.handler = (...)
      if (parent.type === AST_NODE_TYPES.AssignmentExpression) {
        const left = parent.left;
        if (
          left.type === AST_NODE_TYPES.MemberExpression &&
          left.property.type === AST_NODE_TYPES.Identifier &&
          left.property.name === 'handler'
        ) {
          return true;
        }
      }
      return false;
    }

    function isLambdaSignature(
      params: readonly TSESTree.Parameter[],
      node: TSESTree.ArrowFunctionExpression | TSESTree.FunctionExpression | TSESTree.FunctionDeclaration,
    ): boolean {
      if (params.length < 1) return false;
      const first = params[0];
      if (first.type !== AST_NODE_TYPES.Identifier) return false;
      const second = params[1];
      const hasContextSibling =
        second?.type === AST_NODE_TYPES.Identifier &&
        (second.name === 'context' || second.name === 'callback');
      // Discriminator: 2-arg `(req, res)` / `(request, response)` is
      // Express, not Lambda. Reject explicitly so we never misclassify.
      const looksLikeExpress =
        second?.type === AST_NODE_TYPES.Identifier &&
        ((first.name === 'req' && second.name === 'res') ||
          (first.name === 'request' && second.name === 'response'));
      if (looksLikeExpress) return false;

      const isEventName = first.name === 'event' || first.name === 'evt';
      // Path 1: classic AWS signature (event, context, ...).
      if (isEventName && hasContextSibling) return true;
      // Path 2: file imports Lambda-related modules — single-arg
      // `event`/`evt` is enough.
      if (isEventName && fileImportsLambda) return true;
      // Path 3: function is exported under the conventional `handler`
      // name (AWS Lambda runtime invokes by that name). The Lambda
      // export convention narrows the param-name allowlist to common
      // AWS-event identifiers — Express's 2-arg form is already
      // excluded by `looksLikeExpress` above.
      if (isExportedAsHandler(node)) {
        const allowedHandlerParam = ['event', 'evt', 'e', 'request', 'req'];
        if (allowedHandlerParam.includes(first.name)) return true;
      }
      return false;
    }

    return {
      // Track arrow function/function parameters that match a Lambda
      // handler signature. Three valid paths (see isLambdaSignature):
      //   (a) (event, context, ...) — classic AWS shape
      //   (b) single-arg `event` AND file imports aws-lambda / @aws-sdk
      //   (c) function exported as `handler` (AWS Lambda export convention)
      // Express handlers never satisfy any of these.
      'ArrowFunctionExpression, FunctionExpression, FunctionDeclaration'(
        node: TSESTree.ArrowFunctionExpression | TSESTree.FunctionExpression | TSESTree.FunctionDeclaration,
      ) {
        if (!isLambdaSignature(node.params, node)) return;
        // isLambdaSignature already guarantees params[0] is an Identifier
        // (it returns false otherwise), so a type-narrowing cast is safe here.
        const first = node.params[0] as TSESTree.Identifier;
        eventParameters.add(first.name);
      },

      // Check for Middy with validation middleware
      CallExpression(node: TSESTree.CallExpression) {
        // Check for middy().use(validator(...))
        if (
          node.callee.type === AST_NODE_TYPES.MemberExpression &&
          node.callee.property.type === AST_NODE_TYPES.Identifier &&
          node.callee.property.name === 'use'
        ) {
          // Check if argument is validator call
          for (const arg of node.arguments) {
            if (
              arg.type === AST_NODE_TYPES.CallExpression &&
              arg.callee.type === AST_NODE_TYPES.Identifier &&
              ['validator', 'httpJsonBodyParser'].includes(arg.callee.name)
            ) {
              hasValidationMiddleware = true;
            }
          }
        }

        // Track validation calls that assign to variables
        if (isValidationCall(node)) {
          // If this is part of a variable assignment, mark that variable as validated
          const parent = node.parent;
          if (
            parent?.type === AST_NODE_TYPES.VariableDeclarator &&
            parent.id.type === AST_NODE_TYPES.Identifier
          ) {
            validatedVariables.add(parent.id.name);
          }
        }
      },

      // Check direct access to event properties without validation
      MemberExpression(node: TSESTree.MemberExpression) {
        // Skip if validation middleware is present
        if (hasValidationMiddleware) return;

        const eventAccess = isEventPropertyAccess(node);
        if (!eventAccess) return;

        // Check if this is being validated
        const parent = node.parent;

        // Case: const data = schema.parse(event.body) - this is OK
        if (
          parent?.type === AST_NODE_TYPES.CallExpression &&
          isValidationCall(parent)
        ) {
          return;
        }

        // Case: Direct use without validation - DANGER
        // Check common safe patterns

        // Safe: typeof event.body === 'string'
        if (
          parent?.type === AST_NODE_TYPES.UnaryExpression &&
          parent.operator === 'typeof'
        ) {
          return;
        }

        // Safe: if (event.body) - null check
        if (
          parent?.type === AST_NODE_TYPES.IfStatement ||
          parent?.type === AST_NODE_TYPES.ConditionalExpression
        ) {
          return;
        }

        // Safe: event.body?.prop - optional chain check
        // If this node is event.body, and the parent is a MemberExpression with optional chaining
        if (node.optional) {
          return;
        }

        // Check if parent is using optional chaining on this node
        // e.g., event.body?.name - the event.body node's parent is optional
        if (
          parent?.type === AST_NODE_TYPES.MemberExpression &&
          parent.optional
        ) {
          return;
        }

        // Also check ChainExpression wrapping
        if (parent?.type === AST_NODE_TYPES.ChainExpression) {
          return;
        }

        // Safe: Logging event input (detected by property access in console.log argument)
        if (
          parent?.type === AST_NODE_TYPES.CallExpression &&
          parent.callee.type === AST_NODE_TYPES.MemberExpression &&
          parent.callee.object.type === AST_NODE_TYPES.Identifier &&
          parent.callee.object.name === 'console'
        ) {
          return;
        }

        context.report({
          node,
          messageId: 'unvalidatedInput',
          data: {
            property: `event.${eventAccess.property}`,
          },
          suggest: [
            {
              messageId: 'useValidation',
              fix: () => null, // Complex fix requiring schema setup
            },
          ],
        });
      },
    };
  },
});
