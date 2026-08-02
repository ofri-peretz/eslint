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
    // Explicit allowlist — the shape we want people to reach for.
    { code: `app.enableCors({ origin: ['https://app.example.com'] });` },
    { code: `app.enableCors({ origin: 'https://app.example.com' });` },
    // Explicitly disabled.
    { code: `app.enableCors({ origin: false });` },
    // Not statically knowable — a config lookup is what a correct app does.
    { code: `app.enableCors({ origin: configService.get('cors.origin') });` },
    { code: `app.enableCors({ origin: process.env.CORS_ORIGIN });` },
    // Callback form: the decision happens at request time.
    { code: `app.enableCors({ origin: (o, cb) => cb(null, allowed.includes(o)) });` },
    // Regex allowlist.
    { code: `app.enableCors({ origin: /\\.example\\.com$/ });` },
    // Imported options object — not resolvable here, so not our call to make.
    { code: `import { corsOptions } from './cors'; app.enableCors(corsOptions);` },
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
