/**
 * ESLint Rule: no-graphql-introspection-production
 * Detects GraphQL servers with introspection enabled in production
 * CWE-200: Exposure of Sensitive Information to an Unauthorized Actor
 *
 * @see https://cwe.mitre.org/data/definitions/200.html
 * @see https://cheatsheetseries.owasp.org/cheatsheets/GraphQL_Cheat_Sheet.html
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  formatLLMMessage,
  MessageIcons,
  createRule,
} from '@interlace/eslint-devkit';

type MessageIds = 'graphqlIntrospection' | 'disableIntrospection';

export interface Options {
  /** Allow introspection in test files. Default: true */
  allowInTests?: boolean;

  /** Allow introspection in development. Default: true */
  allowInDevelopment?: boolean;
}

type RuleOptions = [Options?];

/**
 * Check if introspection is explicitly enabled
 */
function hasIntrospectionEnabled(
  node: TSESTree.ObjectExpression,
  sourceCode: TSESLint.SourceCode
): boolean {
  const text = sourceCode.getText(node);
  
  // Check for introspection: true
  if (/\bintrospection\s*:\s*true\b/.test(text)) {
    return true;
  }

  // Check for no introspection setting (defaults to true in many libraries)
  // We only flag explicit true or missing with warning
  return false;
}

/**
 * Check if there's a production guard for introspection
 */
function hasProductionGuard(
  node: TSESTree.ObjectExpression,
  sourceCode: TSESLint.SourceCode
): boolean {
  const text = sourceCode.getText(node);
  
  // Check for common production guards
  const productionGuards = [
    /introspection\s*:\s*process\.env\.NODE_ENV\s*[!=]==?\s*['"]production['"]/,
    /introspection\s*:\s*!?\s*isProd/,
    /introspection\s*:\s*!?\s*isProduction/,
    /introspection\s*:\s*process\.env\.NODE_ENV\s*[!=]==?\s*['"]development['"]/,
  ];

  return productionGuards.some((guard) => guard.test(text));
}

export const noGraphqlIntrospectionProduction = createRule<RuleOptions, MessageIds>({
  name: 'no-graphql-introspection-production',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow GraphQL introspection in production environments',
    },
    hasSuggestions: true,
    messages: {
      graphqlIntrospection: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'GraphQL Introspection Enabled',
        cwe: 'CWE-200',
        description:
          'GraphQL introspection is enabled. In production, this exposes your entire API schema to attackers.',
        severity: 'MEDIUM',
        fix: "Set introspection: process.env.NODE_ENV !== 'production' or introspection: false",
        documentationLink:
          'https://cheatsheetseries.owasp.org/cheatsheets/GraphQL_Cheat_Sheet.html#introspection-graphiql',
      }),
      disableIntrospection: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Disable Introspection in Production',
        description: 'Disable GraphQL introspection for production',
        severity: 'LOW',
        fix: "introspection: process.env.NODE_ENV !== 'production'",
        documentationLink:
          'https://www.apollographql.com/docs/apollo-server/api/apollo-server/#introspection',
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
          allowInDevelopment: {
            type: 'boolean',
            default: true,
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      allowInTests: true,
      allowInDevelopment: true,
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>, [options = {}]) {
    const { allowInTests = true } = options as Options;

    const filename = context.filename;
    const isTestFile =
      allowInTests && /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);

    if (isTestFile) {
      return {};
    }

    const sourceCode = context.sourceCode;

    return {
      CallExpression(node: TSESTree.CallExpression) {
        const callee = node.callee;

        // Check for Apollo Server, Express-GraphQL, or similar
        const isGraphQLServer =
          (callee.type === 'Identifier' &&
            ['ApolloServer', 'GraphQLServer', 'createServer'].includes(
              callee.name
            )) ||
          (callee.type === 'NewExpression' &&
            callee.callee.type === 'Identifier' &&
            ['ApolloServer', 'GraphQLServer'].includes(callee.callee.name));

        // Also check for graphqlHTTP (express-graphql)
        const isExpressGraphQL =
          callee.type === 'Identifier' && callee.name === 'graphqlHTTP';

        if (!isGraphQLServer && !isExpressGraphQL) {
          return;
        }

        // Get the options/config argument
        const configArg = node.arguments[0];
        /* c8 ignore next 2 */
        if (!configArg || configArg.type !== 'ObjectExpression') {
          return;
        }

        // Check if there's a production guard
        /* c8 ignore next 2 */
        if (hasProductionGuard(configArg, sourceCode)) {
          return;
        }

        // Check if introspection is explicitly enabled
        if (hasIntrospectionEnabled(configArg, sourceCode)) {
          context.report({
            node: configArg,
            messageId: 'graphqlIntrospection',
            suggest: [
              {
                messageId: 'disableIntrospection',
                fix: () => null,
              },
            ],
          });
        }
      },

      // Also check NewExpression for new ApolloServer({...})
      NewExpression(node: TSESTree.NewExpression) {
        const callee = node.callee;

        /* c8 ignore next 2 */
        if (
          callee.type !== 'Identifier' ||
          !['ApolloServer', 'GraphQLServer'].includes(callee.name)
        ) {
          return;
        }

        const configArg = node.arguments[0];
        /* c8 ignore next 2 */
        if (!configArg || configArg.type !== 'ObjectExpression') {
          return;
        }

        if (hasProductionGuard(configArg, sourceCode)) {
          return;
        }

        if (hasIntrospectionEnabled(configArg, sourceCode)) {
          context.report({
            node: configArg,
            messageId: 'graphqlIntrospection',
            suggest: [
              {
                messageId: 'disableIntrospection',
                fix: () => null,
              },
            ],
          });
        }
      },
    };
  },
});
