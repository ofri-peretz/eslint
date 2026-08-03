import { RuleTester } from '@typescript-eslint/rule-tester';
import { requireValidationPipeWhitelist } from './index';

const ruleTester = new RuleTester();

ruleTester.run(
  'require-validation-pipe-whitelist',
  requireValidationPipeWhitelist,
  {
    valid: [
      // The fix.
      `app.useGlobalPipes(new ValidationPipe({ whitelist: true }));`,
      `app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));`,
      // Quoted keys are the same key.
      `new ValidationPipe({ 'whitelist': true });`,
      // Options defined elsewhere — this file cannot prove whitelist is absent.
      // brocoders-bp does exactly this: `new ValidationPipe(validationOptions)`.
      `app.useGlobalPipes(new ValidationPipe(validationOptions));`,
      // A spread may define whitelist. nest's own ParseArrayPipe does this.
      `new ValidationPipe({ transform: true, ...options });`,
      // A computed key could be 'whitelist'.
      `new ValidationPipe({ [key]: true });`,
      // Config-driven is a decision we cannot evaluate, not an omission.
      `new ValidationPipe({ whitelist: isProduction });`,
      `new ValidationPipe({ whitelist: config.strict });`,
      // A different ValidationPipe entirely.
      {
        code: `
        import { ValidationPipe } from 'sequelize-typescript';
        new ValidationPipe();
      `,
      },
      // Not a ValidationPipe.
      `new ParseIntPipe();`,
      `new ValidationPipe.Other();`,
      // Test files are exempt by default.
      {
        code: `new ValidationPipe();`,
        filename: 'app.e2e-spec.ts',
      },
    ],
    invalid: [
      // realworld, twenty, prisma-starter: `new ValidationPipe()` with no options.
      {
        code: `app.useGlobalPipes(new ValidationPipe());`,
        errors: [{ messageId: 'missingWhitelist' }],
      },
      // awesome-nest-bp: transform without whitelist.
      {
        code: `
        @Controller('users')
        class UsersController {
          @Get()
          getUsers(@Query(new ValidationPipe({ transform: true })) dto: PageOptionsDto) {}
        }
      `,
        errors: [{ messageId: 'missingWhitelist' }],
      },
      // amplication / novu: options set, whitelist not among them.
      {
        code: `new ValidationPipe({ transform: true, forbidUnknownValues: false });`,
        errors: [{ messageId: 'missingWhitelist' }],
      },
      // Explicitly turned off.
      {
        code: `new ValidationPipe({ whitelist: false });`,
        errors: [{ messageId: 'missingWhitelist' }],
      },
      // forbidNonWhitelisted does nothing on its own — different advice.
      {
        code: `new ValidationPipe({ forbidNonWhitelisted: true });`,
        errors: [{ messageId: 'inertForbidNonWhitelisted' }],
      },
      // Imported from @nestjs/common, as it normally is.
      {
        code: `
        import { ValidationPipe } from '@nestjs/common';
        app.useGlobalPipes(new ValidationPipe());
      `,
        errors: [{ messageId: 'missingWhitelist' }],
      },
      // Test files are only exempt while the option says so.
      {
        code: `new ValidationPipe();`,
        filename: 'app.e2e-spec.ts',
        options: [{ allowInTests: false }],
        errors: [{ messageId: 'missingWhitelist' }],
      },
    ],
  },
);
