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
