import { TSESLint, AST_NODE_TYPES, TSESTree, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { NoInsecureSslOptions } from '../../types';

export const noInsecureSsl: TSESLint.RuleModule<
  'noInsecureSsl',
  NoInsecureSslOptions
> = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent the use of insecure SSL configurations (rejectUnauthorized: false).',
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-pg/docs/rules/no-insecure-ssl.md',
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
