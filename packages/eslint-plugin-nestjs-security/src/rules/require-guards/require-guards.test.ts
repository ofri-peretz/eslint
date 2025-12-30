import { RuleTester } from '@typescript-eslint/rule-tester';
import { requireGuards } from './index';

const ruleTester = new RuleTester();

ruleTester.run('require-guards', requireGuards, {
  valid: [
    // ========== VALID: Controller with class-level guards ==========
    {
      code: `
        @Controller('users')
        @UseGuards(AuthGuard)
        class UsersController {
          @Get()
          findAll() {}
        }
      `,
    },
    // ========== VALID: Controller with method-level guards ==========
    {
      code: `
        @Controller('users')
        class UsersController {
          @Get()
          @UseGuards(AuthGuard)
          findAll() {}
        }
      `,
    },
    // ========== VALID: Public endpoint (with @Public decorator) ==========
    {
      code: `
        @Controller('auth')
        class AuthController {
          @Post('login')
          @Public()
          login() {}
        }
      `,
    },
    // ========== VALID: Non-controller class ==========
    {
      code: `
        class UsersService {
          findAll() {}
        }
      `,
    },
    // ========== VALID: Method without HTTP decorator ==========
    {
      code: `
        @Controller('users')
        class UsersController {
          private helper() {}
        }
      `,
    },
    // ========== VALID: SkipAuth decorator ==========
    {
      code: `
        @Controller('health')
        class HealthController {
          @Get()
          @SkipAuth()
          check() {}
        }
      `,
    },
    // ========== VALID: Test file ==========
    {
      code: `
        @Controller('users')
        class UsersController {
          @Get()
          findAll() {}
        }
      `,
      filename: 'users.controller.spec.ts',
    },
    // ========== VALID: assumeGlobalGuards option ==========
    {
      code: `
        @Controller('users')
        class UsersController {
          @Get()
          findAll() {}
        }
      `,
      options: [{ assumeGlobalGuards: true }],
    },
  ],
  invalid: [
    // ========== INVALID: Controller without guards ==========
    {
      code: `
        @Controller('users')
        class UsersController {
          @Get()
          findAll() {}
        }
      `,
      errors: [{ messageId: 'missingGuards' }],
    },
    // ========== INVALID: Multiple routes without guards ==========
    {
      code: `
        @Controller('users')
        class UsersController {
          @Get()
          findAll() {}
          @Post()
          create() {}
        }
      `,
      errors: [{ messageId: 'missingGuards' }, { messageId: 'missingGuards' }],
    },
    // ========== INVALID: Test file with allowInTests: false ==========
    {
      code: `
        @Controller('users')
        class UsersController {
          @Get()
          findAll() {}
        }
      `,
      filename: 'users.controller.spec.ts',
      options: [{ allowInTests: false }],
      errors: [{ messageId: 'missingGuards' }],
    },
  ],
});
