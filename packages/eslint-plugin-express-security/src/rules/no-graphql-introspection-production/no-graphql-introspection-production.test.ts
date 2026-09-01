/**
 * Tests for no-graphql-introspection-production rule
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { noGraphqlIntrospectionProduction } from './index';
import * as vitest from 'vitest';

/**
 * Every fixture imports express, because the rules now abstain in files with no
 * Express in them. Wrapping the arrays rather than editing each fixture means
 * one cannot be left behind — a fixture missing the import would pass vacuously
 * on the gate instead of exercising the detection it was written for. `output`
 * and errors[].suggestions[].output are prefixed too, since autofix fixtures
 * assert the whole file back.
 */
// A SIDE-EFFECT import: it satisfies the gate without reserving the `express`
// binding. Several fixtures already declare `const express = require('express')`
// at module level, and a default import would redeclare it.
const asExpress = (code: string): string => `import 'express';\n${code}`;
type Suggestion = { output?: string | null };
type Case = {
  code: string;
  output?: string | null;
  errors?: ReadonlyArray<{ suggestions?: readonly Suggestion[] } | string>;
};
const xp = <T,>(cases: T[]): T[] =>
  cases.map((c) => {
    if (typeof c === 'string') return asExpress(c) as T;
    const test = c as Case;
    return {
      ...c,
      code: asExpress(test.code),
      ...(typeof test.output === 'string' ? { output: asExpress(test.output) } : {}),
      ...(test.errors
        ? {
            errors: test.errors.map((e) =>
              typeof e === 'string' || !e.suggestions
                ? e
                : {
                    ...e,
                    suggestions: e.suggestions.map((s) =>
                      typeof s.output === 'string'
                        ? { ...s, output: asExpress(s.output) }
                        : s,
                    ),
                  },
            ),
          }
        : {}),
    } as T;
  });


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

ruleTester.run(
  'no-graphql-introspection-production',
  noGraphqlIntrospectionProduction,
  {
    valid: xp([
      // Introspection disabled
      {
        name: 'introspection off',
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
    ]),
    invalid: xp([
      // Introspection explicitly enabled
      {
        name: 'introspection left on publishes the whole schema',
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
    ]),
  },
);

// ---------------------------------------------------------------------------
// Coverage wave: previously untested branches (annotation-debt removal)
// ---------------------------------------------------------------------------
ruleTester.run(
  'no-graphql-introspection-production (coverage wave)',
  noGraphqlIntrospectionProduction,
  {
    valid: xp([
      // graphqlHTTP with no config argument
      { code: `graphqlHTTP();` },
      // graphqlHTTP with a non-object config
      { code: `graphqlHTTP(config);` },
      // production guard in the call path
      {
        code: `graphqlHTTP({ schema: schema, introspection: process.env.NODE_ENV !== 'production' });`,
      },
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
    ]),
    invalid: xp([
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
    ]),
  },
);
