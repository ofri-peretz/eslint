import { RuleTester } from '@typescript-eslint/rule-tester';
import { requireGuards } from './index';

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

ruleTester.run('require-guards', requireGuards, {
  valid: nest([
    // amplication/.../auth.controller.ts — an auth entry point is qualified by
    // its provider (`auth0Login`) or its transport (`githubCallback`), and
    // exact-name matching reported every one of them.
    `
      @Controller('/')
      class AuthController {
        @Get(AUTH_LOGIN_PATH)
        auth0Login(@Req() request) {}
      }
    `,
    `
      @Controller('/')
      class AuthController {
        @Get(CALLBACK_PATH)
        githubCallback(@Req() request) {}
      }
    `,
    // …including the verb-suffixed twin that distinguishes two handlers on one
    // path. `post` says nothing about the route; `callback` does.
    `
      @Controller('/')
      class AuthController {
        @Post(CALLBACK_PATH)
        auth0CallbackPost(@Req() request) {}
      }
    `,
    // brocoders-bp/src/auth/auth.controller.ts:78 — the path splits into two
    // segments and the term is the hyphenated one. The handler name here
    // carries none of it, so the path join is the only thing that can clear it.
    `
      @Controller('auth')
      class AuthController {
        @Post('reset/password')
        handle(@Body() dto) {}
      }
    `,
    // …and the same shape via the handler name.
    `
      @Controller('auth')
      class AuthController {
        @Post('reset/password')
        resetPassword(@Body() dto) {}
      }
    `,
    // truthy/src/app.controller.ts and nestjs-starter-rest-api: the same
    // scaffold spelled with an empty string, which means what the bare form
    // means.
    `
      @Controller('')
      class AppController {
        @Get('')
        index() {}
      }
    `,
    // squareboat-nestjs-boilerplate/.../auth.controller.ts:68 and
    // truthy/.../auth.controller.ts:101 — recovery and activation are entry
    // points, and the corpus spells recovery in four different word orders.
    `
      @Controller('auth')
      class AuthController {
        @Post('request-password-reset')
        requestPasswordReset(@Body() dto) {}
      }
    `,
    `
      @Controller('auth')
      class AuthController {
        @Post('recovery')
        passwordReset(@Body() dto) {}
      }
    `,
    `
      @Controller('auth')
      class AuthController {
        @Get('/auth/activate-account')
        activateAccount(@Query() q) {}
      }
    `,
    // ghostfolio/apps/api/src/app/endpoints/sitemap/sitemap.controller.ts:32 —
    // a crawler fetches sitemap.xml unauthenticated by definition.
    `
      @Controller('sitemap.xml')
      class SitemapController {
        @Get()
        getSitemapXml(@Res() response) {}
      }
    `,
    // teable/apps/nestjs-backend/test/utils/init-app.ts — a test helper, which
    // is not named .spec.ts and was being linted as production code.
    {
      name: 'a controller with no privileged route to guard',
      code: `
        @Controller('users')
        class UsersController {
          @Get('all')
          findAll() {}
        }
      `,
      filename: 'test/utils/init-app.ts',
    },
    // The `nest new` scaffold, kept and never guarded: `GET /` with no path on
    // either decorator and nothing to identify a resource.
    `
      @Controller()
      class AppController {
        @Get()
        getHello(): string { return this.appService.getHello(); }
      }
    `,
    // amplication/.../subscription.controller.ts:20 — a webhook that
    // authenticates by comparing a shared secret. There is no guard because
    // there is no NestJS-side identity to establish.
    `
      @Controller('subscriptions')
      class SubscriptionController {
        @Post('updateStatus')
        async updateStatus(@Headers('stigg-webhooks-secret') secret, @Body() dto) {}
      }
    `,
    // amplication/.../user.controller.ts:19 — the same authentication, one step
    // further in: the credential arrives as a route parameter and the handler
    // checks it against config itself. Reported as unguarded while it
    // authenticates on its first statement.
    `
      @Controller('user')
      class UserController {
        @Post(':token/announcement')
        async announce(@Param('token') token: string) {
          if (this.configService.get<string>('FEATURE_TOKEN') !== token) {
            this.logger.error('InvalidToken, process aborted');
            return false;
          }
          return this.userService.announce();
        }
      }
    `,
    // The same shape read straight from the environment.
    `
      @Controller('cron')
      class CronController {
        @Post('run')
        async run(@Query('key') key: string) {
          if (key !== process.env.CRON_SECRET) throw new UnauthorizedException();
          return this.jobs.run();
        }
      }
    `,
    `
      @Controller('hooks')
      class HooksController {
        @Post('github')
        async onPush(@Headers('x-hub-signature-256') signature, @Body() body) {}
      }
    `,
    // nest-hackathon-starter: a liveness probe on the root controller. There is
    // no path segment to match and the handler is `healthCheck`, so exact-name
    // matching missed it and a void-returning probe was reported at CRITICAL.
    `
      @Controller('')
      class AppController {
        @Get()
        healthCheck(): void {}
      }
    `,
    // The same probe under every spelling teams actually use.
    `
      @Controller()
      class AppController {
        @Get()
        getHealth() {}
      }
    `,
    `
      @Controller()
      class AppController {
        @Get()
        livenessProbe() {}
      }
    `,

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
  ]),
  invalid: nest([
    // The configured-secret exemption is bounded on both sides. Comparing
    // already-trusted data is authorization, not authentication — it says
    // nothing about whether the caller proved who they are.
    {
      name: 'a role checked by hand inside the handler instead of by a guard',
      code: `
        @Controller('admin')
        class AdminController {
          @Get('users')
          list(@Req() req) {
            if (req.user.role !== 'admin') throw new ForbiddenException();
            return this.users.findAll();
          }
        }
      `,
      errors: [{ messageId: 'missingGuards' }],
    },
    // Only a *secret source* clears a route. Comparing against an ordinary
    // call, a bare function named `get`, or a `.get()` whose receiver is not a
    // config object leaves all three of these reported.
    {
      code: `
        @Controller('admin')
        class AdminController {
          @Get('a')
          a(@Query('x') x) { if (this.compute(x) !== 'y') throw new Error(); return 1; }
          @Get('b')
          b(@Query('x') x) { if (get(x) !== 'y') throw new Error(); return 1; }
          @Get('c')
          c(@Query('x') x) { if (this.get('K') !== x) throw new Error(); return 1; }
        }
      `,
      errors: [
        { messageId: 'missingGuards' },
        { messageId: 'missingGuards' },
        { messageId: 'missingGuards' },
      ],
    },
    // An environment check is not an authentication check. The name is the
    // only thing separating the two, so without it any handler could switch
    // this rule off by inspecting NODE_ENV.
    {
      code: `
        @Controller('admin')
        class AdminController {
          @Get('users')
          list() {
            if (process.env.NODE_ENV !== 'production') return this.users.findDebug();
            return this.users.findAll();
          }
        }
      `,
      errors: [{ messageId: 'missingGuards' }],
    },
    // Same for a config key that names no credential.
    {
      code: `
        @Controller('admin')
        class AdminController {
          @Get('users')
          list() {
            if (this.configService.get('FEATURE_FLAG') === 'on') return this.users.findAll();
            return [];
          }
        }
      `,
      errors: [{ messageId: 'missingGuards' }],
    },
    // A comparison inside a callback is data processing, not authentication.
    // The walker has to stop at function boundaries or `.filter()` clears the
    // handler.
    {
      code: `
        @Controller('items')
        class ItemsController {
          @Post('list')
          async list(@Query('key') key: string) {
            return this.db.findAll().filter((item) => item.secret !== process.env.FILTER_TOKEN);
          }
        }
      `,
      errors: [{ messageId: 'missingGuards' }],
    },
    // Reading config without comparing it is not an authentication check —
    // otherwise any handler that logs process.env.NODE_ENV would go quiet.
    {
      code: `
        @Controller('admin')
        class AdminController {
          @Get('users')
          list() {
            this.logger.debug(process.env.NODE_ENV);
            return this.users.findAll();
          }
        }
      `,
      errors: [{ messageId: 'missingGuards' }],
    },
    // Each narrowing above is bounded. A public term in the middle of a name
    // is a resource listing, not an entry point.
    {
      code: `
        @Controller('admin')
        class AdminController {
          @Get('audit')
          getLoginHistory(@Query() q) {}
        }
      `,
      errors: [{ messageId: 'missingGuards' }],
    },
    // The scaffold exemption needs all of: no path either side, no parameter,
    // and GET. Any one of them missing puts the route back in scope.
    {
      code: `
        @Controller()
        class AppController {
          @Post()
          create(@Body() dto) {}
        }
      `,
      errors: [{ messageId: 'missingGuards' }],
    },
    {
      code: `
        @Controller()
        class AppController {
          @Get()
          findAll(@Query() query) {}
        }
      `,
      errors: [{ messageId: 'missingGuards' }],
    },
    {
      code: `
        @Controller('reports')
        class ReportsController {
          @Get()
          listReports() {}
        }
      `,
      errors: [{ messageId: 'missingGuards' }],
    },
    // "password" alone is not recovery — this manages stored credentials and
    // is exactly the route that must be guarded.
    {
      code: `
        @Controller('admin')
        class AdminController {
          @Get('passwords')
          listPasswords(@Query() q) {}
        }
      `,
      errors: [{ messageId: 'missingGuards' }],
    },
    // A non-empty path on an otherwise scaffold-shaped route.
    {
      code: `
        @Controller('')
        class AppController {
          @Get('users')
          index() {}
        }
      `,
      errors: [{ messageId: 'missingGuards' }],
    },
    // A header parameter only clears the route when it carries a credential.
    {
      code: `
        @Controller('hooks')
        class HooksController {
          @Post('github')
          onPush(@Headers('content-type') type, @Body() body) {}
        }
      `,
      errors: [{ messageId: 'missingGuards' }],
    },
    // A non-literal header name proves nothing about what is read.
    {
      code: `
        @Controller('hooks')
        class HooksController {
          @Post('github')
          onPush(@Headers(HEADER) value, @Body() body) {}
        }
      `,
      errors: [{ messageId: 'missingGuards' }],
    },
    // A decorated parameter that is not @Headers at all.
    {
      code: `
        @Controller('hooks')
        class HooksController {
          @Post('github')
          onPush(@Body('signature') signature) {}
        }
      `,
      errors: [{ messageId: 'missingGuards' }],
    },
    // awesome-nest-bp/src/modules/post/post.controller.ts:82 and :94 — three
    // siblings carry @Auth and these two do not. This is the finding the rule
    // exists for, and no narrowing above may swallow it.
    {
      code: `
        @Controller('posts')
        class PostController {
          @Get(':id')
          @Auth([])
          getPost(@Param('id') id) {}

          @Put(':id')
          updatePost(@Param('id') id, @Body() dto) {}

          @Delete(':id')
          deletePost(@Param('id') id) {}
        }
      `,
      errors: [{ messageId: 'missingGuards' }, { messageId: 'missingGuards' }],
    },
    // A health *token* inside a longer name is not a probe. `deleteHealthRecord`
    // is a destructive route that happens to mention health, and tokenising
    // must not exempt it.
    {
      code: `
        @Controller('records')
        class RecordsController {
          @Delete(':id')
          deleteHealthRecord(@Param('id') id: string) {}
        }
      `,
      errors: [{ messageId: 'missingGuards' }],
    },
    // A write is never a probe, whatever it is called.
    {
      code: `
        @Controller()
        class AppController {
          @Post()
          healthCheck(@Body() dto: PayloadDto) {}
        }
      `,
      errors: [{ messageId: 'missingGuards' }],
    },

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
    // They must not be mistaken for *no path*: the scaffold exemption tests
    // whether the decorator has an argument, not whether one could be read.
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
  ]),
});

/**
 * The point of the change these accompany was the labels themselves, and
 * `{ messageId: 'missingGuards' }` asserts only a key lookup — it passes
 * whether the message says CWE-306 or CWE-284, 7.5 or 9.8. Revert the metadata
 * and every RuleTester case above still passes. These fail.
 */
describe('reported severity metadata', () => {
  it('reports missing authentication as CWE-306, not the CWE-284 pillar', () => {
    for (const id of ['missingGuards', 'emptyGuards'] as const) {
      expect(requireGuards.meta.messages[id]).toContain('CWE-306');
      expect(requireGuards.meta.messages[id]).toContain('7.5');
      expect(requireGuards.meta.messages[id]).not.toContain('CWE-284');
      expect(requireGuards.meta.messages[id]).not.toContain('9.8');
    }
  });

  it('reports a missing *required* guard as CWE-862 at a lower score', () => {
    // Other guards do run here, so the caller is authenticated and only the
    // one specific authorization check is absent — a different weakness, and
    // PR:L rather than PR:N.
    expect(requireGuards.meta.messages.missingRequiredGuard).toContain(
      'CWE-862',
    );
    expect(requireGuards.meta.messages.missingRequiredGuard).toContain('6.5');
  });

  it('agrees with the rule-level docs metadata', () => {
    expect(requireGuards.meta.docs.cwe).toBe('CWE-306');
    expect(requireGuards.meta.docs.cvss).toBe(7.5);
  });
});
