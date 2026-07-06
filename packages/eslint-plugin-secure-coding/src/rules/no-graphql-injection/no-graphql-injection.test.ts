/**
 * Comprehensive tests for no-graphql-injection rule
 * Security: CWE-89, CWE-400 (GraphQL Injection & DoS)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, expect, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { createWithMockContext } from '@interlace/eslint-devkit';
import { noGraphqlInjection } from './index';

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
        // Note: Removed test case with "baseQuery + ..." as it lacks clear GraphQL syntax
        // and is now correctly NOT flagged after FP reduction
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

  /**
   * Benchmark FP Regression Tests
   * Source: eslint-benchmark-suite/benchmarks/fn-fp-comparison/fixtures/safe/safe-patterns.js
   */
  describe('Benchmark FP Regression', () => {
    ruleTester.run('benchmark FP: safe_template_logging', noGraphqlInjection, {
      valid: [
        // Template literals used for logging should NOT trigger GraphQL injection
        {
          code: `
            function logUser(username) {
              console.log(\`User logged in: \${username}\`);
              return { message: \`Welcome, \${username}\` };
            }
          `,
        },
      ],
      invalid: [],
    });

    ruleTester.run('benchmark FP: safe_cmd_validated template', noGraphqlInjection, {
      valid: [
        // Template literal in execFile args is not a GraphQL query
        {
          code: `
            const { execFile } = require('child_process');
            execFile('convert', ['input.img', \`output.\${format}\`]);
          `,
        },
      ],
      invalid: [],
    });

    ruleTester.run('benchmark FP: safe_redirect_sameorigin', noGraphqlInjection, {
      valid: [
        // URL constructor with template literal is not GraphQL
        {
          code: `
            function redirect(req, res) {
              const target = req.query.returnTo;
              const url = new URL(target, \`https://\${req.headers.host}\`);
              if (url.host !== req.headers.host) {
                return res.redirect('/');
              }
              res.redirect(url.pathname);
            }
          `,
        },
      ],
      invalid: [],
    });
  });

  describe('Safe Caller Context - Additional Constructors', () => {
    ruleTester.run('valid - new Error TypeError RangeError with template literal', noGraphqlInjection, {
      valid: [
        // Built-in safe constructors other than URL should also short-circuit
        {
          code: 'throw new Error(`query { user { name } }`);',
        },
        {
          code: 'throw new TypeError(`{ users { posts { comments { author { name } } } } }`);',
        },
        {
          code: 'throw new RangeError(`{ users { posts { comments { author { name } } } } }`);',
        },
        // Unknown constructor is NOT a safe caller - GraphQL template still flagged
      ],
      invalid: [
        {
          code: 'const x = new SomeOtherClass(`query { user(id: "${userId}") { name } }`);',
          errors: [{ messageId: 'unsafeVariableInterpolation' }],
        },
      ],
    });

    ruleTester.run('valid - safeTemplateLiteralCallers option (member + constructor forms)', noGraphqlInjection, {
      valid: [
        // Custom member caller (contains '.') merged into safe callers
        {
          code: 'myLog.debug(`query { user { name } }`);',
          options: [{ safeTemplateLiteralCallers: ['myLog.debug'] }],
        },
        // Custom constructor form (no '.') merged into safe constructors
        {
          code: 'throw new MyCustomError(`query { user { name } }`);',
          options: [{ safeTemplateLiteralCallers: ['MyCustomError'] }],
        },
      ],
      invalid: [],
    });

    ruleTester.run('invalid - template literal in unrecognized call breaks out at first enclosing call', noGraphqlInjection, {
      valid: [],
      invalid: [
        // Wrapped in a non-safe call - walk stops at first CallExpression (break),
        // so the GraphQL template is still flagged rather than walking further up.
        {
          code: 'wrapWithNoise(`query { user(id: "${userId}") { name } }`);',
          errors: [{ messageId: 'unsafeVariableInterpolation' }],
        },
        // A bare (non-dotted) name in safeTemplateLiteralCallers is only ever
        // merged into safeConstructors (for `new Name(...)`), never into
        // safeMemberCallers - so a direct function call using that same name
        // is NOT treated as a safe caller and the GraphQL template is flagged.
        {
          code: 'myLogFn(`query { user(id: "${userId}") { name } }`);',
          options: [{ safeTemplateLiteralCallers: ['myLogFn'] }],
          errors: [{ messageId: 'unsafeVariableInterpolation' }],
        },
        // MemberExpression callee (object.method pattern) that is NOT in the
        // safe-caller set - exercises the false side of `safeMemberCallers.has(key)`.
        {
          code: 'someObject.someMethod(`query { user(id: "${userId}") { name } }`);',
          errors: [{ messageId: 'unsafeVariableInterpolation' }],
        },
      ],
    });
  });

  describe('Keyword Boundary and Brace Scanner Edge Cases', () => {
    ruleTester.run('valid - keyword substring never at a word boundary is not GraphQL', noGraphqlInjection, {
      valid: [
        // "query" appears only as part of longer identifiers (myquery, queryx),
        // never at a standalone word boundary - findKeywordAtBoundary must
        // exhaust its scan and return -1 rather than false-matching.
        {
          code: 'const s = `myquery queryx myqueryx`;',
        },
      ],
      invalid: [],
    });

    ruleTester.run('valid - single-level braces without GraphQL keywords stay below depth 2', noGraphqlInjection, {
      valid: [
        // Exactly one open+close brace pair: braceDepth increments to 1 then
        // decrements back via the `}` branch, never reaching the depth-2
        // threshold that would flag a selection set.
        {
          code: 'const s = `plain ${value} text {single}`;',
        },
      ],
      invalid: [],
    });

    ruleTester.run('valid - interpolated expression that is itself a validation call', noGraphqlInjection, {
      valid: [
        // The interpolated expression IS the validation CallExpression itself
        // (not a separately-declared variable), so isInputValidated() finds
        // the CallExpression while walking up from the expression node.
        {
          code: 'const query = `query { user(id: "${validate(userId)}") { name } }`;',
        },
      ],
      invalid: [],
    });

    ruleTester.run('valid - non-string literals are ignored', noGraphqlInjection, {
      valid: [
        // Numeric, boolean, null, and regex literals must short-circuit
        // before any GraphQL text scanning.
        'const n = 42;',
        'const b = true;',
        'const nul = null;',
        'const r = /query/;',
      ],
      invalid: [],
    });

    ruleTester.run('valid - plain string concatenation without GraphQL syntax', noGraphqlInjection, {
      valid: [
        // '+' concatenation whose combined text contains no GraphQL keywords
        // or nested braces must not be flagged.
        {
          code: 'const greeting = "Hello, " + name + "!";',
        },
      ],
      invalid: [],
    });

    ruleTester.run('valid - schema keyword at the very end of a template with nothing after it', noGraphqlInjection, {
      valid: [
        // The schema keyword scan pointer lands exactly at staticText.length
        // (`scan >= staticText.length`), so the "must have whitespace then a
        // word" guard exits via its length check rather than the whitespace
        // check.
        {
          code: 'const s = `the type`;',
        },
      ],
      invalid: [],
    });

    ruleTester.run('valid - operation keyword in string literal with nothing after it', noGraphqlInjection, {
      valid: [
        // "query" found at a word boundary in a plain string Literal, but
        // followed by an identifier and end-of-string (no `{` or `(`), so
        // containsGraphqlText's operation-keyword branch does not match and
        // falls through to the (also non-matching) fragment/schema/brace checks.
        {
          code: 'const s = "query foo";',
        },
      ],
      invalid: [],
    });

    ruleTester.run('valid - fragment keyword with no name in a string literal', noGraphqlInjection, {
      valid: [
        // "fragment" at a word boundary immediately followed by punctuation
        // (no identifier name), so containsGraphqlText's fragment branch
        // exits via `scan > nameStart` being false.
        {
          code: 'const s = "fragment: nope";',
        },
      ],
      invalid: [],
    });

    ruleTester.run('valid - missingInputValidation skipped when arg is validated via an outer wrapping call', noGraphqlInjection, {
      valid: [
        // `cleanId` is a direct Identifier argument to `graphql.execute`, but
        // walking up its ancestor chain reaches `validate(...)` as an outer
        // CallExpression with an Identifier callee matching validationFunctions -
        // isInputValidated() must find it and skip the report.
        {
          code: 'validate(graphql.execute(cleanId));',
        },
      ],
      invalid: [],
    });

    ruleTester.run('invalid - operation keyword template followed directly by parenthesis (no brace)', noGraphqlInjection, {
      valid: [],
      invalid: [
        // "mutation(" with no name/whitespace in between - exercises the
        // `staticText[scan] === '('` half of isGraphqlTemplate's op-keyword check.
        {
          code: 'const m = `mutation(id: "${userId}") { ok }`;',
          errors: [{ messageId: 'unsafeVariableInterpolation' }],
        },
      ],
    });

    ruleTester.run('invalid - operation keyword template with a name AND trailing whitespace before the brace', noGraphqlInjection, {
      valid: [],
      invalid: [
        // "query GetUser  {" - keyword, whitespace, name, MORE whitespace,
        // then brace - exercises the second whitespace-skip loop
        // (after the optional name) in isGraphqlTemplate's op-keyword check.
        {
          code: 'const q = `query GetUser  { id(x: "${userId}") }`;',
          errors: [{ messageId: 'unsafeVariableInterpolation' }],
        },
      ],
    });

    ruleTester.run('invalid - operation keyword in string literal with a name AND trailing whitespace before the brace', noGraphqlInjection, {
      valid: [],
      invalid: [
        // Same shape as above but through containsGraphqlText (plain string
        // Literal) - exercises the equivalent second whitespace-skip loop there.
        {
          code: 'const q = "query GetUser  { id { nested } }";',
          errors: [{ messageId: 'complexQueryDos' }],
          options: [{ maxQueryDepth: 1 }],
        },
      ],
    });

    ruleTester.run('valid - operation keyword template with nothing GraphQL-shaped after it', noGraphqlInjection, {
      valid: [
        // "query" at a word boundary inside a template literal, but followed
        // by a name and then end-of-string (no `{` or `(` afterwards), and no
        // other GraphQL indicator anywhere else in the template - exercises
        // the false side of isGraphqlTemplate's op-keyword `{`/`(` check.
        {
          code: 'const s = `query foo`;',
        },
      ],
      invalid: [],
    });

    ruleTester.run('valid - fragment keyword template with a name but not followed by "on"', noGraphqlInjection, {
      valid: [
        // "fragment Foo" has a name (passes `scan > nameStart`) but is not
        // followed by "on" - exercises the false side of isGraphqlTemplate's
        // fragment-"on" check, while the rest of the template stays free of
        // any other GraphQL indicator.
        {
          code: 'const s = `fragment Foo bar baz`;',
        },
      ],
      invalid: [],
    });

    ruleTester.run('invalid - schema keyword template (type) with a following name', noGraphqlInjection, {
      valid: [],
      invalid: [
        // "type User" with unsafe interpolation elsewhere in the same template -
        // exercises the true side of isGraphqlTemplate's schema-keyword check
        // using the `type` keyword specifically (interface was already covered).
        {
          code: 'const t = `type User { id: "${userId}" }`;',
          errors: [{ messageId: 'unsafeVariableInterpolation' }],
        },
      ],
    });

    ruleTester.run('invalid - operation keyword in string literal followed by parenthesis', noGraphqlInjection, {
      valid: [],
      invalid: [
        // "mutation(" in a plain string Literal - exercises the `(` half of
        // containsGraphqlText's operation-keyword `{`/`(` check.
        {
          code: 'const m = "mutation(id: 1) { ok { nested } }";',
          errors: [{ messageId: 'complexQueryDos' }],
          options: [{ maxQueryDepth: 1 }],
        },
      ],
    });

    ruleTester.run('valid - fragment keyword in string literal with a name but not followed by "on"', noGraphqlInjection, {
      valid: [
        // "fragment Foo" has a name but is not followed by "on" - exercises
        // the false side of containsGraphqlText's fragment-"on" check.
        {
          code: 'const s = "fragment Foo bar baz";',
        },
      ],
      invalid: [],
    });

    ruleTester.run('valid - schema keyword template followed by whitespace but no name', noGraphqlInjection, {
      valid: [
        // "type" followed by whitespace (passes the line-454 length/whitespace
        // guard) but then punctuation rather than a word character - exercises
        // the false side of isGraphqlTemplate's schema-keyword "must be a word"
        // check (line 456), while the rest of the template stays free of any
        // other GraphQL indicator.
        {
          code: 'const s = `type : nope`;',
        },
      ],
      invalid: [],
    });
  });

  describe('GraphQL Detection - Fragment and Schema Keywords', () => {
    ruleTester.run('invalid - fragment keyword template', noGraphqlInjection, {
      valid: [],
      invalid: [
        // "fragment Name on Type" pattern with unsafe interpolation triggers detection
        {
          code: 'const frag = `fragment UserFields on User { id name ${extra} }`;',
          errors: [{ messageId: 'unsafeVariableInterpolation' }],
        },
      ],
    });

    ruleTester.run('valid - fragment keyword without a following name is not GraphQL', noGraphqlInjection, {
      valid: [
        // "fragment" with no identifier name afterwards (immediately punctuation)
        // must not be treated as a GraphQL fragment definition.
        {
          code: 'const s = `fragment: 3`;',
        },
      ],
      invalid: [],
    });

    ruleTester.run('invalid - schema definition keyword template (interface)', noGraphqlInjection, {
      valid: [],
      invalid: [
        {
          code: 'const schema = `interface Node { ${extraField} }`;',
          errors: [{ messageId: 'unsafeVariableInterpolation' }],
        },
      ],
    });

    ruleTester.run('invalid - fragment keyword in string literal', noGraphqlInjection, {
      valid: [],
      invalid: [
        {
          code: 'const frag = "fragment UserFields on User { id name { nested } }";',
          errors: [{ messageId: 'complexQueryDos' }],
          options: [{ maxQueryDepth: 1 }],
        },
      ],
    });

    ruleTester.run('invalid - schema definition keyword in string literal (enum)', noGraphqlInjection, {
      valid: [],
      invalid: [
        {
          code: 'const schema = "enum Color { RED { GREEN } BLUE }";',
          errors: [{ messageId: 'complexQueryDos' }],
          options: [{ maxQueryDepth: 1 }],
        },
      ],
    });

    ruleTester.run('valid - schema keyword with no following identifier is not GraphQL', noGraphqlInjection, {
      valid: [
        // "type" followed immediately by punctuation (no whitespace + identifier)
        {
          code: 'const s = "type:3";',
        },
        // "type" at end of string with no name after whitespace
        {
          code: 'const s = "the type ";',
        },
      ],
      invalid: [],
    });
  });

  describe('Introspection and Depth via String Literal', () => {
    ruleTester.run('invalid - introspection query as string literal', noGraphqlInjection, {
      valid: [],
      invalid: [
        {
          code: 'const q = "query { __schema { types { name } } }";',
          errors: [{ messageId: 'introspectionQuery' }],
        },
        {
          code: 'const q = "query { __type(name: \\"User\\") { name } }";',
          errors: [{ messageId: 'introspectionQuery' }],
        },
      ],
    });

    ruleTester.run('valid - introspection string literal skipped when annotated @safe', noGraphqlInjection, {
      valid: [
        {
          code: `
            /** @safe */
            const q = "query { __schema { types { name } } }";
          `,
        },
      ],
      invalid: [],
    });

    ruleTester.run('invalid - deep query string literal exceeds maxQueryDepth', noGraphqlInjection, {
      valid: [],
      invalid: [
        {
          code: 'const q = "{ users { posts { comments { author { name } } } } }";',
          options: [{ maxQueryDepth: 3 }],
          errors: [{ messageId: 'complexQueryDos' }],
        },
      ],
    });
  });

  describe('BinaryExpression Injection - Safe Annotation', () => {
    ruleTester.run('valid - string concatenation skipped when annotated @safe', noGraphqlInjection, {
      valid: [
        {
          code: `
            /** @safe */
            const query = "query { user(id: \\"" + userId + "\\") { name } }";
          `,
        },
      ],
      invalid: [],
    });
  });

  describe('CallExpression Missing Validation - Safe Annotation', () => {
    ruleTester.run('valid - missing input validation skipped when arg annotated @safe', noGraphqlInjection, {
      valid: [
        {
          code: `
            /** @safe */
            graphql.execute(query);
          `,
        },
      ],
      invalid: [],
    });
  });

  describe('isGraphqlRelated - non-Identifier, non-MemberExpression callee', () => {
    ruleTester.run('valid - computed call callee is never treated as a GraphQL library call', noGraphqlInjection, {
      valid: [
        // Callee is itself a CallExpression (not Identifier or MemberExpression),
        // so isGraphqlRelated() must return false via its final fallthrough.
        {
          code: 'getClient()(query, variables);',
        },
      ],
      invalid: [],
    });
  });

  // ─── Layer 2: raw unit tests via createWithMockContext ───────────────────
  // Cover defensive branches that a real parser cannot produce through
  // RuleTester (missing `loc`, empty quasis array).
  describe('Layer 2 - mock context / synthetic AST', () => {
    it('TemplateLiteral report uses fallback line "0" when node.loc is missing', () => {
      const { listeners, reports } = createWithMockContext(noGraphqlInjection, {
        options: [{}],
      });

      const templateListener = listeners['TemplateLiteral'] as (node: unknown) => void;
      const node = {
        type: 'TemplateLiteral',
        parent: undefined,
        quasis: [
          { value: { cooked: '{ __schema { types { name } } }', raw: '{ __schema { types { name } } }' } },
        ],
        expressions: [],
        loc: undefined,
      };

      templateListener(node);

      expect(reports).toHaveLength(1);
      expect(reports[0]?.messageId).toBe('introspectionQuery');
      expect(reports[0]?.data?.['line']).toBe('0');
    });

    it('Literal report uses fallback line "0" when node.loc is missing', () => {
      const { listeners, reports } = createWithMockContext(noGraphqlInjection, {
        options: [{}],
      });

      const literalListener = listeners['Literal'] as (node: unknown) => void;
      const node = {
        type: 'Literal',
        value: 'query { __schema { types { name } } }',
        loc: undefined,
      };

      literalListener(node);

      expect(reports).toHaveLength(1);
      expect(reports[0]?.messageId).toBe('introspectionQuery');
      expect(reports[0]?.data?.['line']).toBe('0');
    });

    it('BinaryExpression report uses fallback line "0" when node.loc is missing', () => {
      const { listeners, reports, context } = createWithMockContext(noGraphqlInjection, {
        options: [{}],
        sourceText: 'query { user(id: "" + userId + "") { name } }',
      });

      const binaryListener = listeners['BinaryExpression'] as (node: unknown) => void;
      const node = {
        type: 'BinaryExpression',
        operator: '+',
        left: { type: 'Identifier', name: 'a', parent: undefined },
        right: { type: 'Identifier', name: 'b', parent: undefined },
        loc: undefined,
      };
      // sourceCode.getText(node) is stubbed to always return sourceText regardless of node.
      void context;

      binaryListener(node);

      expect(reports).toHaveLength(1);
      expect(reports[0]?.messageId).toBe('graphqlInjection');
      expect(reports[0]?.data?.['line']).toBe('0');
    });

    it('CallExpression missingInputValidation report uses fallback line "0" when node.loc is missing', () => {
      const { listeners, reports } = createWithMockContext(noGraphqlInjection, {
        options: [{}],
      });

      const callListener = listeners['CallExpression'] as (node: unknown) => void;
      const argNode = { type: 'Identifier', name: 'userInput', parent: undefined };
      const node = {
        type: 'CallExpression',
        callee: {
          type: 'MemberExpression',
          object: { type: 'Identifier', name: 'graphql' },
          property: { type: 'Identifier', name: 'execute' },
        },
        arguments: [argNode],
        loc: undefined,
      };
      (argNode as { parent?: unknown }).parent = node;

      callListener(node);

      expect(reports).toHaveLength(1);
      expect(reports[0]?.messageId).toBe('missingInputValidation');
      expect(reports[0]?.data?.['line']).toBe('0');
    });

    it('BinaryExpression with non "+" operator is ignored (no report)', () => {
      const { listeners, reports } = createWithMockContext(noGraphqlInjection, {
        options: [{}],
        sourceText: 'query { user { name } }',
      });

      const binaryListener = listeners['BinaryExpression'] as (node: unknown) => void;
      binaryListener({ type: 'BinaryExpression', operator: '-', loc: undefined });

      expect(reports).toHaveLength(0);
    });

    it('TemplateLiteral unsafeVariableInterpolation report uses fallback line "0" when node.loc is missing', () => {
      const { listeners, reports } = createWithMockContext(noGraphqlInjection, {
        options: [{}],
      });

      const templateListener = listeners['TemplateLiteral'] as (node: unknown) => void;
      const expr = { type: 'Identifier', name: 'userId', parent: undefined };
      const node = {
        type: 'TemplateLiteral',
        parent: undefined,
        quasis: [
          { value: { cooked: 'query { user(id: "', raw: 'query { user(id: "' } },
          { value: { cooked: '") { name } }', raw: '") { name } }' } },
        ],
        expressions: [expr],
        loc: undefined,
      };
      (expr as { parent?: unknown }).parent = node;

      templateListener(node);

      expect(reports).toHaveLength(1);
      expect(reports[0]?.messageId).toBe('unsafeVariableInterpolation');
      expect(reports[0]?.data?.['line']).toBe('0');
    });

    it('TemplateLiteral complexQueryDos report uses fallback line "0" when node.loc is missing', () => {
      const { listeners, reports } = createWithMockContext(noGraphqlInjection, {
        options: [{ maxQueryDepth: 1 }],
      });

      const templateListener = listeners['TemplateLiteral'] as (node: unknown) => void;
      const deepText = 'query { a { b { c } } }';
      const node = {
        type: 'TemplateLiteral',
        parent: undefined,
        quasis: [{ value: { cooked: deepText, raw: deepText } }],
        expressions: [],
        loc: undefined,
      };

      templateListener(node);

      expect(reports).toHaveLength(1);
      expect(reports[0]?.messageId).toBe('complexQueryDos');
      expect(reports[0]?.data?.['line']).toBe('0');
    });

    it('Literal complexQueryDos report uses fallback line "0" when node.loc is missing', () => {
      const { listeners, reports } = createWithMockContext(noGraphqlInjection, {
        options: [{ maxQueryDepth: 1, allowIntrospection: true }],
      });

      const literalListener = listeners['Literal'] as (node: unknown) => void;
      const node = {
        type: 'Literal',
        value: 'query { a { b { c } } }',
        loc: undefined,
      };

      literalListener(node);

      expect(reports).toHaveLength(1);
      expect(reports[0]?.messageId).toBe('complexQueryDos');
      expect(reports[0]?.data?.['line']).toBe('0');
    });

    it('isGraphqlTemplate falls back to quasi.value.raw when cooked is nullish', () => {
      const { listeners, reports } = createWithMockContext(noGraphqlInjection, {
        options: [{}],
      });

      const templateListener = listeners['TemplateLiteral'] as (node: unknown) => void;
      // Synthetic quasi with cooked: undefined (impossible for a real,
      // successfully-parsed untagged template literal - an invalid escape
      // sequence there is a hard parse error, not a null `cooked`). Exercises
      // the `q.value.cooked ?? q.value.raw` fallback inside isGraphqlTemplate.
      const node = {
        type: 'TemplateLiteral',
        parent: undefined,
        quasis: [
          { value: { cooked: undefined, raw: '{ __schema { types } }' } },
        ],
        expressions: [],
        loc: { start: { line: 7 } },
      };

      templateListener(node);

      expect(reports).toHaveLength(1);
      expect(reports[0]?.messageId).toBe('introspectionQuery');
      expect(reports[0]?.data?.['line']).toBe('7');
    });

    it('templateHasIntrospection falls back to quasi.value.raw when cooked is nullish', () => {
      const { listeners, reports } = createWithMockContext(noGraphqlInjection, {
        options: [{}],
      });

      const templateListener = listeners['TemplateLiteral'] as (node: unknown) => void;
      const node = {
        type: 'TemplateLiteral',
        parent: undefined,
        // Must pass isGraphqlTemplate too (needs a cooked/raw pair there),
        // so give it two quasis: first with normal cooked text that makes it
        // look like GraphQL, second with cooked: undefined to force the
        // fallback inside templateHasIntrospection specifically.
        quasis: [
          { value: { cooked: 'query { a { b } }', raw: 'query { a { b } }' } },
          { value: { cooked: undefined, raw: '__schema' } },
        ],
        expressions: [],
        loc: { start: { line: 9 } },
      };

      templateListener(node);

      expect(reports.some(r => r.messageId === 'introspectionQuery')).toBe(true);
    });

    it('templateQueryDepth falls back to quasi.value.raw when cooked is nullish', () => {
      const { listeners, reports } = createWithMockContext(noGraphqlInjection, {
        options: [{ maxQueryDepth: 1, allowIntrospection: true }],
      });

      const templateListener = listeners['TemplateLiteral'] as (node: unknown) => void;
      const node = {
        type: 'TemplateLiteral',
        parent: undefined,
        quasis: [
          { value: { cooked: 'query { a', raw: 'query { a' } },
          { value: { cooked: undefined, raw: '{ b { c } } }' } },
        ],
        expressions: [],
        loc: { start: { line: 11 } },
      };

      templateListener(node);

      expect(reports.some(r => r.messageId === 'complexQueryDos')).toBe(true);
    });
  });

});

