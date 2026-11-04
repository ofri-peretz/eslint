/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-overly-permissive-iam-policy
 * Detects IAM policies with overly broad permissions
 * CWE-732: Incorrect Permission Assignment for Critical Resource
 *
 * @see https://cwe.mitre.org/data/definitions/732.html
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
  objectKeyName,
  staticString,
} from '@interlace/eslint-devkit';

/**
 * @vocabulary `Effect`, `Action`, `Resource` and `*` are the IAM policy
 * grammar AWS publishes. A policy that spells them differently is not a
 * policy.
 *
 * @see https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements.html
 */
type MessageIds = 'permissivePolicy';

export interface Options {
  /** Allow in test files. Default: true */
  allowInTests?: boolean;
}

type RuleOptions = [Options?];

// IAM policy property names
const POLICY_PROPERTIES = new Set(['Resource', 'Action', 'Principal']);

// Wildcards that indicate overly permissive
const DANGEROUS_WILDCARDS = new Set(['*', 'arn:aws:*', 'arn:*:*:*:*:*']);

export const noOverlyPermissiveIamPolicy = createRule<RuleOptions, MessageIds>({
  name: 'no-overly-permissive-iam-policy',
  meta: {
    interop: { runtimes: ['eslint', 'oxlint'] },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-lambda-security/docs/rules/no-overly-permissive-iam-policy.md',
      description:
        'Detects IAM policies with overly broad permissions (wildcards)',
      cwe: 'CWE-732',
      cvss: 6.5,
    },
    messages: {
      permissivePolicy: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Overly Permissive IAM Policy',
        cwe: 'CWE-732',
        cvss: 6.5,
        description:
          'IAM policy has wildcard {{property}}: "{{value}}". Violates principle of least privilege.',
        severity: 'HIGH',
        fix: 'Restrict {{property}} to specific resources/actions. Example: "arn:aws:s3:::my-bucket/*" instead of "*"',
        documentationLink:
          'https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html#grant-least-privilege',
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
     * Check if a value is a dangerous wildcard
     */
    function isDangerousWildcard(value: string): boolean {
      return (
        DANGEROUS_WILDCARDS.has(value) ||
        (value.endsWith('*') && value.includes(':*:'))
      );
    }

    /** Report each dangerous wildcard among a value's literal strings. */
    function checkWildcards(
      value: TSESTree.Node,
      report: TSESTree.Node,
      propertyName: string,
    ): void {
      const staticText = staticString(value);
      if (staticText !== null && isDangerousWildcard(staticText)) {
        context.report({
          node: report,
          messageId: 'permissivePolicy',
          data: { property: propertyName, value: staticText },
        });
      }
      if (value.type === AST_NODE_TYPES.ArrayExpression) {
        for (const element of value.elements) {
          if (element) checkWildcards(element, element, propertyName);
        }
      }
    }

    /**
     * Whether the statement holding this property denies rather than allows.
     * `{ Effect: 'Deny', Resource: '*' }` grants nothing — it is the standard
     * "deny everything" policy a Lambda authorizer returns.
     */
    function inDenyStatement(node: TSESTree.Property): boolean {
      const statement = node.parent as TSESTree.ObjectExpression;
      // A repeated key keeps its last value, as in the object IAM receives.
      const effects = statement.properties.filter(
        (p): p is TSESTree.Property =>
          p.type === AST_NODE_TYPES.Property && objectKeyName(p) === 'Effect',
      );
      return staticString(effects.at(-1)?.value) === 'Deny';
    }

    /**
     * Check property values for wildcards
     */
    function checkPolicyProperty(
      node: TSESTree.Property,
      propertyName: string,
    ): void {
      if (inDenyStatement(node)) return;
      checkWildcards(node.value, node, propertyName);
      // `Principal: { AWS: '*' }` is everyone, as `Principal: '*'` is.
      if (
        propertyName === 'Principal' &&
        node.value.type === AST_NODE_TYPES.ObjectExpression
      ) {
        for (const p of node.value.properties) {
          if (p.type === AST_NODE_TYPES.Property) {
            checkWildcards(p.value, p, propertyName);
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
      Property(node: TSESTree.Property) {
        // `Resource`, `'Resource'` and `['Resource']` are the same element.
        const keyName = objectKeyName(node);
        if (keyName !== null && POLICY_PROPERTIES.has(keyName)) {
          checkPolicyProperty(node, keyName);
        }
      },
    };
  },
});
