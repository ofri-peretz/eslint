/**
 * Comprehensive tests for no-missing-cors-check rule
 * CWE-346: Origin Validation Error
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import * as vitest from 'vitest';
import parser from '@typescript-eslint/parser';
import { noMissingCorsCheck } from './index';

// Configure RuleTester for Vitest
RuleTester.afterAll = vitest.afterAll;
RuleTester.it = vitest.it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

// Use Flat Config format (ESLint 9+)
const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: {
      ecmaFeatures: {
        jsx: true,
      },
    },
  },
});

vitest.describe('no-missing-cors-check', () => {
  vitest.describe('Valid Code', () => {
    ruleTester.run('valid - proper CORS validation', noMissingCorsCheck, {
      valid: [
        // CORS with origin validation
        {
          code: `
            app.use(cors({
              origin: (origin, callback) => {
                if (allowedOrigins.includes(origin)) {
                  callback(null, true);
                } else {
                  callback(new Error('Not allowed'));
                }
              }
            }));
          `,
        },
        // CORS with allowed origins array
        {
          code: 'app.use(cors({ origin: allowedOrigins }));',
        },
        // CORS with trusted library
        {
          code: 'app.use(cors({ origin: "https://example.com" }));',
        },
        // Test files (when allowInTests is true)
        {
          code: 'app.use(cors({ origin: "*" }));',
          filename: 'test.spec.ts',
          options: [{ allowInTests: true }],
        },
        // Ignored patterns
        {
          code: 'app.use(cors({ origin: safeOrigin }));',
          options: [{ ignorePatterns: ['safeOrigin'] }],
        },
      ],
      invalid: [],
    });
  });

  vitest.describe('Invalid Code - Wildcard Origin', () => {
    ruleTester.run('invalid - wildcard CORS origin', noMissingCorsCheck, {
      valid: [],
      invalid: [
        {
          code: 'app.use(cors({ origin: "*" }));',
          errors: [
            {
              messageId: 'missingCorsCheck',
              // Note: Suggestions are provided by the rule but not recognized by test framework
              // because fix returns null (suggestions are not auto-fixable)
            },
          ],
        },
        {
          code: 'app.use(cors({ origin: "*", credentials: true }));',
          errors: [
            {
              messageId: 'missingCorsCheck',
            },
          ],
        },
      ],
    });
  });

  vitest.describe('Invalid Code - CORS Headers', () => {
    ruleTester.run('invalid - wildcard CORS header', noMissingCorsCheck, {
      valid: [],
      invalid: [
        {
          code: 'res.setHeader("Access-Control-Allow-Origin", "*");',
          errors: [
            {
              messageId: 'missingCorsCheck',
            },
          ],
        },
        {
          code: 'res.header("Access-Control-Allow-Origin", "*");',
          errors: [
            {
              messageId: 'missingCorsCheck',
            },
          ],
        },
      ],
    });
  });

  vitest.describe('Options', () => {
    ruleTester.run('options - allowInTests', noMissingCorsCheck, {
      valid: [
        {
          code: 'app.use(cors({ origin: "*" }));',
          filename: 'test.spec.ts',
          options: [{ allowInTests: true }],
        },
      ],
      invalid: [
        {
          code: 'app.use(cors({ origin: "*" }));',
          filename: 'server.ts',
          options: [{ allowInTests: true }],
          errors: [
            {
              messageId: 'missingCorsCheck',
            },
          ],
        },
      ],
    });

    ruleTester.run('options - ignorePatterns with invalid regex', noMissingCorsCheck, {
      valid: [
        {
          code: 'app.use(cors({ origin: testOrigin }));',
          options: [{ ignorePatterns: ['['] }], // Invalid regex should be caught
        },
      ],
      invalid: [],
    });

    ruleTester.run('options - trustedLibraries', noMissingCorsCheck, {
      valid: [
        {
          code: 'app.use(myCors({ origin: "*" }));',
          options: [{ trustedLibraries: ['myCors'] }],
        },
      ],
      invalid: [],
    });
  });

  vitest.describe('Edge Cases', () => {
    ruleTester.run('edge cases - non-wildcard literal', noMissingCorsCheck, {
      valid: [
        {
          code: 'app.use(cors({ origin: "https://example.com" }));',
        },
        {
          code: 'app.use(cors({ origin: 123 }));',
        },
        {
          code: 'app.use(cors({ origin: true }));',
        },
      ],
      invalid: [],
    });

    ruleTester.run('edge cases - non-CORS context', noMissingCorsCheck, {
      valid: [
        {
          code: 'const config = { origin: "*" };',
        },
        {
          code: 'const data = { allowedOrigins: "*" };',
        },
      ],
      invalid: [],
    });

    ruleTester.run('edge cases - CORS config object validation', noMissingCorsCheck, {
      valid: [
        {
          code: 'app.use(cors({ origin: allowedOrigins, credentials: true }));',
        },
      ],
      invalid: [],
    });

    ruleTester.run('edge cases - setHeader with non-wildcard', noMissingCorsCheck, {
      valid: [
        {
          code: 'res.setHeader("Access-Control-Allow-Origin", origin);',
        },
        {
          code: 'res.setHeader("Content-Type", "*");',
        },
      ],
      invalid: [],
    });

    ruleTester.run('edge cases - header with non-Access-Control', noMissingCorsCheck, {
      valid: [
        {
          code: 'res.setHeader("Content-Type", "*");',
        },
        {
          code: 'res.header("Content-Type", "*");',
        },
      ],
      invalid: [],
    });

    ruleTester.run('edge cases - callExpression without use method', noMissingCorsCheck, {
      valid: [
        {
          code: 'app.get("/api", handler);',
        },
        {
          code: 'router.post("/users", controller);',
        },
      ],
      invalid: [],
    });

    ruleTester.run('edge cases - literal in CORS context via property', noMissingCorsCheck, {
      valid: [],
      invalid: [
        {
          code: 'app.use(cors({ origin: "*", allowedOrigins: ["https://example.com"] }));',
          errors: [
            {
              messageId: 'missingCorsCheck',
            },
          ],
        },
      ],
    });

    ruleTester.run('edge cases - literal in isActualCorsContext', noMissingCorsCheck, {
      valid: [],
      invalid: [
        {
          code: 'const config = { origin: "*" }; app.use(cors(config));',
          errors: [
            {
              messageId: 'missingCorsCheck',
            },
          ],
        },
      ],
    });

    ruleTester.run('edge cases - literal with ignorePatterns', noMissingCorsCheck, {
      valid: [
        {
          code: 'app.use(cors({ origin: "*" }));',
          options: [{ ignorePatterns: ['\\*'] }],
        },
      ],
      invalid: [],
    });

    ruleTester.run('edge cases - literal in CORS context via first while loop', noMissingCorsCheck, {
      valid: [],
      invalid: [
        {
          code: 'cors({ origin: "*" });',
          errors: [
            {
              messageId: 'missingCorsCheck',
            },
          ],
        },
      ],
    });

    ruleTester.run('edge cases - property in CORS call (allowedOrigins)', noMissingCorsCheck, {
      valid: [],
      invalid: [
        {
          code: 'app.use(cors({ allowedOrigins: "*" }));',
          errors: [
            {
              messageId: 'missingCorsCheck',
            },
          ],
        },
      ],
    });

    ruleTester.run('edge cases - memberExpression with ignorePatterns', noMissingCorsCheck, {
      valid: [
        {
          code: 'safeRes.setHeader("Access-Control-Allow-Origin", "*");',
          options: [{ ignorePatterns: ['safeRes'] }],
        },
      ],
      invalid: [],
    });

    ruleTester.run('edge cases - variable declaration found in scope', noMissingCorsCheck, {
      valid: [],
      invalid: [
        {
          code: `
            const corsConfig = { origin: "*" };
            app.use(cors(corsConfig));
          `,
          errors: [
            {
              messageId: 'missingCorsCheck',
            },
          ],
        },
      ],
    });

    ruleTester.run('edge cases - isActualCorsContext path (direct cors call)', noMissingCorsCheck, {
      valid: [],
      invalid: [
        {
          code: 'enable(cors({ origin: "*" }));',
          errors: [
            {
              messageId: 'missingCorsCheck',
            },
          ],
        },
      ],
    });

    ruleTester.run('edge cases - variable in Program scope (line 427)', noMissingCorsCheck, {
      valid: [],
      invalid: [
        {
          code: `
            const myConfig = { origin: "*" };
            app.use(cors(myConfig));
          `,
          errors: [
            {
              messageId: 'missingCorsCheck',
            },
          ],
        },
      ],
    });

    ruleTester.run('edge cases - variable not found, traverse to root (line 432)', noMissingCorsCheck, {
      valid: [
        {
          code: 'app.use(cors(unknownVar));',
        },
      ],
      invalid: [],
    });

    ruleTester.run('edge cases - variable in function scope', noMissingCorsCheck, {
      valid: [],
      invalid: [
        {
          code: `
            function setupCors() {
              const config = { origin: "*" };
              app.use(cors(config));
            }
          `,
          errors: [
            {
              messageId: 'missingCorsCheck',
            },
          ],
        },
      ],
    });
  });
});


// ---------------------------------------------------------------------------
// Coverage wave: previously untested branches (annotation-debt removal)
// ---------------------------------------------------------------------------
import { expect } from 'vitest';
import { createWithMockContext } from '@interlace/eslint-devkit';

ruleTester.run('no-missing-cors-check (coverage wave)', noMissingCorsCheck, {
  valid: [
    // wildcard in an object with no CORS context at all
    { code: `const config = { origin: '*' };` },
    // config variable declared without an initializer
    { code: `let corsConfig; app.use(cors(corsConfig));` },
    // config variable initialized from a call, not an object literal
    { code: `const config = getConfig(); app.use(cors(config));` },
    // config variable with a safe origin
    { code: `const config = { origin: 'https://ok.example' }; app.use(cors(config));` },
    // declarators/properties that do not match the config lookup
    {
      code: `const { a } = obj; const other = 1; const config = { ...base, origin: 'https://ok.example' }; app.use(cors(config));`,
    },
    // arrow function with an expression body — empty scope body
    { code: `const f = () => app.use(cors(cfg));` },
    // app.use() with no arguments
    { code: `app.use();` },
    // trusted library is skipped entirely
    {
      code: `app.use(mylib({ origin: '*' }));`,
      options: [{ trustedLibraries: ['mylib'] }],
    },
    // unknown library that is neither cors nor trusted
    {
      code: `app.use(mylib({ origin: '*' }));`,
      options: [{ trustedLibraries: ['other'] }],
    },
    // computed setHeader access — member checker requires an identifier property
    { code: `res['setHeader']('Access-Control-Allow-Origin', '*');` },
    // member expression without a call parent
    { code: `const fn = res.setHeader;` },
    // header value is not a literal
    { code: `res.setHeader('Access-Control-Allow-Origin', origin);` },
    // header call without a value argument
    { code: `res.setHeader('Access-Control-Allow-Origin');` },
    // ignorePatterns suppresses the member-expression checker
    {
      code: `res.setHeader('Access-Control-Allow-Origin', '*');`,
      options: [{ ignorePatterns: ['setHeader'] }],
    },
    // ignorePatterns suppresses the literal and call checkers
    {
      code: `app.use(cors('*'));`,
      options: [{ ignorePatterns: ['\\*'] }],
    },
  ],
  invalid: [
    // wildcard literal passed directly to cors() — actual CORS context
    { code: `app.use(cors('*'));`, errors: [{ messageId: 'missingCorsCheck' }] },
    // string-keyed origin property — key is not an Identifier
    { code: `app.use(cors({ 'origin': '*' }));`, errors: [{ messageId: 'missingCorsCheck' }] },
    // wildcard under a non-origin key inside a cors() call
    { code: `app.use(cors({ path: '*' }));`, errors: [{ messageId: 'missingCorsCheck' }] },
    // allowedOrigins key
    { code: `app.use(cors({ allowedOrigins: '*' }));`, errors: [{ messageId: 'missingCorsCheck' }] },
    // unicode-escaped cors identifier — text regexes miss it, callee name check catches it
    {
      code: 'app.use(co\\u0072s({ origin: "*" }));',
      errors: [{ messageId: 'missingCorsCheck' }],
    },
    // config object resolved through a variable when cors() appears later in the args
    {
      code: `const corsOptions = { origin: '*' }; app.use(corsOptions, cors());`,
      errors: [{ messageId: 'missingCorsCheck' }],
    },
    // variable lookup inside a function scope
    {
      code: `function setup() { const config = { origin: '*' }; app.use(cors(config)); }`,
      errors: [{ messageId: 'missingCorsCheck' }],
    },
    // wildcard CORS header via setHeader
    {
      code: `res.setHeader('Access-Control-Allow-Origin', '*');`,
      errors: [{ messageId: 'missingCorsCheck' }],
    },
  ],
});

// Layer 2: synthetic AST — a parser always parents nodes up to Program, so the
// "ancestor chain ends without a Program" break is only reachable with a
// hand-built node (parent: null).
vitest.describe('no-missing-cors-check (layer 2: synthetic AST)', () => {
  vitest.it('stops the scope walk when the ancestor chain ends without a Program node', () => {
    const { listeners, reports } = createWithMockContext(noMissingCorsCheck, {
      sourceText: 'app.use(cors(config))',
    });
    const node = {
      type: 'CallExpression',
      parent: null,
      callee: {
        type: 'MemberExpression',
        object: { type: 'Identifier', name: 'app' },
        property: { type: 'Identifier', name: 'use' },
      },
      arguments: [{ type: 'Identifier', name: 'config' }],
    };
    (listeners.CallExpression as (n: unknown) => void)(node);
    expect(reports).toHaveLength(0);
  });
});
