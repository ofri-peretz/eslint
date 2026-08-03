import { RuleTester } from '@typescript-eslint/rule-tester';
import { noPermissiveCors } from './index';

const ruleTester = new RuleTester();

ruleTester.run('no-permissive-cors', noPermissiveCors, {
  valid: [
    // novu: wildcard with no credentials. Browsers will not send cookies to a
    // wildcard origin, so this is a public API, not a vulnerability.
    `
      app.enableCors({
        origin: '*',
        preflightContinue: false,
        methods: ['GET', 'POST'],
      });
    `,
    // realworld.
    `const appOptions = { cors: true };`,
    `app.enableCors();`,
    // awesome-nest-bp: an explicit allow-list with credentials is correct.
    `
      app.enableCors({
        origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
        credentials: true,
      });
    `,
    `app.enableCors({ origin: ['https://app.example.com'], credentials: true });`,
    `app.enableCors({ origin: 'https://app.example.com', credentials: true });`,
    // novu: origin off entirely.
    `const corsOptions = { origin: false, credentials: true };`,
    // A callback is the documented way to validate against an allow-list.
    // Flagging it would punish the correct pattern.
    `app.enableCors({ origin: (o, cb) => cb(null, allowed.includes(o)), credentials: true });`,
    `app.enableCors({ origin: function (o, cb) { cb(null, true); }, credentials: true });`,
    // ultimate-backend's apollo options: a variable allow-list.
    `const corsApollOptions = { origin: whitelist, credentials: true };`,
    // Credentials not enabled, so the wildcard cannot be used with a session.
    `const corsOptions = { origin: true, credentials: false };`,
    `const corsOptions = { origin: '*', credentials: isDev };`,
    // Not CORS options at all — needs both keys.
    `const options = { origin: '*' };`,
    `const options = { credentials: true };`,
    // A spread could redefine origin.
    `const corsOptions = { origin: true, credentials: true, ...overrides };`,
    // Test files are exempt by default.
    {
      code: `const corsOptions = { origin: true, credentials: true };`,
      filename: 'cors.spec.ts',
    },
  ],
  invalid: [
    // ultimate-backend: reflect whatever origin asked, with credentials.
    {
      code: `
        export const corsOptions: CorsOptions = {
          origin: true,
          credentials: true,
          optionsSuccessStatus: 200,
        };
      `,
      errors: [{ messageId: 'credentialedWildcard', data: { origin: 'true' } }],
    },
    {
      code: `app.enableCors({ origin: '*', credentials: true });`,
      errors: [{ messageId: 'credentialedWildcard', data: { origin: "'*'" } }],
    },
    {
      code: `app.enableCors({ origin: ['*'], credentials: true });`,
      errors: [
        { messageId: 'credentialedWildcard', data: { origin: "['*']" } },
      ],
    },
    {
      code: `const app = await NestFactory.create(AppModule, { cors: { origin: '*', credentials: true } });`,
      errors: [{ messageId: 'credentialedWildcard' }],
    },
    // Quoted keys are the same keys.
    {
      code: `app.enableCors({ 'origin': true, 'credentials': true });`,
      errors: [{ messageId: 'credentialedWildcard' }],
    },
    {
      code: `const corsOptions = { origin: true, credentials: true };`,
      filename: 'cors.spec.ts',
      options: [{ allowInTests: false }],
      errors: [{ messageId: 'credentialedWildcard' }],
    },
  ],
});
