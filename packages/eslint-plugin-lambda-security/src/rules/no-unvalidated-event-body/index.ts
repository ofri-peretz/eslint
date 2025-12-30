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
const VALIDATION_INDICATORS = [
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
];

export const noUnvalidatedEventBody = createRule<RuleOptions, MessageIds>({
  name: 'no-unvalidated-event-body',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Detects Lambda handlers using event body/params without validation',
    },
    hasSuggestions: true,
    messages: {
      unvalidatedInput: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Unvalidated Event Input',
        cwe: 'CWE-20',
        owasp: 'SAS-1',
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
    const filename = context.filename || context.getFilename();
    const isTestFile = /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);

    if (allowInTests && isTestFile) {
      return {};
    }

    const dangerousProperties = [
      ...DANGEROUS_EVENT_PROPERTIES,
      ...additionalProperties,
    ];

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
            VALIDATION_INDICATORS.includes(property.name)
          ) {
            return true;
          }
        }
        // Check for direct function calls like validate(x)
        if (node.callee.type === AST_NODE_TYPES.Identifier) {
          if (VALIDATION_INDICATORS.includes(node.callee.name)) {
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
        dangerousProperties.includes(node.property.name)
      ) {
        return {
          eventName: node.object.name,
          property: node.property.name,
        };
      }
      return null;
    }

    /**
     * Check if JSON.parse is being called on event property
     */
    function isJsonParseOfEventBody(node: TSESTree.CallExpression): boolean {
      if (
        node.callee.type === AST_NODE_TYPES.MemberExpression &&
        node.callee.object.type === AST_NODE_TYPES.Identifier &&
        node.callee.object.name === 'JSON' &&
        node.callee.property.type === AST_NODE_TYPES.Identifier &&
        node.callee.property.name === 'parse' &&
        node.arguments.length > 0
      ) {
        const arg = node.arguments[0];
        if (arg.type === AST_NODE_TYPES.MemberExpression) {
          return isEventPropertyAccess(arg) !== null;
        }
      }
      return false;
    }

    return {
      // Track arrow function/function parameters named 'event'
      'ArrowFunctionExpression, FunctionExpression, FunctionDeclaration'(
        node: TSESTree.ArrowFunctionExpression | TSESTree.FunctionExpression | TSESTree.FunctionDeclaration,
      ) {
        for (const param of node.params) {
          if (param.type === AST_NODE_TYPES.Identifier) {
            // Common Lambda handler parameter names
            if (['event', 'evt', 'e', 'request', 'req'].includes(param.name)) {
              eventParameters.add(param.name);
            }
          }
        }
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

        // Case: const body = JSON.parse(event.body); schema.parse(body); - track this
        if (
          parent?.type === AST_NODE_TYPES.CallExpression &&
          isJsonParseOfEventBody(parent)
        ) {
          // We need to check if this variable is later validated
          // For now, flag it as potentially dangerous
          // A more sophisticated analysis would track variable flow
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
