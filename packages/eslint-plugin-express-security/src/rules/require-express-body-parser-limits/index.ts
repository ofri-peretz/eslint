/**
 * ESLint Rule: require-express-body-parser-limits
 * Detects Express.js body parsers missing or with excessive size limits
 * CWE-400: Uncontrolled Resource Consumption
 *
 * CVE-2024-45590 highlights DoS vulnerabilities in body-parser.
 * Without size limits, attackers can exhaust server memory.
 *
 * @see https://cwe.mitre.org/data/definitions/400.html
 * @see https://expressjs.com/en/4x/api.html#express.json
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  formatLLMMessage,
  MessageIcons,
  createRule,
} from '@interlace/eslint-devkit';

type MessageIds = 'missingLimit' | 'excessiveLimit' | 'addLimit';

export interface Options {
  /** Allow in test files. Default: false */
  allowInTests?: boolean;
  /** Maximum allowed limit in bytes. Default: 102400 (100kb) */
  maxLimit?: number;
  /** Limits that are considered excessive (as strings). Default: ['50mb', '100mb', '500mb', '1gb'] */
  excessiveLimits?: string[];
}

type RuleOptions = [Options?];

const DEFAULT_EXCESSIVE_LIMITS = [
  '10mb',
  '50mb',
  '100mb',
  '500mb',
  '1gb',
  '1GB',
  '10MB',
  '50MB',
  '100MB',
  '500MB',
];

/**
 * Body parser function names to check
 */
const BODY_PARSER_METHODS = ['json', 'urlencoded', 'raw', 'text'];

/**
 * Check if a property has a limit option
 */
function getLimitOption(
  properties: TSESTree.ObjectLiteralElement[]
): TSESTree.Property | null {
  for (const prop of properties) {
    if (
      prop.type === 'Property' &&
      prop.key.type === 'Identifier' &&
      prop.key.name === 'limit'
    ) {
      return prop;
    }
  }
  return null;
}

/**
 * Check if the limit value is considered excessive
 */
function isExcessiveLimit(
  value: TSESTree.Node,
  excessiveLimits: string[]
): boolean {
  if (value.type === 'Literal' && typeof value.value === 'string') {
    return excessiveLimits.some(
      (limit) => value.value === limit || String(value.value).toLowerCase() === limit.toLowerCase()
    );
  }
  return false;
}

export const requireExpressBodyParserLimits = createRule<RuleOptions, MessageIds>({
  name: 'require-express-body-parser-limits',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Require size limits on Express.js body parsers to prevent DoS attacks',
    },
    hasSuggestions: true,
    messages: {
      missingLimit: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Missing Body Parser Limit',
        cwe: 'CWE-400',
        description:
          'Body parser used without explicit size limit. Attackers can exhaust server memory with large payloads. CVE-2024-45590.',
        severity: 'HIGH',
        fix: "Add a size limit: express.json({ limit: '10kb' }) or express.json({ limit: '100kb' })",
        documentationLink: 'https://expressjs.com/en/4x/api.html#express.json',
      }),
      excessiveLimit: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Excessive Body Parser Limit',
        cwe: 'CWE-400',
        description:
          'Body parser limit is excessively high, making the application vulnerable to DoS attacks via large payloads.',
        severity: 'MEDIUM',
        fix: "Reduce the limit to a reasonable size: '100kb' for JSON APIs, '1mb' for file uploads with proper handling",
        documentationLink: 'https://expressjs.com/en/4x/api.html#express.json',
      }),
      addLimit: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Add Size Limit',
        description: 'Add a size limit to the body parser',
        severity: 'LOW',
        fix: "Add limit: '100kb' or appropriate size for your use case",
        documentationLink: 'https://expressjs.com/en/4x/api.html#express.json',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: {
            type: 'boolean',
            default: false,
            description: 'Allow in test files',
          },
          maxLimit: {
            type: 'number',
            default: 102400,
            description: 'Maximum allowed limit in bytes',
          },
          excessiveLimits: {
            type: 'array',
            items: { type: 'string' },
            default: DEFAULT_EXCESSIVE_LIMITS,
            description: 'Limits considered excessive',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      allowInTests: false,
      maxLimit: 102400,
      excessiveLimits: DEFAULT_EXCESSIVE_LIMITS,
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>, [options = {}]) {
    const {
      allowInTests = false,
      excessiveLimits = DEFAULT_EXCESSIVE_LIMITS,
    } = options as Options;

    const filename = context.filename;
    const isTestFile =
      allowInTests && /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);

    if (isTestFile) {
      return {};
    }

    return {
      CallExpression(node: TSESTree.CallExpression) {
        const callee = node.callee;

        // Check for express.json(), express.urlencoded(), etc.
        // or bodyParser.json(), bodyParser.urlencoded(), etc.
        if (callee.type !== 'MemberExpression') {
          return;
        }

        const object = callee.object;
        const property = callee.property;

        // Check if it's express.* or bodyParser.*
        /* c8 ignore next 2 */
        if (object.type !== 'Identifier') {
          return;
        }

        if (object.name !== 'express' && object.name !== 'bodyParser') {
          return;
        }

        /* c8 ignore next 2 */
        if (property.type !== 'Identifier') {
          return;
        }

        if (!BODY_PARSER_METHODS.includes(property.name)) {
          return;
        }

        // Check arguments
        const firstArg = node.arguments[0];

        // No options provided - missing limit
        if (!firstArg) {
          const sourceCode = context.sourceCode;
          const calleeText = sourceCode.getText(callee);
          
          context.report({
            node,
            messageId: 'missingLimit',
            suggest: [
              {
                messageId: 'addLimit',
                fix: (fixer) => {
                  // Replace the entire call with options
                  return fixer.replaceText(
                    node,
                    `${calleeText}({ limit: '100kb' })`
                  );
                },
              },
            ],
          });
          return;
        }

        // Options provided but check for limit
        if (firstArg.type === 'ObjectExpression') {
          const limitProp = getLimitOption(firstArg.properties);

          if (!limitProp) {
            // No limit in options
            context.report({
              node,
              messageId: 'missingLimit',
              suggest: [
                {
                  messageId: 'addLimit',
                  fix: (fixer) => {
                    // Add limit to existing options
                    const lastProp =
                      firstArg.properties[firstArg.properties.length - 1];
                    if (lastProp) {
                      return fixer.insertTextAfter(
                        lastProp,
                        ", limit: '100kb'"
                      );
                    }
                    /* c8 ignore next */
                    return null;
                  },
                },
              ],
            });
            return;
          }

          // Check if limit is excessive
          if (isExcessiveLimit(limitProp.value, excessiveLimits)) {
            context.report({
              node: limitProp,
              messageId: 'excessiveLimit',
            });
          }
        }
      },
    };
  },
});
