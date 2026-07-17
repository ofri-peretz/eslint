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

// ---------------------------------------------------------------------------
// Coverage wave: previously untested branches (annotation-debt removal)
// ---------------------------------------------------------------------------
ruleTester.run('no-graphql-introspection-production (coverage wave)', noGraphqlIntrospectionProduction, {
  valid: [
    // graphqlHTTP with no config argument
    { code: `graphqlHTTP();` },
    // graphqlHTTP with a non-object config
    { code: `graphqlHTTP(config);` },
    // production guard in the call path
    { code: `graphqlHTTP({ schema: schema, introspection: process.env.NODE_ENV !== 'production' });` },
    // no introspection setting in the call path
    { code: `graphqlHTTP({ schema: schema });` },
    // NewExpression with a non-Identifier callee
    { code: `new foo.ApolloServer({ introspection: true });` },
    // NewExpression with an unrelated Identifier callee
    { code: `new SomethingElse({ introspection: true });` },
    // ApolloServer with no config argument
    { code: `new ApolloServer();` },
    // ApolloServer with a non-object config
    { code: `new ApolloServer(config);` },
    // CallExpression whose callee is an unrelated NewExpression
    { code: `new foo.Bar()();` },
    // production guard via isProduction naming
    { code: `new ApolloServer({ introspection: !isProduction });` },
  ],
  invalid: [
    // plain createServer() call with introspection enabled
    {
      code: `createServer({ introspection: true });`,
      errors: [{ messageId: 'graphqlIntrospection' }],
    },
    // invoking the result of new GraphQLServer(...) — NewExpression handler reports once
    {
      code: `new GraphQLServer({ introspection: true })();`,
      errors: [{ messageId: 'graphqlIntrospection' }],
    },
    // graphqlHTTP with introspection enabled
    {
      code: `graphqlHTTP({ introspection: true });`,
      errors: [{ messageId: 'graphqlIntrospection' }],
    },
  ],
});
