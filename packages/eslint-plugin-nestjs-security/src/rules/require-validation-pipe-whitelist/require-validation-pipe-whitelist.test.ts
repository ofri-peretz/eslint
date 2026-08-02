/**
 * @fileoverview Tests for require-validation-pipe-whitelist
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { requireValidationPipeWhitelist } from './index';

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

ruleTester.run('require-validation-pipe-whitelist', requireValidationPipeWhitelist, {
  valid: [
    { code: `app.useGlobalPipes(new ValidationPipe({ whitelist: true }));` },
    { code: `app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));` },
    {
      code: `app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));`,
    },
    // Quoted key still counts.
    { code: `new ValidationPipe({ 'whitelist': true });` },
    // Locally-declared options object that is correct.
    {
      code: `const opts = { whitelist: true }; app.useGlobalPipes(new ValidationPipe(opts));`,
    },
    // Imported options object — this is what brocoders/nestjs-boilerplate does,
    // and it sets whitelist correctly. Not resolvable here, so not reported.
    {
      code: `import validationOptions from './utils/validation-options'; app.useGlobalPipes(new ValidationPipe(validationOptions));`,
    },
    // A spread could supply whitelist — don't guess.
    { code: `new ValidationPipe({ ...base, transform: true });` },
    // Unrelated constructor.
    { code: `new ParseIntPipe();` },
    // Test files exempt by default.
    { code: `new ValidationPipe();`, filename: 'app.e2e-spec.ts' },
  ],
  invalid: [
    // The shape in notiz-dev/nestjs-prisma-starter and squareboat/nestjs-boilerplate.
    {
      code: `app.useGlobalPipes(new ValidationPipe());`,
      errors: [{ messageId: 'missingWhitelist' }],
    },
    // The shape in lujakob/nestjs-realworld-example-app, per route.
    {
      code: `
        class UserController {
          @UsePipes(new ValidationPipe())
          async create(@Body('user') userData) {}
        }
      `,
      errors: [{ messageId: 'missingWhitelist' }],
    },
    // Options present but whitelist absent — validation runs, nothing is stripped.
    {
      code: `new ValidationPipe({ transform: true });`,
      errors: [{ messageId: 'missingWhitelist' }],
    },
    // whitelist explicitly disabled.
    {
      code: `new ValidationPipe({ whitelist: false });`,
      errors: [{ messageId: 'missingWhitelist' }],
    },
    // Non-literal value isn't a guarantee.
    {
      code: `new ValidationPipe({ whitelist: isProd });`,
      errors: [{ messageId: 'missingWhitelist' }],
    },
    // Locally-declared options object that is wrong.
    {
      code: `const opts = { transform: true }; app.useGlobalPipes(new ValidationPipe(opts));`,
      errors: [{ messageId: 'missingWhitelist' }],
    },
    // Opt-in strictness: whitelist alone is no longer enough.
    {
      code: `new ValidationPipe({ whitelist: true });`,
      options: [{ requireForbidNonWhitelisted: true }],
      errors: [{ messageId: 'missingWhitelist' }],
    },
    {
      code: `new ValidationPipe();`,
      filename: 'app.e2e-spec.ts',
      options: [{ allowInTests: false }],
      errors: [{ messageId: 'missingWhitelist' }],
    },
  ],
});

// ─────────────────────────────────────────────────────────────────────────────
// Coverage-gap fixtures: identifier resolution and non-static keys.
// These are all shapes the rule must stay QUIET on.
// ─────────────────────────────────────────────────────────────────────────────
ruleTester.run('require-validation-pipe-whitelist (coverage gaps)', requireValidationPipeWhitelist, {
  valid: [
    // Namespaced constructor — callee is a member expression, not an Identifier.
    { code: `new nest.ValidationPipe();` },
    // Identifier never declared — scope walk exhausts.
    { code: `new ValidationPipe(undeclaredOptions);` },
    // Declared, but not as a variable.
    { code: `function opts() {} new ValidationPipe(opts);` },
    // Declared with no initialiser.
    { code: `let opts; new ValidationPipe(opts);` },
    // Built by a call — not statically an object.
    { code: `const opts = buildOptions(); new ValidationPipe(opts);` },
    // Argument is neither an object literal nor an identifier.
    { code: `new ValidationPipe(buildOptions());` },
    { code: `new ValidationPipe(config.validation);` },
    // Computed key — cannot be read as `whitelist`, and a spread-free object
    // with an unknown key is still unknown, so stay quiet is wrong here…
    // (see invalid below: this one DOES report, kept out of valid deliberately)
  ],
  invalid: [
    // Computed key: `whitelist` is not provably set, and there is no spread to
    // explain it away, so the rule reports.
    {
      code: `new ValidationPipe({ [key]: true });`,
      errors: [{ messageId: 'missingWhitelist' }],
    },
    // Non-string literal key, same reasoning.
    {
      code: `new ValidationPipe({ 0: true });`,
      errors: [{ messageId: 'missingWhitelist' }],
    },
    // Resolution across scopes.
    {
      code: `
        const opts = { transform: true };
        async function bootstrap() {
          app.useGlobalPipes(new ValidationPipe(opts));
        }
      `,
      errors: [{ messageId: 'missingWhitelist' }],
    },
  ],
});
