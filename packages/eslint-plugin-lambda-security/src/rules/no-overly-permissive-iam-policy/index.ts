/**
 * ESLint Rule: no-overly-permissive-iam-policy
 * Detects IAM policies with overly broad permissions
 * CWE-732: Incorrect Permission Assignment for Critical Resource
 *
 * @see https://cwe.mitre.org/data/definitions/732.html
 * @see https://owasp.org/www-project-serverless-top-10/
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';

type MessageIds = 'permissivePolicy' | 'useLeastPrivilege';

export interface Options {
  /** Allow in test files. Default: true */
  allowInTests?: boolean;
}

type RuleOptions = [Options?];

// IAM policy property names
const POLICY_PROPERTIES = ['Resource', 'Action', 'Principal'];

// Wildcards that indicate overly permissive
const DANGEROUS_WILDCARDS = ['*', 'arn:aws:*', 'arn:*:*:*:*:*'];

export const noOverlyPermissiveIamPolicy = createRule<RuleOptions, MessageIds>({
  name: 'no-overly-permissive-iam-policy',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Detects IAM policies with overly broad permissions (wildcards)',
    },
    hasSuggestions: true,
    messages: {
      permissivePolicy: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Overly Permissive IAM Policy',
        cwe: 'CWE-732',
        owasp: 'SAS-5',
        cvss: 6.5,
        description:
          'IAM policy has wildcard {{property}}: "{{value}}". Violates principle of least privilege.',
        severity: 'HIGH',
        fix: 'Restrict {{property}} to specific resources/actions. Example: "arn:aws:s3:::my-bucket/*" instead of "*"',
        documentationLink:
          'https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html#grant-least-privilege',
      }),
      useLeastPrivilege: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Apply Least Privilege',
        description: 'Restrict permissions to specific resources and actions',
        severity: 'LOW',
        fix: 'Replace "*" with specific ARNs and action names',
        documentationLink:
          'https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html',
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
    const { allowInTests = true } = options as Options;
    const filename = context.filename || context.getFilename();
    const isTestFile = /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);

    if (allowInTests && isTestFile) {
      return {};
    }

    /**
     * Check if a value is a dangerous wildcard
     */
    function isDangerousWildcard(value: string): boolean {
      return (
        DANGEROUS_WILDCARDS.includes(value) ||
        (value.endsWith('*') && value.includes(':*:'))
      );
    }

    /**
     * Check property values for wildcards
     */
    function checkPolicyProperty(
      node: TSESTree.Property,
      propertyName: string,
    ): void {
      const value = node.value;

      // Check literal string
      if (value.type === AST_NODE_TYPES.Literal && typeof value.value === 'string') {
        if (isDangerousWildcard(value.value)) {
          context.report({
            node,
            messageId: 'permissivePolicy',
            data: {
              property: propertyName,
              value: value.value,
            },
            suggest: [
              {
                messageId: 'useLeastPrivilege',
                fix: () => null,
              },
            ],
          });
        }
      }

      // Check array of values
      if (value.type === AST_NODE_TYPES.ArrayExpression) {
        for (const element of value.elements) {
          if (
            element?.type === AST_NODE_TYPES.Literal &&
            typeof element.value === 'string'
          ) {
            if (isDangerousWildcard(element.value)) {
              context.report({
                node: element,
                messageId: 'permissivePolicy',
                data: {
                  property: propertyName,
                  value: element.value,
                },
                suggest: [
                  {
                    messageId: 'useLeastPrivilege',
                    fix: () => null,
                  },
                ],
              });
            }
          }
        }
      }
    }

    return {
      Property(node: TSESTree.Property) {
        // Check for IAM policy properties
        if (node.key.type === AST_NODE_TYPES.Identifier) {
          const keyName = node.key.name;
          if (POLICY_PROPERTIES.includes(keyName)) {
            checkPolicyProperty(node, keyName);
          }
        }

        // Also check string key properties
        if (
          node.key.type === AST_NODE_TYPES.Literal &&
          typeof node.key.value === 'string'
        ) {
          const keyName = node.key.value;
          if (POLICY_PROPERTIES.includes(keyName)) {
            checkPolicyProperty(node, keyName);
          }
        }
      },
    };
  },
});
