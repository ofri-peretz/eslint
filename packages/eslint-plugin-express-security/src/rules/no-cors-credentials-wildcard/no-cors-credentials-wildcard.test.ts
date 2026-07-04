import { RuleTester } from '@typescript-eslint/rule-tester';
import * as vitest from 'vitest';
import { noCorsCredentialsWildcard } from './index';

RuleTester.afterAll = vitest.afterAll;
RuleTester.it = vitest.it;
RuleTester.itOnly = vitest.it.only;
RuleTester.describe = vitest.describe;

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
});

ruleTester.run('no-cors-credentials-wildcard', noCorsCredentialsWildcard, {
  valid: [
    // Safe: explicit origin with credentials
    {
      code: `
        const corsOptions = {
          origin: 'https://trusted-domain.com',
          credentials: true
        };
        app.use(cors(corsOptions));
      `,
    },
    // Safe: origin array with credentials
    {
      code: `
        app.use(cors({
          origin: ['https://app.example.com', 'https://admin.example.com'],
          credentials: true
        }));
      `,
    },
    // Safe: wildcard origin WITHOUT credentials
    {
      code: `
        app.use(cors({
          origin: '*'
        }));
      `,
    },
    // Safe: credentials false with wildcard
    {
      code: `
        app.use(cors({
          origin: '*',
          credentials: false
        }));
      `,
    },
    // Safe: origin: true WITHOUT credentials
    {
      code: `
        cors({
          origin: true
        });
      `,
    },
    // Safe: no cors config
    {
      code: `
        app.use(helmet());
      `,
    },
  ],
  invalid: [
    // Critical: wildcard origin with credentials: true
    {
      code: `
        app.use(cors({
          origin: '*',
          credentials: true
        }));
      `,
      errors: [{ messageId: 'credentialsWildcard' }],
    },
    // Critical: origin: true with credentials: true
    {
      code: `
        app.use(cors({
          origin: true,
          credentials: true
        }));
      `,
      errors: [{ messageId: 'credentialsWildcard' }],
    },
    // Standalone cors() call with dangerous config
    {
      code: `
        const options = cors({
          origin: '*',
          credentials: true
        });
      `,
      errors: [{ messageId: 'credentialsWildcard' }],
    },
    // Double-quoted wildcard
    {
      code: `
        app.use(cors({
          origin: "*",
          credentials: true
        }));
      `,
      errors: [{ messageId: 'credentialsWildcard' }],
    },
    // Template literal wildcard
    {
      code: `
        app.use(cors({
          origin: \`*\`,
          credentials: true
        }));
      `,
      errors: [{ messageId: 'credentialsWildcard' }],
    },
  ],
});

// ---------------------------------------------------------------------------
// Coverage wave: previously untested branches (annotation-debt removal)
// ---------------------------------------------------------------------------
ruleTester.run('no-cors-credentials-wildcard (coverage wave)', noCorsCredentialsWildcard, {
  valid: [
    // cors() with no arguments — nothing to inspect
    { code: `cors();` },
    // cors(identifier) — config is not an inline object literal
    { code: `const c = cors(corsOptions);` },
    // app.use(cors(identifier)) — inner config is not an object literal
    { code: `app.use(cors(corsOptions));` },
    // allowInTests: true + test filename disables the rule entirely
    {
      code: `app.use(cors({ origin: '*', credentials: true }));`,
      options: [{ allowInTests: true }],
      filename: 'server.test.ts',
    },
    // wildcard origin without credentials — only one condition met
    { code: `app.use(cors({ origin: '*' }));` },
    // credentials without a wildcard origin
    { code: `app.use(cors({ origin: 'https://a.com', credentials: true }));` },
  ],
  invalid: [
    // allowInTests: true but NON-test filename — still reported
    {
      code: `app.use(cors({ origin: '*', credentials: true }));`,
      options: [{ allowInTests: true }],
      filename: 'server.ts',
      errors: [{ messageId: 'credentialsWildcard' }],
    },
    // origin: true (reflected origin) + credentials: true
    {
      code: `cors({ origin: true, credentials: true });`,
      errors: [{ messageId: 'credentialsWildcard' }],
    },
  ],
});
