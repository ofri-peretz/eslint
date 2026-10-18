import { RuleTester } from '@typescript-eslint/rule-tester';
import { noDebugModeProduction } from '../no-debug-mode-production/index';

/**
 * Every fixture imports mongoose, because the rules now abstain in files with
 * no Mongo in them. Wrapping the arrays rather than editing each fixture means
 * one cannot be left behind — a fixture missing the import would pass
 * vacuously on the gate instead of exercising the detection it was written
 * for. `output` and errors[].suggestions[].output are prefixed too, since
 * autofix fixtures assert the whole file back.
 */
// A SIDE-EFFECT import: satisfies the gate without reserving any binding, so
// fixtures that already declare `mongoose`/`db` do not redeclare.
const asMongo = (code: string): string => `import 'mongoose';\n${code}`;
type MongoSuggestion = { output?: string | null };
type MongoCase = {
  code: string;
  output?: string | null;
  errors?: ReadonlyArray<{ suggestions?: readonly MongoSuggestion[] } | string>;
};
const xmo = <T>(cases: T[]): T[] =>
  cases.map((c) => {
    if (typeof c === 'string') return asMongo(c) as T;
    const test = c as MongoCase;
    return {
      ...c,
      code: asMongo(test.code),
      ...(typeof test.output === 'string'
        ? { output: asMongo(test.output) }
        : {}),
      ...(test.errors
        ? {
            errors: test.errors.map((e) =>
              typeof e === 'string' || !Array.isArray(e.suggestions)
                ? e
                : {
                    ...e,
                    suggestions: e.suggestions.map((s) =>
                      typeof s.output === 'string'
                        ? { ...s, output: asMongo(s.output) }
                        : s,
                    ),
                  },
            ),
          }
        : {}),
    } as T;
  });

const ruleTester = new RuleTester();

ruleTester.run('no-debug-mode-production', noDebugModeProduction, {
  valid: xmo([
    // Debug set to false
    `mongoose.set('debug', false);`,
    // Debug based on env check
    `mongoose.set('debug', process.env.NODE_ENV !== 'production');`,
    // Different option
    `mongoose.set('strict', true);`,
    // Not a set() call
    `mongoose.connect(uri);`,
    // Test file (allowed by default)
    {
      code: `mongoose.set('debug', true);`,
      filename: 'setup.test.ts',
    },
  ]),

  invalid: xmo([
    // mongoose.set('debug', true)
    {
      code: `mongoose.set('debug', true);`,
      errors: [
        {
          messageId: 'debugModeProduction',
          suggestions: [
            {
              messageId: 'suggestionGateOnNodeEnv',
              output: `mongoose.set('debug', process.env.NODE_ENV !== 'production');`,
            },
          ],
        },
      ],
    },
    // Any object.set('debug', true)
    {
      code: `db.set('debug', true);`,
      errors: [
        {
          messageId: 'debugModeProduction',
          suggestions: [
            {
              messageId: 'suggestionGateOnNodeEnv',
              output: `db.set('debug', process.env.NODE_ENV !== 'production');`,
            },
          ],
        },
      ],
    },
    // config.set('debug', true) - also flags since any .set('debug', true) is risky
    {
      code: `config.set('debug', true);`,
      errors: [
        {
          messageId: 'debugModeProduction',
          suggestions: [
            {
              messageId: 'suggestionGateOnNodeEnv',
              output: `config.set('debug', process.env.NODE_ENV !== 'production');`,
            },
          ],
        },
      ],
    },
    // allowInTests: false
    {
      code: `mongoose.set('debug', true);`,
      filename: 'setup.test.ts',
      options: [{ allowInTests: false }],
      errors: [
        {
          messageId: 'debugModeProduction',
          suggestions: [
            {
              messageId: 'suggestionGateOnNodeEnv',
              output: `mongoose.set('debug', process.env.NODE_ENV !== 'production');`,
            },
          ],
        },
      ],
    },
  ]),
});

// ---------------------------------------------------------------------------
// Edges pinned by mutation testing (npm run mutation -- --plugin mongodb-security).
// Each fixture is the input that tells the rule apart from a Stryker mutant
// that survived the suite above; see docs/MUTATION_TESTING.md.
// ---------------------------------------------------------------------------

ruleTester.run('mutation-guided edges', noDebugModeProduction, {
  valid: xmo([
    {
      name: 'a bare set() call is not mongoose.set()',
      code: `set('debug', true);`,
    },
    {
      name: "mongoose.set('debug') with no value does not turn debug on",
      code: `mongoose.set('debug');`,
    },
    {
      name: 'only set() configures debug mode',
      code: `cache.put('debug', true);`,
    },
  ]),
  invalid: [],
});

const gated = "process.env.NODE_ENV !== 'production'";

ruleTester.run('object form of set()', noDebugModeProduction, {
  valid: xmo([
    { name: 'debug: false', code: `mongoose.set({ debug: false });` },
    {
      name: 'debug gated on the environment',
      code: `mongoose.set({ debug: process.env.NODE_ENV !== 'production' });`,
    },
    {
      name: 'other options set to true',
      code: `mongoose.set({ strictQuery: true, autoIndex: true });`,
    },
    {
      name: 'a spread of a config object is not traced',
      code: `mongoose.set({ ...options });`,
    },
    { name: 'set() with no arguments', code: `mongoose.set();` },
    {
      name: "a 'debug' string value is not the boolean true",
      code: `mongoose.set({ debug: 'true' });`,
    },
  ]),
  invalid: xmo([
    {
      name: 'mongoose.set({ debug: true })',
      code: `mongoose.set({ debug: true });`,
      errors: [
        {
          messageId: 'debugModeProduction',
          suggestions: [
            {
              messageId: 'suggestionGateOnNodeEnv',
              output: `mongoose.set({ debug: ${gated} });`,
            },
          ],
        },
      ],
    },
    {
      name: 'debug: true alongside other options, with a quoted key',
      code: `mongoose.set({ strictQuery: true, 'debug': true });`,
      errors: [
        {
          messageId: 'debugModeProduction',
          suggestions: [
            {
              messageId: 'suggestionGateOnNodeEnv',
              output: `mongoose.set({ strictQuery: true, 'debug': ${gated} });`,
            },
          ],
        },
      ],
    },
    {
      name: "mongoose['set']('debug', true) is the same call",
      code: `mongoose['set']('debug', true);`,
      errors: [
        {
          messageId: 'debugModeProduction',
          suggestions: [
            {
              messageId: 'suggestionGateOnNodeEnv',
              output: `mongoose['set']('debug', ${gated});`,
            },
          ],
        },
      ],
    },
  ]),
});

/**
 * Express has an app setting called `debug` of its own, so `app.set('debug',
 * true)` on an Express app is not Mongoose. Only a receiver PROVABLY made by
 * Express is skipped; an unknown one stays reported. And the callback form —
 * which the docs listed as incorrect — logs every query just as `true` does.
 * Owner decision, 2026-10-18.
 */
/** The one finding, with the suggestion that gates `true` on NODE_ENV. */
const gatedFinding = (code: string) => [
  {
    messageId: 'debugModeProduction' as const,
    suggestions: [
      {
        messageId: 'suggestionGateOnNodeEnv' as const,
        output: code.replace(
          "'debug', true",
          "'debug', process.env.NODE_ENV !== 'production'",
        ),
      },
    ],
  },
];

ruleTester.run(
  'express receivers and the callback form',
  noDebugModeProduction,
  {
    valid: xmo([
      {
        name: 'an Express app made by express()',
        code: "import express from 'express';\nconst app = express();\napp.set('debug', true);",
      },
      {
        name: 'an Express router made by express.Router()',
        code: "import express from 'express';\nconst router = express.Router();\nrouter.set('debug', true);",
      },
      {
        name: 'a Router imported by name from express',
        code: "const { Router } = require('express');\nconst api = Router();\napi.set('debug', true);",
      },
      {
        name: 'express() called inline',
        code: "import express from 'express';\nexpress().set('debug', true);",
      },
      {
        name: 'the options-object form on an Express app',
        code: "import express from 'express';\nconst app = express();\napp.set({ debug: true });",
      },
      {
        name: 'the callback form gated on the environment',
        code: "mongoose.set('debug', process.env.NODE_ENV !== 'production' && ((c, m) => log(c, m)));",
      },
    ]),
    invalid: xmo([
      {
        name: 'an app of unknown origin may be a Mongoose instance',
        code: "app.set('debug', true);",
        errors: gatedFinding("app.set('debug', true);"),
      },
      {
        name: 'a local function called express is not Express',
        code: "function express() { return mongoose; }\nconst app = express();\napp.set('debug', true);",
        errors: gatedFinding(
          "function express() { return mongoose; }\nconst app = express();\napp.set('debug', true);",
        ),
      },
      {
        name: 'another export of express is not an app factory',
        code: "import express from 'express';\nconst s = express.static('public');\ns.set('debug', true);",
        errors: gatedFinding(
          "import express from 'express';\nconst s = express.static('public');\ns.set('debug', true);",
        ),
      },
      {
        name: 'a deeper express path is not an app factory',
        code: "import express from 'express';\nconst s = express.Router.make();\ns.set('debug', true);",
        errors: gatedFinding(
          "import express from 'express';\nconst s = express.Router.make();\ns.set('debug', true);",
        ),
      },
      {
        name: 'a binding reassigned after express() may hold anything',
        code: "import express from 'express';\nlet app = express();\napp = mongoose;\napp.set('debug', true);",
        errors: gatedFinding(
          "import express from 'express';\nlet app = express();\napp = mongoose;\napp.set('debug', true);",
        ),
      },
      {
        name: 'a binding declared without a value',
        code: "let app;\napp.set('debug', true);",
        errors: gatedFinding("let app;\napp.set('debug', true);"),
      },
      {
        name: 'a destructured binding is not the call result',
        code: "import express from 'express';\nconst { app } = express();\napp.set('debug', true);",
        errors: gatedFinding(
          "import express from 'express';\nconst { app } = express();\napp.set('debug', true);",
        ),
      },
      {
        name: 'a parameter is of unknown origin',
        code: "function setup(app) { app.set('debug', true); }",
        errors: gatedFinding("function setup(app) { app.set('debug', true); }"),
      },
      {
        name: 'a binding initialised with something other than a call',
        code: "const app = mongoose;\napp.set('debug', true);",
        errors: gatedFinding("const app = mongoose;\napp.set('debug', true);"),
      },
      {
        name: 'a member receiver is not resolved',
        code: "this.db.set('debug', true);",
        errors: gatedFinding("this.db.set('debug', true);"),
      },
      {
        name: 'the callback form logs every query',
        code: "mongoose.set('debug', (coll, method, query) => console.log(coll, method, query));",
        errors: [
          {
            messageId: 'debugModeProduction',
            suggestions: [
              {
                messageId: 'suggestionGateOnNodeEnv',
                output:
                  "mongoose.set('debug', process.env.NODE_ENV !== 'production' && ((coll, method, query) => console.log(coll, method, query)));",
              },
            ],
          },
        ],
      },
      {
        name: 'a function expression callback',
        code: "mongoose.set('debug', function (coll) { log(coll); });",
        errors: [
          {
            messageId: 'debugModeProduction',
            suggestions: [
              {
                messageId: 'suggestionGateOnNodeEnv',
                output:
                  "mongoose.set('debug', process.env.NODE_ENV !== 'production' && (function (coll) { log(coll); }));",
              },
            ],
          },
        ],
      },
      {
        name: 'the callback in the options-object form',
        code: 'mongoose.set({ debug: (coll) => log(coll) });',
        errors: [
          {
            messageId: 'debugModeProduction',
            suggestions: [
              {
                messageId: 'suggestionGateOnNodeEnv',
                output:
                  "mongoose.set({ debug: process.env.NODE_ENV !== 'production' && ((coll) => log(coll)) });",
              },
            ],
          },
        ],
      },
    ]),
  },
);
