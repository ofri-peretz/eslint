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
    // ========== VALID: project auth decorator on the method ==========
    // Measured on real repos: immich uses @Authenticated({ permission }),
    // awesome-nest-boilerplate uses @Auth([RoleType.USER]). Treating only
    // @UseGuards as protection reported every one of those guarded routes.
    {
      code: `
        @Controller('admin/auth')
        class AuthAdminController {
          @Post('unlink-all')
          @Authenticated({ permission: Permission.AdminAuthUnlinkAll })
          unlinkAll() {}
        }
      `,
    },
    // ========== VALID: project auth decorator on the class ==========
    {
      code: `
        @Controller('users')
        @Auth([RoleType.USER])
        class UsersController {
          @Get()
          findAll() {}
        }
      `,
    },
    // ========== VALID: custom name via authDecorators ==========
    {
      code: `
        @Controller('users')
        class UsersController {
          @Get()
          @NeedsSession()
          findAll() {}
        }
      `,
      options: [{ authDecorators: ['NeedsSession'] }],
    },
    // ========== VALID: authentication entry points are public by design ==========
    // Requiring a guard on POST /auth/login is incoherent — nobody can log in
    // if logging in requires being logged in. Brute-force exposure on these is
    // covered by require-throttler, which targets the same set.
    {
      code: `
        @Controller('auth')
        class AuthController {
          @Post('login')
          login() {}
          @Post('register')
          register() {}
          @Post('refresh')
          refresh() {}
        }
      `,
    },
    // ========== VALID: the controller prefix can carry the public segment =====
    {
      code: `
        @Controller('webhooks')
        class WebhooksController {
          @Post('stripe')
          stripe() {}
        }
      `,
    },
    // ========== VALID: object form with a nested path and a non-path key =====
    {
      code: `
        @Controller({ version: '1', path: 'auth/login' })
        class AuthController {
          @Post()
          handler() {}
        }
      `,
    },
    // ========== VALID: object form with computed / non-literal members =======
    {
      code: `
        @Controller({ [key]: 'x', path: 404, version: '1' })
        @UseGuards(AuthGuard)
        class ThingController {
          @Get()
          handler() {}
        }
      `,
    },
    // ========== VALID: @Controller({ path }) options form (versioned APIs) ====
    {
      code: `
        @Controller({ path: 'auth', version: '1' })
        class AuthController {
          @Post('login')
          login() {}
        }
      `,
    },
    // ========== VALID: @nestjs/terminus health probe ==========
    {
      code: `
        @Controller('health')
        class HealthCheckerController {
          @Get()
          @HealthCheck()
          check() {}
        }
      `,
    },
    // ========== VALID: handler name alone can mark it public ==========
    {
      code: `
        @Controller('account')
        class AccountController {
          @Post()
          login() {}
        }
      `,
    },
    // ========== VALID: class-level @Public exempts every route ==========
    {
      code: `
        @Controller('health')
        @Public()
        class HealthController {
          @Get()
          check() {}
        }
      `,
    },
    // ========== VALID: guards inherited from a base class in the same file ==========
    {
      code: `
        @UseGuards(AuthGuard)
        abstract class BaseController {}

        @Controller('users')
        class UsersController extends BaseController {
          @Get()
          findAll() {}
        }
      `,
    },
    // ========== VALID: passport mixin factory names the guard ==========
    {
      code: `
        @Controller('users')
        @UseGuards(AuthGuard('jwt'))
        class UsersController {
          @Get()
          findAll() {}
        }
      `,
    },
    // ========== VALID: requiredGuards satisfied ==========
    {
      code: `
        @Controller('admin')
        @UseGuards(AdminGuard)
        class AdminController {
          @Get()
          findAll() {}
        }
      `,
      options: [{ requiredGuards: ['AdminGuard'] }],
    },
    // ========== VALID: AllowAnonymous decorator ==========
    {
      code: `
        @Controller('public')
        class PublicController {
          @Get()
          @AllowAnonymous()
          getPublic() {}
        }
      `,
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

    // ---------------------------------------------------------------------
    // Regression locks. Each of these was silently accepted before the
    // shared-AST refactor; they must stay reported.
    // ---------------------------------------------------------------------

    // FN-1: namespace-imported decorators (`import * as common`).
    {
      code: `
        @common.Controller('users')
        class UsersController {
          @common.Get()
          findAll() {}
        }
      `,
      errors: [{ messageId: 'missingGuards' }],
    },
    // FN-2: a class declared inside a handler must not disable later handlers.
    {
      code: `
        @Controller('users')
        class UsersController {
          @Get('one')
          one() { class Helper {} return new Helper(); }
          @Get('two')
          two() {}
        }
      `,
      errors: [{ messageId: 'missingGuards' }, { messageId: 'missingGuards' }],
    },
    // FN-3: an underscore-prefixed name is still a route if it is decorated.
    {
      code: `
        @Controller('users')
        class UsersController {
          @Get('secret')
          _getSecret() {}
        }
      `,
      errors: [{ messageId: 'missingGuards' }],
    },
    // FN-4: `@UseGuards()` naming no guard enforces nothing.
    {
      code: `
        @Controller('users')
        @UseGuards()
        class UsersController {
          @Get()
          findAll() {}
        }
      `,
      errors: [{ messageId: 'emptyGuards' }],
    },
    // FN-4: the bare (uninvoked) form likewise names no guard.
    {
      code: `
        @Controller('users')
        @UseGuards
        class UsersController {
          @Get()
          findAll() {}
        }
      `,
      errors: [{ messageId: 'emptyGuards' }],
    },
    // W4: `requiredGuards` was declared in the schema but never read.
    {
      code: `
        @Controller('users')
        @UseGuards(SomeRandomGuard)
        class UsersController {
          @Get()
          findAll() {}
        }
      `,
      options: [{ requiredGuards: ['AdminGuard'] }],
      errors: [{ messageId: 'missingRequiredGuard' }],
    },
    // A custom publicRoutes list replaces the default one, so `login` is no
    // longer exempt and an unlisted name is.
    {
      code: `
        @Controller('auth')
        class AuthController {
          @Post('login')
          login() {}
        }
      `,
      options: [{ publicRoutes: ['status'] }],
      errors: [{ messageId: 'missingGuards' }],
    },
    // Non-literal and non-string path arguments yield no segments to match.
    {
      code: `
        @Controller(ADMIN_PREFIX)
        class AdminController {
          @Get(ROUTE)
          handler() {}
        }
      `,
      errors: [{ messageId: 'missingGuards' }],
    },
    {
      code: `
        @Controller(42)
        class AdminController {
          @Get()
          handler() {}
        }
      `,
      errors: [{ messageId: 'missingGuards' }],
    },
    // A private route that merely *contains* a public word is still private:
    // matching is per path segment, not substring.
    {
      code: `
        @Controller('admin')
        class AdminController {
          @Get('login-attempts')
          loginAttempts() {}
        }
      `,
      errors: [{ messageId: 'missingGuards' }],
    },
    // Base class lives in another file: nothing to inherit, still report.
    {
      code: `
        @Controller('users')
        class UsersController extends ImportedBase {
          @Get()
          findAll() {}
        }
      `,
      errors: [{ messageId: 'missingGuards' }],
    },
    // Cyclic `extends` must terminate rather than spin.
    {
      code: `
        @Controller('a')
        class A extends B {
          @Get()
          findAll() {}
        }
        class B extends A {}
      `,
      errors: [{ messageId: 'missingGuards' }],
    },
    // Anonymous class expression: registers no name, still analysed.
    {
      code: `
        export default @Controller('u') class {
          @Get()
          findAll() {}
        };
      `,
      errors: [{ messageId: 'missingGuards' }],
    },
    // Computed member key has no static name.
    {
      code: `
        @Controller('u')
        class UsersController {
          @Get()
          [handlerName]() {}
        }
      `,
      errors: [{ messageId: 'missingGuards' }],
    },
  ],
});
