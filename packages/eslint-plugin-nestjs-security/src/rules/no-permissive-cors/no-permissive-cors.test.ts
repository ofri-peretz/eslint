/**
 * @fileoverview Tests for no-permissive-cors
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { noPermissiveCors } from './index';

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

ruleTester.run('no-permissive-cors', noPermissiveCors, {
  valid: [
    // Development-scoped: named directly, or by negating production.
    `
      if (process.env.NODE_ENV !== 'production') {
        app.enableCors({ origin: '*', credentials: true });
      }
    `,
    `
      if (process.env.NODE_ENV === 'development') {
        app.enableCors({ origin: '*', credentials: true });
      }
    `,
    `
      if (isDev) {
        app.enableCors({ origin: '*', credentials: true });
      }
    `,
    `
      if (!isProduction) {
        app.enableCors({ origin: '*', credentials: true });
      }
    `,
    // truthy/src/main.ts: a permissive origin fenced behind a development
    // check cannot reach production. Reporting it at the same CVSS 8.1 as an
    // unconditional one is what makes a security rule read as noise.
    `
      if (process.env.NODE_ENV === 'development') {
        app.enableCors({ origin: true, credentials: true });
      }
    `,
    `
      if (isDevelopment) {
        app.enableCors({ origin: '*' });
      }
    `,
    `
      if (config.get('NODE_ENV') !== 'production') {
        app.enableCors();
      }
    `,
    // The ternary and short-circuit spellings of the same fence.
    `isDevelopment ? app.enableCors({ origin: '*' }) : undefined;`,
    `isDev && app.enableCors({ origin: true, credentials: true });`,
    // And the NestFactory entry point behind the same fence.
    `
      if (process.env.NODE_ENV !== 'production') {
        const app = await NestFactory.create(AppModule, { cors: true });
      }
    `,

    // No `cors` key at all — CORS is off, which is the secure default.
    `const app = await NestFactory.create(AppModule);`,
    `const app = await NestFactory.create(AppModule, { bufferLogs: true });`,
    `const app = await NestFactory.create(AppModule, { cors: false });`,
    // awesome-nest-bp: a real allow-list built from config.
    `
      const app = await NestFactory.create(AppModule, {
        cors: { origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'] },
      });
    `,
    // A spread could supply `origin`; cannot prove.
    `const app = await NestFactory.create(AppModule, { cors: { ...corsOpts } });`,
    // A spread at the top level could supply `cors` itself.
    `const app = await NestFactory.create(AppModule, { ...bootstrapOptions });`,
    // A non-literal cors value is unknowable.
    `const app = await NestFactory.create(AppModule, { cors: corsEnabled });`,
    // Options passed as an identifier — nothing to enumerate.
    `const app = await NestFactory.create(AppModule, bootstrapOptions);`,
    // A microservice has no HTTP surface and no cors option.
    `const app = await NestFactory.createMicroservice(AppModule, { transport: Transport.TCP });`,
    // A bare call, and a non-NestFactory receiver.
    `const app = await NestFactory.create(AppModule, {});`,
    `const x = await Other.create(AppModule, { cors: true });`,

    // `['*']` is not a wildcard. cors compares each array element with
    // `origin === allowedOrigin`, and no browser sends `Origin: *`, so this
    // list matches nothing — it denies every cross-origin request rather than
    // allowing them. Locked as valid because reporting it was a real false
    // positive in an error-level rule.
    `app.enableCors({ origin: ['*'] });`,
    `app.enableCors({ origin: ['*', 'https://trusted.com'] });`,
    // A genuine allowlist stays quiet.
    `app.enableCors({ origin: ['https://app.example.com', 'https://admin.example.com'] });`,
    // An empty list denies everything — restrictive, not permissive.
    `app.enableCors({ origin: [] });`,

    // Explicit allowlist — the shape we want people to reach for.
    { code: `app.enableCors({ origin: ['https://app.example.com'] });` },
    { code: `app.enableCors({ origin: 'https://app.example.com' });` },
    // Explicitly disabled.
    { code: `app.enableCors({ origin: false });` },
    // Not statically knowable — a config lookup is what a correct app does.
    { code: `app.enableCors({ origin: configService.get('cors.origin') });` },
    { code: `app.enableCors({ origin: process.env.CORS_ORIGIN });` },
    // Callback form: the decision happens at request time.
    {
      code: `app.enableCors({ origin: (o, cb) => cb(null, allowed.includes(o)) });`,
    },
    // Regex allowlist.
    { code: `app.enableCors({ origin: /\\.example\\.com$/ });` },
    // Imported options object — not resolvable here, so not our call to make.
    {
      code: `import { corsOptions } from './cors'; app.enableCors(corsOptions);`,
    },
    // A locally-declared object that is correctly configured.
    {
      code: `const corsOptions = { origin: ['https://app.example.com'] }; app.enableCors(corsOptions);`,
    },
    // Unrelated method that happens to be called enableCors on nothing NestJS-ish
    // still reports only when it is a member call — a bare call is not matched.
    { code: `enableCors();` },
    // Test files are exempt by default.
    {
      code: `app.enableCors();`,
      filename: 'app.e2e-spec.ts',
    },
  ],
  invalid: [
    // The documented Fastify spelling puts the options object third, so
    // reading `arguments[1]` found the adapter and gave up.
    {
      code: `
        const app = await NestFactory.create(AppModule, new FastifyAdapter(), {
          cors: { origin: '*', credentials: true },
        });
      `,
      errors: [{ messageId: 'wildcardOrigin' }],
    },
    // The worst case there is, and it mentions the environment — so testing
    // only for an environment word suppressed it.
    {
      code: `
        if (process.env.NODE_ENV === 'production') {
          app.enableCors({ origin: '*', credentials: true });
        }
      `,
      errors: [{ messageId: 'wildcardOrigin' }],
    },
    {
      code: `
        if (isProd) {
          app.enableCors({ origin: '*', credentials: true });
        }
      `,
      errors: [{ messageId: 'wildcardOrigin' }],
    },
    // An environment we cannot classify is not an excuse. `qa` may well be
    // internet-facing, and the rule has no way to know it is not.
    {
      code: `
        if (process.env.APP_ENV === 'qa') {
          app.enableCors({ origin: '*', credentials: true });
        }
      `,
      errors: [{ messageId: 'wildcardOrigin' }],
    },
    // A dev word read backwards is a production gate.
    {
      code: `
        if (process.env.NODE_ENV !== 'development') {
          app.enableCors({ origin: '*', credentials: true });
        }
      `,
      errors: [{ messageId: 'wildcardOrigin' }],
    },
    // A condition that is not about the environment proves nothing about
    // production — this still reaches real users.
    {
      code: `
        if (req.path.startsWith('/public')) {
          app.enableCors({ origin: '*' });
        }
      `,
      errors: [{ messageId: 'wildcardOrigin' }],
    },

    // NestFactory.create's `cors` option routes into the very same code path:
    // nest-application.ts turns a non-object `cors` into a bare enableCors(),
    // so `{ cors: true }` IS `Access-Control-Allow-Origin: *`.
    {
      code: `const app = await NestFactory.create(AppModule, { cors: true });`,
      errors: [{ messageId: 'defaultOrigin' }],
    },
    // A cors options object with no `origin` — the cors package defaults to '*'.
    {
      code: `
        const app = await NestFactory.create<NestExpressApplication>(AppModule, {
          cors: { exposedHeaders: ['WWW-Authenticate'] },
        });
      `,
      errors: [{ messageId: 'defaultOrigin' }],
    },
    {
      code: `const app = await NestFactory.create(AppModule, { cors: { origin: '*' } });`,
      errors: [{ messageId: 'wildcardOrigin' }],
    },
    {
      code: `const app = await NestFactory.create(AppModule, { cors: { origin: true } });`,
      errors: [{ messageId: 'reflectedOrigin' }],
    },

    // Bare call — defaults to '*'.
    {
      code: `app.enableCors();`,
      errors: [{ messageId: 'defaultOrigin' }],
    },
    // Options object that never mentions origin — same default applies.
    {
      code: `app.enableCors({ credentials: true });`,
      errors: [{ messageId: 'defaultOrigin' }],
    },
    // Explicit wildcard.
    {
      code: `app.enableCors({ origin: '*' });`,
      errors: [{ messageId: 'wildcardOrigin' }],
    },
    // Reflected origin — the dangerous one, because it survives credentials: true.
    {
      code: `app.enableCors({ origin: true });`,
      errors: [{ messageId: 'reflectedOrigin' }],
    },
    {
      code: `app.enableCors({ origin: true, credentials: true });`,
      errors: [{ messageId: 'reflectedOrigin' }],
    },
    // Quoted key.
    {
      code: `app.enableCors({ 'origin': '*' });`,
      errors: [{ messageId: 'wildcardOrigin' }],
    },
    // Locally-declared options object that is wrong.
    {
      code: `const corsOptions = { origin: true }; app.enableCors(corsOptions);`,
      errors: [{ messageId: 'reflectedOrigin' }],
    },
    // The exact shape found in squareboat/nestjs-boilerplate.
    {
      code: `
        const app = await NestFactory.create(AppModule);
        app.enableCors({ origin: true });
      `,
      errors: [{ messageId: 'reflectedOrigin' }],
    },
    // The exact shape found in notiz-dev/nestjs-prisma-starter.
    {
      code: `
        if (corsEnabled) {
          app.enableCors();
        }
      `,
      errors: [{ messageId: 'defaultOrigin' }],
    },
    // Not exempt when the option is off.
    {
      code: `app.enableCors();`,
      filename: 'app.e2e-spec.ts',
      options: [{ allowInTests: false }],
      errors: [{ messageId: 'defaultOrigin' }],
    },
  ],
});

// ─────────────────────────────────────────────────────────────────────────────
// Coverage-gap fixtures: identifier resolution and non-static keys.
// Every entry here is a shape the rule must stay QUIET on — the resolution
// helper returning null is the safe answer, not a missed finding.
// ─────────────────────────────────────────────────────────────────────────────
ruleTester.run('no-permissive-cors (coverage gaps)', noPermissiveCors, {
  valid: [
    // Callee is a member expression whose property is computed, not `enableCors`.
    { code: `app['enableCors']();` },
    // Callee is not a member expression at all.
    { code: `enableCors({ origin: true });` },
    // Identifier never declared anywhere — scope walk exhausts, returns null.
    { code: `app.enableCors(undeclaredOptions);` },
    // Declared, but not as a variable (function binding) — def is skipped.
    { code: `function corsOptions() {} app.enableCors(corsOptions);` },
    // Declared with no initialiser.
    { code: `let corsOptions; app.enableCors(corsOptions);` },
    // Declared from a call — not an object literal, so not resolvable.
    { code: `const corsOptions = buildCors(); app.enableCors(corsOptions);` },
    // Argument is neither an object literal nor an identifier.
    { code: `app.enableCors(buildCors());` },
    { code: `app.enableCors(config.cors);` },
    // Non-string literal key.
    { code: `app.enableCors({ 0: '*', origin: ['https://a.example'] });` },
    // Spread element in the options object is not a Property node.
    { code: `app.enableCors({ ...base, origin: ['https://a.example'] });` },
    // Spread and no visible origin — `base` may carry it, so stay quiet.
    { code: `app.enableCors({ ...baseCors, credentials: true });` },
    // Origin present but a template literal — not statically decided here.
    { code: 'app.enableCors({ origin: `https://${host}` });' },
    // Reassigned before use: the declaration's value is not the value at the
    // call site, so resolving the initialiser would be a false positive.
    {
      code: `
        let corsOptions = { origin: '*' };
        corsOptions = { origin: 'https://app.example.com' };
        app.enableCors(corsOptions);
      `,
    },
    // Reassigned the other way — a false negative we accept rather than guess.
    {
      code: `
        let corsOptions = { origin: ['https://app.example.com'] };
        corsOptions = { origin: '*' };
        app.enableCors(corsOptions);
      `,
    },
  ],
  invalid: [
    // Computed key: `origin` is not provably set and there is no spread to
    // explain it, so the CORS default of '*' applies either way.
    {
      code: `app.enableCors({ [originKey]: '*' });`,
      errors: [{ messageId: 'defaultOrigin' }],
    },
    // Resolution across scopes: declared at module level, used inside a function
    // — exercises the `continue` to the upper scope.
    {
      code: `
        const corsOptions = { origin: '*' };
        async function bootstrap() {
          app.enableCors(corsOptions);
        }
      `,
      errors: [{ messageId: 'wildcardOrigin' }],
    },
  ],
});

// A computed key named `origin` is a variable reference, not the property.
// Reading it as the literal key would let `{ [origin]: 'https://ok' }` masquerade
// as a configured allowlist and silence the default-'*' report.
ruleTester.run(
  'no-permissive-cors (computed key collision)',
  noPermissiveCors,
  {
    valid: [],
    invalid: [
      {
        code: `
        const origin = 'credentials';
        app.enableCors({ [origin]: true });
      `,
        errors: [{ messageId: 'defaultOrigin' }],
      },
    ],
  },
);
