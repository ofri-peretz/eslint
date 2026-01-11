/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-secrets-in-env
 * Detects secrets directly assigned to process.env or hardcoded in environment configurations
 * CWE-798: Use of Hard-coded Credentials
 *
 * @see https://cwe.mitre.org/data/definitions/798.html
 * @see https://docs.aws.amazon.com/secretsmanager/latest/userguide/intro.html
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { AST_NODE_TYPES, createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'secretsInEnv' | 'useSecretsManager';

export interface Options {
  /** Allow in test files. Default: true */
  allowInTests?: boolean;
  /** Additional secret patterns to detect. Default: [] */
  additionalPatterns?: string[];
}

type RuleOptions = [Options?];

// Patterns that indicate secrets
const SECRET_PATTERNS = [
  /password/i,
  /secret/i,
  /api[_-]?key/i,
  /api[_-]?token/i,
  /auth[_-]?token/i,
  /access[_-]?token/i,
  /private[_-]?key/i,
  /encryption[_-]?key/i,
  /db[_-]?pass/i,
  /database[_-]?password/i,
  /jwt[_-]?secret/i,
  /signing[_-]?key/i,
  /client[_-]?secret/i,
  /aws[_-]?secret/i,
];

export const noSecretsInEnv = createRule<RuleOptions, MessageIds>({
  name: 'no-secrets-in-env',
  meta: {
    type: 'problem',
    docs: {
      description: 'Detects secrets directly assigned to environment variables',
    },
    hasSuggestions: true,
    messages: {
      secretsInEnv: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Secret in Environment Variable',
        cwe: 'CWE-798',
        description: 'Secret "{{varName}}" should not be hardcoded in environment variables',
        severity: 'CRITICAL',
        fix: 'Use AWS Secrets Manager: const secret = await secretsClient.send(new GetSecretValueCommand({ SecretId: "{{varName}}" }))',
        documentationLink: 'https://docs.aws.amazon.com/secretsmanager/latest/userguide/intro.html',
      }),
      useSecretsManager: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Secrets Manager',
        description: 'Store secrets in AWS Secrets Manager instead of env vars',
        severity: 'LOW',
        fix: 'import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager"',
        documentationLink: 'https://docs.aws.amazon.com/secretsmanager/latest/userguide/intro.html',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: { type: 'boolean', default: true },
          additionalPatterns: { type: 'array', items: { type: 'string' }, default: [] },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ allowInTests: true, additionalPatterns: [] }],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>, [options = {}]) {
    const { allowInTests = true, additionalPatterns = [] } = options as Options;
    const filename = context.filename || context.getFilename();
    const isTestFile = /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);

    if (allowInTests && isTestFile) {
      return {};
    }

    // Compile additional patterns
    const allPatterns = [
      ...SECRET_PATTERNS,
      ...additionalPatterns.map(p => new RegExp(p, 'i')),
    ];

    /**
     * Check if a variable name looks like a secret
     */
    function isSecretName(name: string): boolean {
      return allPatterns.some(pattern => pattern.test(name));
    }

    /**
     * Check if a value looks like it contains a secret (not just a reference)
     */
    function isHardcodedSecretValue(node: TSESTree.Node): boolean {
      // Literal strings with reasonable length could be secrets
      if (node.type === AST_NODE_TYPES.Literal && typeof node.value === 'string') {
        return node.value.length > 5;
      }
      // Template literals with string parts
      if (node.type === AST_NODE_TYPES.TemplateLiteral) {
        return node.quasis.some(quasi => quasi.value.raw.length > 5);
      }
      return false;
    }

    return {
      // Detect process.env.SECRET_KEY = 'value'
      AssignmentExpression(node: TSESTree.AssignmentExpression) {
        if (
          node.left.type === AST_NODE_TYPES.MemberExpression &&
          node.left.object.type === AST_NODE_TYPES.MemberExpression &&
          node.left.object.object.type === AST_NODE_TYPES.Identifier &&
          node.left.object.object.name === 'process' &&
          node.left.object.property.type === AST_NODE_TYPES.Identifier &&
          node.left.object.property.name === 'env'
        ) {
          let envVarName = '';
          if (node.left.property.type === AST_NODE_TYPES.Identifier) {
            envVarName = node.left.property.name;
          } else if (node.left.property.type === AST_NODE_TYPES.Literal && typeof node.left.property.value === 'string') {
            envVarName = node.left.property.value;
          }

          if (isSecretName(envVarName) && isHardcodedSecretValue(node.right)) {
            context.report({
              node,
              messageId: 'secretsInEnv',
              data: { varName: envVarName },
              suggest: [{ messageId: 'useSecretsManager', fix: () => null }],
            });
          }
        }
      },

      // Detect { DB_PASSWORD: 'value' } in environment config objects
      Property(node: TSESTree.Property) {
        let propName = '';
        if (node.key.type === AST_NODE_TYPES.Identifier) {
          propName = node.key.name;
        } else if (node.key.type === AST_NODE_TYPES.Literal && typeof node.key.value === 'string') {
          propName = node.key.value;
        }

        if (isSecretName(propName) && isHardcodedSecretValue(node.value)) {
          // Check if this is in an environment/config context
          let parent: TSESTree.Node | undefined = node.parent;
          while (parent) {
            if (parent.type === AST_NODE_TYPES.ObjectExpression) {
              parent = parent.parent;
              continue;
            }
            if (
              parent.type === AST_NODE_TYPES.VariableDeclarator &&
              parent.id.type === AST_NODE_TYPES.Identifier &&
              /env|config|settings/i.test(parent.id.name)
            ) {
              context.report({
                node,
                messageId: 'secretsInEnv',
                data: { varName: propName },
                suggest: [{ messageId: 'useSecretsManager', fix: () => null }],
              });
              break;
            }
            break;
          }
        }
      },
    };
  },
});
