/**
 * Tests for no-graphql-introspection-production rule
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { noGraphqlIntrospectionProduction } from './index';
import * as vitest from 'vitest';

RuleTester.afterAll = vitest.afterAll;
RuleTester.it = vitest.it;
RuleTester.itOnly = vitest.it.only;
RuleTester.describe = vitest.describe;

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('no-graphql-introspection-production', noGraphqlIntrospectionProduction, {
  valid: [
    // Introspection disabled
    {
      code: `
        const server = new ApolloServer({
          typeDefs,
          resolvers,
          introspection: false
        });
      `,
    },
    // Production guard
    {
      code: `
        const server = new ApolloServer({
          typeDefs,
          resolvers,
          introspection: process.env.NODE_ENV !== 'production'
        });
      `,
    },
    // Development guard
    {
      code: `
        const server = new ApolloServer({
          typeDefs,
          resolvers,
          introspection: process.env.NODE_ENV === 'development'
        });
      `,
    },
    // isProd variable
    {
      code: `
        const server = new ApolloServer({
          typeDefs,
          resolvers,
          introspection: !isProd
        });
      `,
    },
    // No introspection setting (not flagged - only explicit true)
    {
      code: `
        const server = new ApolloServer({
          typeDefs,
          resolvers
        });
      `,
    },
    // Test file
    {
      code: `
        const server = new ApolloServer({
          introspection: true
        });
      `,
      options: [{ allowInTests: true }],
      filename: 'server.test.ts',
    },
  ],
  invalid: [
    // Introspection explicitly enabled
    {
      code: `
        const server = new ApolloServer({
          typeDefs,
          resolvers,
          introspection: true
        });
      `,
      errors: [
        {
          messageId: 'graphqlIntrospection',
        },
      ],
    },
    // express-graphql with introspection
    {
      code: `
        app.use('/graphql', graphqlHTTP({
          schema,
          introspection: true
        }));
      `,
      errors: [
        {
          messageId: 'graphqlIntrospection',
        },
      ],
    },
  ],
});
