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
    // nest-framework/packages/core/nest-application.ts:130 — NestJS's own
    // implementation of the API this rule watches. An application holds the
    // app in a binding; a `this` receiver means the class *is* the app.
    `
      class NestApplication {
        enableCorsFromOptions() {
          if (!passCustomOptions) {
            return this.enableCors();
          }
          return this.enableCors(this.appOptions.cors);
        }
      }
    `,
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

/**
 * A CORS config declared in one file and used in another.
 *
 * `resolveLocalObject` only resolves same-file bindings, so an exported config
 * consumed by a different app was invisible to every branch of this rule. The
 * annotation is what makes the object provably a CORS config without leaving
 * the file — the name is not evidence, the import it resolves to is.
 */
ruleTester.run('no-permissive-cors (annotated declaration)', noPermissiveCors, {
  valid: [
    // The allowlist form. This is the fix ultimate-backend should apply, and it
    // is already written 7 lines below the defect in their own file.
    `
      import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
      const whitelist = ['https://app.example.com'];
      export const corsOptions: CorsOptions = { origin: whitelist, credentials: true };
    `,
    // Unannotated: an object with an `origin` key is not a CORS config. Config
    // objects, test fixtures and HTTP client options all have one. Without the
    // annotation there is no evidence, and guessing is how this rule would
    // earn a reputation for noise.
    `export const corsOptions = { origin: true, credentials: true };`,
    // A different annotation from the same module. Plenty of NestJS option
    // objects carry an `origin` key without being CORS configuration; the type
    // name is what narrows this, and it has to be checked.
    `
      import { HttpModuleOptions } from '@nestjs/common';
      export const opts: HttpModuleOptions = { origin: true };
    `,
    // A deeper qualification names a type nested inside a namespace, which no
    // import statement introduces as a binding. There is nothing to resolve.
    `
      import * as a from '@nestjs/common';
      export const corsOptions: a.b.CorsOptions = { origin: true };
    `,
    // A locally-declared `CorsOptions` resolves to no import, so the name alone
    // proves nothing — classify by AST fact, not by spelling.
    `
      interface CorsOptions { origin: unknown }
      export const corsOptions: CorsOptions = { origin: true };
    `,
    // Namespace import, allowlist form — exercises the qualified type name.
    `
      import * as common from '@nestjs/common';
      export const corsOptions: common.CorsOptions = { origin: ['https://a.example'] };
    `,
    // The inverse of the alias case: a local binding *named* CorsOptions that
    // was imported from something else entirely. Resolving the alias must read
    // the imported name, not re-admit the local spelling as evidence.
    `
      import { HttpOptions as CorsOptions } from '@nestjs/common';
      export const corsOptions: CorsOptions = { origin: '*' };
    `,
    // Development-scoped declarations are excused for the same reason calls are.
    `
      import { CorsOptions } from '@nestjs/common';
      if (process.env.NODE_ENV !== 'production') {
        const corsOptions: CorsOptions = { origin: true };
      }
    `,
  ],
  invalid: [
    // The ultimate-backend shape, reduced. Reflected origin + credentials.
    {
      code: `
        import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
        export const corsOptions: CorsOptions = { origin: true, credentials: true };
      `,
      errors: [{ messageId: 'reflectedOrigin' }],
    },
    // The `cors` package exports the same interface; @nestjs/common re-exports it.
    {
      code: `
        import { CorsOptions } from 'cors';
        export const corsOptions: CorsOptions = { origin: '*' };
      `,
      errors: [{ messageId: 'wildcardOrigin' }],
    },
    // Namespace import — `common.CorsOptions` resolves through the namespace
    // binding, the same way `@common.Get()` does for the decorator rules.
    {
      code: `
        import * as common from '@nestjs/common';
        export const corsOptions: common.CorsOptions = { origin: true };
      `,
      errors: [{ messageId: 'reflectedOrigin' }],
    },
    // Aliased import: the local binding is `Opts`, but it still names the
    // imported `CorsOptions`. Matching the local spelling missed this — the
    // alias is exactly the case where name and evidence come apart.
    {
      code: `
        import { CorsOptions as Opts } from '@nestjs/common';
        export const corsOptions: Opts = { origin: '*' };
      `,
      errors: [{ messageId: 'wildcardOrigin' }],
    },
    // Same, via `import type` — the specifier shape is identical, and a
    // type-only import is the spelling the compiler prefers for an annotation.
    {
      code: `
        import type { CorsOptions as Opts } from 'cors';
        export const corsOptions: Opts = { origin: true, credentials: true };
      `,
      errors: [{ messageId: 'reflectedOrigin' }],
    },
    // No `origin` key at all: the cors default is '*'.
    {
      code: `
        import { CorsOptions } from '@nestjs/common';
        export const corsOptions: CorsOptions = { methods: ['GET'] };
      `,
      errors: [{ messageId: 'defaultOrigin' }],
    },
    // Declared *and* used in the same file: reported once, at the declaration,
    // because that is where the edit goes. Two reports for one defect is how a
    // rule reads as noisy even when it is right.
    {
      code: `
        import { CorsOptions } from '@nestjs/common';
        const corsOptions: CorsOptions = { origin: true };
        app.enableCors(corsOptions);
      `,
      errors: [{ messageId: 'reflectedOrigin' }],
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
