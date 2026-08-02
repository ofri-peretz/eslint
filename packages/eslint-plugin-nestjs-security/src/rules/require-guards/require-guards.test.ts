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
    // ========== VALID: @UseGuards without parentheses (bare decorator) ==========
    {
      code: `
        @Controller('users')
        @UseGuards
        class UsersController {
          @Get()
          findAll() {}
        }
      `,
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
    // ========== REGRESSION (ack-nestjs-boilerplate, 93 findings): the whole
    // codebase protects routes with composite decorators that wrap @UseGuards
    // via applyDecorators(). A syntax-only linter cannot resolve them, so it
    // must not assert "unguarded". ==========
    {
      code: `
        @ApiTags('modules.admin.apiKey')
        @Controller({ version: '1', path: '/api-key' })
        export class ApiKeyAdminController {
          @ApiKeyAdminListDoc()
          @ResponsePaging('apiKey.list')
          @PolicyAbilityProtected({ subject: EnumPolicySubject.apiKey })
          @RoleProtected(EnumRoleType.admin)
          @UserProtected()
          @AuthJwtAccessProtected()
          @ApiKeyProtected()
          @Get('/list')
          async list() {}
        }
      `,
    },
    // ========== REGRESSION (ack): a class-level composite protects every
    // route in the controller ==========
    {
      code: `
        @Controller('users')
        @AuthJwtAccessProtected()
        export class UserSharedController {
          @Get('/profile')
          profile() {}
        }
      `,
    },
    // ========== REGRESSION (ack): member-expression decorators are equally
    // unresolvable ==========
    {
      code: `
        @Controller('users')
        class UsersController {
          @auth.protected()
          @Get()
          findAll() {}
        }
      `,
    },
    // ========== REGRESSION (brocoders, 10 findings): credential-issuing
    // routes cannot carry an auth guard. A guard on `login` is a contradiction,
    // not a finding. ==========
    {
      code: `
        @ApiTags('Auth')
        @Controller({ path: 'auth', version: '1' })
        export class AuthController {
          @Post('email/login')
          @HttpCode(HttpStatus.OK)
          @ApiOkResponse({ type: LoginResponseDto })
          public login(@Body() loginDto: AuthEmailLoginDto) {}

          @Post('email/register')
          @HttpCode(HttpStatus.NO_CONTENT)
          async register(@Body() createUserDto: AuthRegisterLoginDto) {}

          @Post('forgot/password')
          @HttpCode(HttpStatus.NO_CONTENT)
          async forgotPassword(@Body() dto: AuthForgotPasswordDto) {}

          @Post('reset/password')
          @HttpCode(HttpStatus.NO_CONTENT)
          resetPassword(@Body() dto: AuthResetPasswordDto) {}

          @Post('email/confirm')
          @HttpCode(HttpStatus.NO_CONTENT)
          async confirmEmail(@Body() dto: AuthConfirmEmailDto) {}
        }
      `,
    },
    // ========== REGRESSION (brocoders): the app-info route on HomeController ==========
    {
      code: `
        @ApiTags('Home')
        @Controller()
        export class HomeController {
          @Get()
          appInfo() {}
        }
      `,
    },
    // ========== VALID: public-by-design detected from the route path ==========
    {
      code: `
        @Controller('auth')
        class AuthController {
          @Post('login')
          authenticate() {}
        }
      `,
    },
    // ========== VALID: custom publicRoutePatterns ==========
    {
      code: `
        @Controller('billing')
        class BillingController {
          @Post()
          stripeHook() {}
        }
      `,
      options: [{ publicRoutePatterns: ['stripeHook'] }],
    },
    // ========== VALID: requiredGuards satisfied at method level ==========
    {
      code: `
        @Controller('users')
        class UsersController {
          @UseGuards(JwtAuthGuard)
          @Get()
          findAll() {}
        }
      `,
      options: [{ requiredGuards: ['JwtAuthGuard'] }],
    },
    // ========== VALID: requiredGuards satisfied at class level ==========
    {
      code: `
        @Controller('users')
        @UseGuards(JwtAuthGuard)
        class UsersController {
          @Get()
          findAll() {}
        }
      `,
      options: [{ requiredGuards: ['JwtAuthGuard'] }],
    },
    // ========== VALID: requiredGuards satisfied by one of several guards ==========
    {
      code: `
        @Controller('users')
        class UsersController {
          @UseGuards(RolesGuard, JwtAuthGuard)
          @Get()
          findAll() {}
        }
      `,
      options: [{ requiredGuards: ['JwtAuthGuard'] }],
    },
    // ========== VALID: the passport factory form `AuthGuard('jwt')` ==========
    {
      code: `
        @Controller('users')
        class UsersController {
          @UseGuards(AuthGuard('jwt'))
          @Get()
          findAll() {}
        }
      `,
      options: [{ requiredGuards: ['AuthGuard'] }],
    },
    // ========== VALID: namespaced guard reference ==========
    {
      code: `
        @Controller('users')
        class UsersController {
          @UseGuards(guards.JwtAuthGuard)
          @Get()
          findAll() {}
        }
      `,
      options: [{ requiredGuards: ['JwtAuthGuard'] }],
    },
    // ========== VALID: a guard list we cannot name is not evidence of absence ==========
    {
      code: `
        @Controller('users')
        class UsersController {
          @UseGuards(...projectGuards)
          @Get()
          findAll() {}
        }
      `,
      options: [{ requiredGuards: ['JwtAuthGuard'] }],
    },
    // ========== VALID: `@UseGuards()` with no arguments, ditto ==========
    {
      code: `
        @Controller('users')
        class UsersController {
          @UseGuards()
          @Get()
          findAll() {}
        }
      `,
      options: [{ requiredGuards: ['JwtAuthGuard'] }],
    },
    // ========== VALID: bare `@UseGuards` (no call), ditto ==========
    {
      code: `
        @Controller('users')
        @UseGuards
        class UsersController {
          @Get()
          findAll() {}
        }
      `,
      options: [{ requiredGuards: ['JwtAuthGuard'] }],
    },
    // ========== VALID: an unresolved composite may apply the required guard ==========
    {
      code: `
        @Controller('users')
        class UsersController {
          @AuthJwtAccessProtected()
          @Get()
          findAll() {}
        }
      `,
      options: [{ requiredGuards: ['JwtAuthGuard'] }],
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
    // ========== TRUE POSITIVE (brocoders): the unauthenticated file-download
    // route. Upload is a POST on the same guardless controller, so anyone who
    // knows a filename can fetch any uploaded file. The rule must keep
    // catching this after all the false-positive fixes. ==========
    {
      code: `
        @ApiTags('Files')
        @Controller({ path: 'files', version: '1' })
        export class FilesLocalController {
          @Get(':path')
          download(@Param('path') path, @Response() response) {
            return response.sendFile(path, { root: './files' });
          }
        }
      `,
      errors: [{ messageId: 'missingGuards', data: { name: 'download' } }],
    },
    // ========== INVALID: swagger-only decorators do not protect a route ==========
    {
      code: `
        @ApiTags('Users')
        @Controller('users')
        class UsersController {
          @ApiBearerAuth()
          @ApiOkResponse({ type: UserDto })
          @Get()
          findAll() {}
        }
      `,
      errors: [{ messageId: 'missingGuards', data: { name: 'findAll' } }],
    },
    // ========== INVALID: allowCustomDecorators: false restores strictness ==========
    {
      code: `
        @Controller('users')
        class UsersController {
          @AuthJwtAccessProtected()
          @Get()
          findAll() {}
        }
      `,
      options: [{ allowCustomDecorators: false }],
      errors: [{ messageId: 'missingGuards', data: { name: 'findAll' } }],
    },
    // ========== INVALID: guarded, but not by a required guard ==========
    {
      code: `
        @Controller('users')
        class UsersController {
          @UseGuards(RolesGuard)
          @Get()
          findAll() {}
        }
      `,
      options: [{ requiredGuards: ['JwtAuthGuard'] }],
      errors: [
        {
          messageId: 'missingRequiredGuards',
          data: { name: 'findAll', guards: 'JwtAuthGuard' },
        },
      ],
    },
    // ========== INVALID: a class-level guard that is not the required one
    // does not exempt the routes below it ==========
    {
      code: `
        @Controller('users')
        @UseGuards(RolesGuard)
        class UsersController {
          @Get()
          findAll() {}
        }
      `,
      options: [{ requiredGuards: ['JwtAuthGuard', 'ApiKeyGuard'] }],
      errors: [
        {
          messageId: 'missingRequiredGuards',
          data: { name: 'findAll', guards: 'JwtAuthGuard, ApiKeyGuard' },
        },
      ],
    },
    // ========== INVALID: no guard at all, with requiredGuards set ==========
    {
      code: `
        @Controller('users')
        class UsersController {
          @Get()
          findAll() {}
        }
      `,
      options: [{ requiredGuards: ['JwtAuthGuard'] }],
      errors: [{ messageId: 'missingRequiredGuards' }],
    },
  ],
});
