/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

import { TSESLint, AST_NODE_TYPES, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { NoHardcodedCredentialsOptions } from '../../types';
import { PG_PROTOCOLS } from '../../constants';

export const noHardcodedCredentials: TSESLint.RuleModule<
  'noHardcodedCredentials',
  NoHardcodedCredentialsOptions
> = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Detect hardcoded credentials in pg Client or Pool initialization.',
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-pg/docs/rules/no-hardcoded-credentials.md',
    },
    messages: {
      noHardcodedCredentials: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Hardcoded Credentials',
        description: 'Hardcoded credentials detected in database connection.',
        severity: 'CRITICAL',
        cwe: 'CWE-798',
        owasp: 'A07:2021',
        compliance: ['SOC2', 'PCI-DSS', 'ISO27001', 'NIST-CSF'],
        effort: 'low',
        fix: 'Use environment variables (process.env.DB_PASSWORD) instead of hardcoding secrets.',
        documentationLink: 'https://owasp.org/www-community/vulnerabilities/Use_of_hard-coded_password',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    return {
      NewExpression(node) {
        if (node.callee.type !== AST_NODE_TYPES.Identifier || !['Client', 'Pool'].includes(node.callee.name)) {
          return;
        }

        if (node.arguments.length === 0) return;
        const configArg = node.arguments[0];

        // Case 1: Connection string literal 'postgres://user:pass@localhost:5432/db'
        if (configArg.type === AST_NODE_TYPES.Literal && typeof configArg.value === 'string') {
          if (PG_PROTOCOLS.some(protocol => (configArg.value as string).includes(protocol))) {
            context.report({
              node: configArg,
              messageId: 'noHardcodedCredentials',
            });
            return; // Return after reporting for Case 1
          }
        }

        // Case 2: new Client({ password: 'secret', connectionString: '...' })
        if (configArg.type === AST_NODE_TYPES.ObjectExpression) {
          for (const prop of configArg.properties) {
            if (prop.type !== AST_NODE_TYPES.Property || prop.key.type !== AST_NODE_TYPES.Identifier) {
              continue;
            }

            // Check for 'password' field
            if (prop.key.name === 'password') {
              if (prop.value.type === AST_NODE_TYPES.Literal) {
                 context.report({
                  node: prop.value,
                  messageId: 'noHardcodedCredentials',
                });
              }
              continue;
            }

            // Check for 'connectionString' field
            if (prop.key.name === 'connectionString') {
               if (prop.value.type === AST_NODE_TYPES.Literal) {
                 context.report({
                  node: prop.value,
                  messageId: 'noHardcodedCredentials',
                });
              }
            }
          }
        }
      },
    };
  },
};
