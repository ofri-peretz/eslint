/**
 * Comprehensive tests for no-graphql-injection rule
 * Security: CWE-89, CWE-400 (GraphQL Injection & DoS)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noGraphqlInjection } from '../../rules/security/no-graphql-injection';

// Configure RuleTester for Vitest
RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

// Use Flat Config format (ESLint 9+)
const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

describe('no-graphql-injection', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - safe GraphQL operations', noGraphqlInjection, {
      valid: [
        // Safe GraphQL queries with variables
        {
          code: 'const query = `query($id: ID!) { user(id: $id) { name } }`;',
        },
        // Using GraphQL libraries safely
        {
          code: 'const result = await graphql({ schema, source: query, variableValues });',
        },
        // Safe schema definitions
        {
          code: 'const typeDefs = `type User { id: ID! name: String }`;',
        },
        // Non-GraphQL strings
        {
          code: 'const message = "Hello World";',
        },
        // Safe introspection in development (with config)
        {
          code: 'const query = `{ __schema { types { name } } }`;',
          options: [{ allowIntrospection: true }],
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Introspection Queries', () => {
    ruleTester.run('invalid - dangerous introspection queries', noGraphqlInjection, {
      valid: [],
      invalid: [
        {
          code: 'const query = `{ __schema { types { name } } }`;',
          errors: [
            {
              messageId: 'introspectionQuery',
            },
          ],
        },
        {
          code: 'const introspectionQuery = `query { __type(name: "User") { name fields { name } } }`;',
          errors: [
            {
              messageId: 'introspectionQuery',
            },
          ],
        },
        {
          code: 'const schemaQuery = `{ __schema { queryType { name } mutationType { name } } }`;',
          errors: [
            {
              messageId: 'introspectionQuery',
            },
          ],
        },
      ],
    });
  });

  describe('Invalid Code - Unsafe Interpolation', () => {
    ruleTester.run('invalid - unsafe variable interpolation', noGraphqlInjection, {
      valid: [],
      invalid: [
        // Unsafe variable interpolation in GraphQL query
        {
          code: 'const query = `query { user(id: "${userId}") { name } }`;',
          errors: [
            {
              messageId: 'unsafeVariableInterpolation',
            },
          ],
        },
        {
          code: 'const mutation = `mutation { createUser(name: "${name}", email: "${email}") { id } }`;',
          errors: [
            {
              messageId: 'unsafeVariableInterpolation',
            },
          ],
        },
        {
          code: 'const complexQuery = `query { users(filter: { name: "${searchTerm}", status: "${status}" }) { id } }`;',
          errors: [
            {
              messageId: 'unsafeVariableInterpolation',
            },
          ],
        },
      ],
    });
  });

  describe('Invalid Code - String Concatenation', () => {
    ruleTester.run('invalid - dangerous string concatenation', noGraphqlInjection, {
      valid: [],
      invalid: [
        // String concatenation produces 2 errors for nested BinaryExpressions
        {
          code: 'const query = "query { user(id: \\"" + userId + "\\") { name } }";',
          errors: [
            {
              messageId: 'graphqlInjection',
            },
            {
              messageId: 'graphqlInjection',
            },
          ],
        },
        // This produces 1 error for the outer BinaryExpression
        {
          code: 'const fullQuery = baseQuery + " user(id: \\"" + id + "\\") { name }";',
          errors: [
            {
              messageId: 'graphqlInjection',
            },
          ],
        },
      ],
    });
  });

  describe('Invalid Code - Complex Queries (DoS)', () => {
    ruleTester.run('invalid - complex queries risking DoS', noGraphqlInjection, {
      valid: [],
      invalid: [
        // Deep query with depth > 10 (default maxQueryDepth)
        {
          code: `const deepQuery = \`query {
            users {
              friends {
                friends {
                  friends {
                    friends {
                      friends {
                        friends {
                          friends {
                            friends {
                              friends {
                                friends {
                                  name
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }\`;`,
          errors: [
            {
              messageId: 'complexQueryDos',
            },
          ],
        },
        // Complex nested query exceeding lower depth limit
        {
          code: 'const complexQuery = `{ users { posts { comments { author { posts { comments { author { name } } } } } } } }`;',
          options: [{ maxQueryDepth: 5 }],
          errors: [
            {
              messageId: 'complexQueryDos',
            },
          ],
        },
      ],
    });
  });

  describe('Invalid Code - Missing Input Validation', () => {
    ruleTester.run('invalid - missing input validation', noGraphqlInjection, {
      valid: [],
      invalid: [
        // Each Identifier argument produces a missingInputValidation error
        // graphql.execute(query, root, context, variables) - 4 Identifier args
        {
          code: 'const result = await graphql.execute(query, root, context, variables);',
          errors: [
            { messageId: 'missingInputValidation' },
            { messageId: 'missingInputValidation' },
            { messageId: 'missingInputValidation' },
            { messageId: 'missingInputValidation' },
          ],
        },
      ],
    });
  });

  describe('Valid Code - False Positives Reduced', () => {
    ruleTester.run('valid - false positives reduced', noGraphqlInjection, {
      valid: [
        // Safe annotations
        {
          code: `
            /** @safe */
            const query = \`query { __schema { types { name } } }\`;
          `,
        },
        // Validated inputs
        {
          code: `
            const cleanId = validate(userId);
            const query = \`query { user(id: "\${cleanId}") { name } }\`;
          `,
        },
        // Sanitized inputs
        {
          code: `
            const safeName = sanitize(searchTerm);
            const query = \`query { users(name: "\${safeName}") { id } }\`;
          `,
        },
        // Shallow queries
        {
          code: 'const query = `{ users { name email } }`;',
        },
        // Schema definitions (not queries)
        {
          code: 'const schema = `type Query { users: [User] }`;',
        },
      ],
      invalid: [],
    });
  });

  describe('Configuration Options', () => {
    ruleTester.run('config - allow introspection', noGraphqlInjection, {
      valid: [
        {
          code: 'const query = `{ __schema { types { name } } }`;',
          options: [{ allowIntrospection: true }],
        },
      ],
      invalid: [],
    });

    ruleTester.run('config - custom max depth', noGraphqlInjection, {
      valid: [
        // Query with depth 2: { users { name } } - 2 opening braces
        {
          code: 'const shallowQuery = `{ users { name } }`;',
          options: [{ maxQueryDepth: 2 }],
        },
      ],
      invalid: [
        // Query with depth 3: { users { friends { name } } } - 3 opening braces
        // Exceeds maxQueryDepth: 2
        {
          code: 'const deepQuery = `{ users { friends { name } } }`;',
          options: [{ maxQueryDepth: 2 }],
          errors: [
            {
              messageId: 'complexQueryDos',
            },
          ],
        },
      ],
    });

    // trustedGraphqlLibraries controls which libraries are CHECKED for issues
    // (not which are skipped). So myGraphql.execute() is checked for unvalidated inputs.
    ruleTester.run('config - custom trusted libraries', noGraphqlInjection, {
      valid: [],
      invalid: [
        // myGraphql is recognized as a GraphQL library, so its inputs are checked
        // Both 'query' and 'variables' are unvalidated Identifiers
        {
          code: 'myGraphql.execute(query, variables);',
          options: [{ trustedGraphqlLibraries: ['myGraphql'] }],
          errors: [
            { messageId: 'missingInputValidation' },
            { messageId: 'missingInputValidation' },
          ],
        },
      ],
    });
  });

  describe('Complex GraphQL Scenarios', () => {
    ruleTester.run('complex - real-world GraphQL patterns', noGraphqlInjection, {
      valid: [],
      invalid: [
        {
          code: `
            function getUserQuery(userId) {
              // DANGEROUS: Direct interpolation
              return \`query {
                user(id: "\${userId}") {
                  name
                  email
                  posts {
                    title
                    comments {
                      text
                    }
                  }
                }
              }\`;
            }
          `,
          errors: [
            {
              messageId: 'unsafeVariableInterpolation',
            },
          ],
        },
        {
          code: `
            const searchUsers = (term, limit) => {
              // DANGEROUS: Multiple interpolations + potential DoS
              const query = \`query {
                users(filter: { name: "\${term}" }, first: \${limit}) {
                  edges {
                    node {
                      friends(first: 100) {
                        edges {
                          node {
                            name
                          }
                        }
                      }
                    }
                  }
                }
              }\`;
              return graphql.execute(query);
            }
          `,
          errors: [
            {
              messageId: 'unsafeVariableInterpolation',
            },
            {
              messageId: 'missingInputValidation',
            },
          ],
        },
      ],
    });
  });
});
