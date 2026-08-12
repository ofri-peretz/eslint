import { RuleTester } from '@typescript-eslint/rule-tester';
import { requireThrottler } from './index';

/**
 * Every fixture imports from NestJS, because the rules now abstain in files
 * that use no NestJS at all. Wrapping the arrays rather than editing each
 * fixture means one cannot be left behind — a fixture missing the import would
 * pass vacuously on the gate instead of exercising the detection it was written
 * for. A SIDE-EFFECT import, so it reserves no binding a fixture might declare.
 * `output` and errors[].suggestions[].output are prefixed too, because autofix
 * fixtures assert the whole file back.
 */
const asNest = (code: string): string => `import '@nestjs/common';\n${code}`;
type Suggestion = { output?: string | null };
type Case = {
  code: string;
  output?: string | null;
  errors?: ReadonlyArray<{ suggestions?: readonly Suggestion[] } | string>;
};
const nest = <T,>(cases: T[]): T[] =>
  cases.map((c) => {
    if (typeof c === 'string') return asNest(c) as T;
    const t = c as Case;
    return {
      ...c,
      code: asNest(t.code),
      ...(typeof t.output === 'string' ? { output: asNest(t.output) } : {}),
      ...(t.errors
        ? {
            errors: t.errors.map((e) =>
              typeof e === 'string' || !e.suggestions
                ? e
                : {
                    ...e,
                    suggestions: e.suggestions.map((s) =>
                      typeof s.output === 'string'
                        ? { ...s, output: asNest(s.output) }
                        : s,
                    ),
                  },
            ),
          }
        : {}),
    } as T;
  });


const ruleTester = new RuleTester();

ruleTester.run('require-throttler', requireThrottler, {
  valid: nest([
    // Substring matching reported these: 'authors'.includes('auth') and
    // 'tokenize'.includes('token') are both true. An author listing is not a
    // credential endpoint, and saying so costs the rule its credibility.
    `
      @Controller('authors')
      class AuthorsController {
        @Get()
        getAuthors() {}
      }
    `,
    `
      @Controller('utils')
      class UtilsController {
        @Post('tokenize')
        tokenize(@Body() dto) {}
      }
    `,
    // Non-sensitive routes are covered by a global ThrottlerModule by default.
    `
      @Controller('articles')
      class ArticlesController {
        @Get()
        findAll() {}
      }
    `,
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
  ]),
  invalid: nest([
    // …while a sensitive token in any position still counts. The corpus names
    // these handlers verb-first as often as noun-first, so suffix-only
    // matching would drop most of them.
    {
      code: `
        @Controller('account')
        class AccountController {
          @Post('verify')
          verifyEmail(@Body() dto) {}
        }
      `,
      errors: [{ messageId: 'missingThrottler' }],
    },
    // ========== INVALID: Controller without throttling ==========
    {
      code: `
        @Controller('users')
        class UsersController {
          @Get()
          findAll() {}
        }
      `,
      options: [{ onlySensitiveRoutes: false }],
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
      options: [{ onlySensitiveRoutes: false }],
      errors: [
        { messageId: 'missingThrottler' },
        { messageId: 'missingThrottler' },
      ],
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
      options: [{ allowInTests: false, onlySensitiveRoutes: false }],
      errors: [{ messageId: 'missingThrottler' }],
    },
  ]),
});

// Lock for `skipRoutes`, which was declared in the schema but never read.
ruleTester.run('require-throttler (skipRoutes)', requireThrottler, {
  valid: nest([
    // Matches the handler name (a route that would otherwise be reported).
    {
      code: `
        @Controller('u')
        class UsersController {
          @Post()
          login() {}
        }
      `,
      options: [{ skipRoutes: ['login'] }],
    },
    // Matches a declared route path.
    {
      code: `
        @Controller('u')
        class UsersController {
          @Get('/status')
          check() {}
        }
      `,
      options: [{ skipRoutes: ['status'], onlySensitiveRoutes: false }],
    },
  ]),
  invalid: nest([
    // A bare (uninvoked) @Get declares no path, so only the name can match.
    {
      code: `
        @Controller('u')
        class UsersController {
          @Get
          check() {}
        }
      `,
      options: [{ skipRoutes: ['status'], onlySensitiveRoutes: false }],
      errors: [{ messageId: 'missingThrottler' }],
    },
    // A non-matching entry does not suppress anything.
    {
      code: `
        @Controller('u')
        class UsersController {
          @Get('/other')
          check() {}
        }
      `,
      options: [{ skipRoutes: ['status'], onlySensitiveRoutes: false }],
      errors: [{ messageId: 'missingThrottler' }],
    },
  ]),
});

// The default now targets credential/abuse-prone routes only.
ruleTester.run('require-throttler (sensitive routes)', requireThrottler, {
  valid: nest([
    // Behind authentication: not a brute-force target. This is the exact
    // complement of require-guards, which exempts public auth entry points.
    `
      @Controller('search')
      class SearchController {
        @Post('smart')
        @Authenticated({ permission: Permission.AssetRead })
        searchSmart() {}
      }
    `,
    `
      @Controller('account')
      @UseGuards(JwtAuthGuard)
      class AccountController {
        @Post('reset-password')
        resetPassword() {}
      }
    `,
    // 'search' and 'upload' are capacity concerns, not credential abuse.
    `
      @Controller('assets')
      class AssetsController {
        @Post('upload')
        upload() {}
        @Get('search')
        search() {}
      }
    `,
    // Ordinary CRUD is left to a global ThrottlerModule.
    `
      @Controller('articles')
      class ArticlesController {
        @Get('feed')
        feed() {}
      }
    `,
    // A project auth decorator does not itself imply throttling, but a
    // @Throttle on the class does.
    `
      @Controller('auth')
      @Throttle({ default: { limit: 5, ttl: 60000 } })
      class AuthController {
        @Post('login')
        login() {}
      }
    `,
  ]),
  invalid: nest([
    // Brute-forceable: login by handler name.
    {
      code: `
        @Controller('auth')
        class AuthController {
          @Post()
          login() {}
        }
      `,
      errors: [{ messageId: 'missingThrottler' }],
    },
    // Brute-forceable: password reset by route path.
    {
      code: `
        @Controller('account')
        class AccountController {
          @Post('reset-password')
          handle() {}
        }
      `,
      errors: [{ messageId: 'missingThrottler' }],
    },
    // OTP flooding.
    {
      code: `
        @Controller('mfa')
        class MfaController {
          @Post('resend-otp')
          resend() {}
        }
      `,
      errors: [{ messageId: 'missingThrottler' }],
    },
  ]),
});
