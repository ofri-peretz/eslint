import { RuleTester } from '@typescript-eslint/rule-tester';
import { requireThrottler } from './index';

const ruleTester = new RuleTester();

ruleTester.run('require-throttler', requireThrottler, {
  valid: [
    // ========== VALID: Controller with class-level @Throttle ==========
    {
      code: `
        @Controller('users')
        @Throttle({ default: { limit: 10, ttl: 60 }})
        class UsersController {
          @Get()
          findAll() {}
        }
      `,
    },
    // ========== VALID: Controller with method-level @Throttle ==========
    {
      code: `
        @Controller('users')
        class UsersController {
          @Get()
          @Throttle({ default: { limit: 10, ttl: 60 }})
          findAll() {}
        }
      `,
    },
    // ========== VALID: Controller with @SkipThrottle ==========
    {
      code: `
        @Controller('health')
        class HealthController {
          @Get()
          @SkipThrottle()
          check() {}
        }
      `,
    },
    // ========== VALID: Controller with ThrottlerGuard ==========
    {
      code: `
        @Controller('users')
        @UseGuards(ThrottlerGuard)
        class UsersController {
          @Get()
          findAll() {}
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
    // ========== VALID: assumeGlobalThrottler option ==========
    {
      code: `
        @Controller('users')
        class UsersController {
          @Get()
          findAll() {}
        }
      `,
      options: [{ assumeGlobalThrottler: true }],
    },
    // ========== VALID: @Throttle without parentheses (bare decorator) ==========
    {
      code: `
        @Controller('users')
        @Throttle
        class UsersController {
          @Get()
          findAll() {}
        }
      `,
    },
    // ========== VALID: Method-level ThrottlerGuard ==========
    {
      code: `
        @Controller('auth')
        class AuthController {
          @Post('login')
          @UseGuards(ThrottlerGuard)
          login() {}
        }
      `,
    },
  ],
  invalid: [
    // ========== INVALID: Controller without throttling ==========
    {
      code: `
        @Controller('users')
        class UsersController {
          @Get()
          findAll() {}
        }
      `,
      errors: [{ messageId: 'missingThrottler' }],
    },
    // ========== INVALID: Multiple routes without throttling ==========
    {
      code: `
        @Controller('auth')
        class AuthController {
          @Post('login')
          login() {}
          @Post('register')
          register() {}
        }
      `,
      errors: [{ messageId: 'missingThrottler' }, { messageId: 'missingThrottler' }],
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
      errors: [{ messageId: 'missingThrottler' }],
    },
  ],
});
