/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-graphql-introspection-production
 * Detects GraphQL servers with introspection enabled in production
 * CWE-200: Exposure of Sensitive Information to an Unauthorized Actor
 *
 * @see https://cwe.mitre.org/data/definitions/200.html
 * @see https://cheatsheetseries.owasp.org/cheatsheets/GraphQL_Cheat_Sheet.html
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { fileUsesExpress } from '../../utils/express-evidence';
import {
  isPackageCallee,
  packageBindings,
  type PackageBindings,
} from '../../utils/import-bindings';
import { environmentOf, inDevelopmentBranch } from '../../utils/environment';
import {
  formatLLMMessage,
  MessageIcons,
  createRule,
  isTestFilePath,
  objectKeyName,
} from '@interlace/eslint-devkit';

type MessageIds = 'graphqlIntrospection';

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
/** Apollo packages whose `ApolloServer` export the rule recognises. */
const APOLLO_PACKAGES = [
  'apollo-server-express',
  'apollo-server',
  '@apollo/server',
  'apollo-server-core',
];

/**
 * Apollo's Express integration. A file importing it builds a GraphQL server
 * for an Express app — the docs' own example imports nothing else.
 */
const APOLLO_EXPRESS_PACKAGES = ['apollo-server-express'];

const SERVER_NAMES = new Set(['ApolloServer', 'GraphQLServer']);

/** Does this `introspection:` value leave introspection on in production? */
function enabledInProduction(value: TSESTree.Node): boolean {
  if (value.type === 'Literal') return value.value === true;
  return environmentOf(value) === 'prod';
}

/** The top-level `introspection:` value of a config object. */
function introspectionValue(
  config: TSESTree.ObjectExpression,
): TSESTree.Node | null {
  for (const prop of config.properties) {
    if (prop.type === 'Property' && objectKeyName(prop) === 'introspection') {
      return prop.value;
    }
  }
  return null;
}

export const noGraphqlIntrospectionProduction = createRule<
  RuleOptions,
  MessageIds
>({
  name: 'no-graphql-introspection-production',
  meta: {
    interop: { runtimes: ['eslint', 'oxlint'] },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-express-security/docs/rules/no-graphql-introspection-production.md',
      description: 'Disallow GraphQL introspection in production environments',
      cwe: 'CWE-200',
      cvss: 5.3,
    },
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
            description:
              'Allow introspection when the code is guarded by a development check',
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
  createOnce(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    currentOptions,
  ) {
    let allowInDevelopment: boolean;
    let apollo: PackageBindings;

    const isServerCallee = (callee: TSESTree.Node): boolean =>
      (callee.type === 'Identifier' && SERVER_NAMES.has(callee.name)) ||
      isPackageCallee(callee, apollo, 'ApolloServer');

    function check(config: TSESTree.Node | undefined, site: TSESTree.Node) {
      if (!config || config.type !== 'ObjectExpression') return;
      const value = introspectionValue(config);
      if (!value || !enabledInProduction(value)) return;
      if (allowInDevelopment && inDevelopmentBranch(site)) return;
      context.report({ node: config, messageId: 'graphqlIntrospection' });
    }

    return {
      before() {
        const [options] = currentOptions();
        const ast = context.sourceCode.ast;
        apollo = packageBindings(ast, APOLLO_PACKAGES);
        // Every rule here is Express-specific, and none of them knew it: over
        // 107,382 files, 75% of this plugin's findings were in files with no
        // Express import. Registering no visitors is both the gate and the cheap
        // path — a file with no Express in it does no work. Apollo's Express
        // integration counts: it exists to serve GraphQL from an Express app.
        const apolloExpress = packageBindings(ast, APOLLO_EXPRESS_PACKAGES);
        if (
          !fileUsesExpress(ast) &&
          apolloExpress.modules.size === 0 &&
          apolloExpress.named.size === 0
        ) {
          return false;
        }

        const { allowInTests = true } = options as Options;
        ({ allowInDevelopment = true } = options as Options);

        const filename = context.filename;
        const isTestFile = allowInTests && isTestFilePath(filename);

        if (isTestFile) {
          return false;
        }
        return true;
      },
      CallExpression(node: TSESTree.CallExpression) {
        const callee = node.callee;

        const isGraphQLServer =
          isServerCallee(callee) ||
          (callee.type === 'Identifier' && callee.name === 'createServer');

        const isExpressGraphQL =
          callee.type === 'Identifier' && callee.name === 'graphqlHTTP';

        if (!isGraphQLServer && !isExpressGraphQL) {
          return;
        }
        check(node.arguments[0], node);
      },

      NewExpression(node: TSESTree.NewExpression) {
        if (!isServerCallee(node.callee)) return;
        check(node.arguments[0], node);
      },
    };
  },
});
