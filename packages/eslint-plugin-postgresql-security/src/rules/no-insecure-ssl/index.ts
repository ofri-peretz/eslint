/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

import { TSESLint, AST_NODE_TYPES, TSESTree, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { NoInsecureSslOptions } from '../../types';
import { fileUsesPostgres } from '../../utils';

export const noInsecureSsl: TSESLint.RuleModule<
  'noInsecureSsl',
  NoInsecureSslOptions
> = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent the use of insecure SSL configurations (rejectUnauthorized: false).',
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-postgresql-security/docs/rules/no-insecure-ssl.md',
      cwe: 'CWE-319',
      cvss: 7.5,
    },
    messages: {
      noInsecureSsl: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Insecure SSL',
        description: 'Insecure SSL configuration detected (rejectUnauthorized: false).',
        severity: 'HIGH',
        cwe: 'CWE-319',
        owasp: 'A05:2021',
        compliance: ['SOC2', 'PCI-DSS', 'HIPAA', 'GDPR'],
        effort: 'low',
        fix: 'Set "rejectUnauthorized: true" or use a valid CA bundle. Do not disable SSL verification in production.',
        documentationLink: 'https://node-postgres.com/features/ssl',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    // Every rule here is PostgreSQL-specific, and none of them knew it: over
    // 108,838 files, 94% of this plugin's findings were in files with no
    // PostgreSQL client at all. Registering no visitors is both the gate and
    // the cheap path — a file with no database in it does no work.
    if (!fileUsesPostgres(context.sourceCode.ast)) return {};

    return {
      NewExpression(node) {
        if (node.callee.type !== AST_NODE_TYPES.Identifier || (node.callee.name !== 'Client' && node.callee.name !== 'Pool')) {
          return;
        }

        const configArg = node.arguments[0];
        if (!configArg || configArg.type !== AST_NODE_TYPES.ObjectExpression) {
          return;
        }

        const sslProp = configArg.properties.find(
          (prop): prop is TSESTree.Property =>
            prop.type === AST_NODE_TYPES.Property && prop.key.type === AST_NODE_TYPES.Identifier && prop.key.name === 'ssl'
        );

        if (!sslProp) return;

        // ssl: { rejectUnauthorized: false }
        if (sslProp.value.type === AST_NODE_TYPES.ObjectExpression) {
          const rejectUnauthorized = sslProp.value.properties.find(
            (prop): prop is TSESTree.Property =>
              prop.type === AST_NODE_TYPES.Property &&
              prop.key.type === AST_NODE_TYPES.Identifier &&
              prop.key.name === 'rejectUnauthorized'
          );

          if (
            rejectUnauthorized &&
            rejectUnauthorized.value.type === AST_NODE_TYPES.Literal &&
            rejectUnauthorized.value.value === false
          ) {
            context.report({
              node: rejectUnauthorized,
              messageId: 'noInsecureSsl',
            });
          }
        }
      },
    };
  },
};
