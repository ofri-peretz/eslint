/**
 * @fileoverview Tests for no-exposed-debug-endpoints (NestJS)
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { noExposedDebugEndpoints } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('no-exposed-debug-endpoints', noExposedDebugEndpoints, {
  valid: [
    'const x = 42;',
    'const flag = true;',
    'function noop() {}',
    'const items = [];',

    // Regression lock (FP-1): the rule inspects route paths, not every string
    // literal. These previously produced errors in files declaring no routes.
    "const path = '/health';",
    "const mode = 'debug';",
    `
      export class LoggerService {
        levels = ['debug', 'info'];
        mode = 'test';
        probe() { return 'health'; }
      }
    `,
    // A route path is only meaningful on a @Controller class.
    `
      class NotAController {
        @Get('/debug')
        getDebug() {}
      }
    `,
    // Ordinary business routes.
    `
      @Controller('users')
      class UsersController {
        @Get('/api/v1/profile')
        getProfile() {}
      }
    `,
    `
      @Controller('auth')
      class AuthController {
        @Post('login')
        login() {}
      }
    `,
    // Guarded debug route: reachable only behind auth, which is the fix.
    `
      @Controller('ops')
      class OpsController {
        @UseGuards(AdminGuard)
        @Get('debug')
        getDebug() {}
      }
    `,
    // Class-level guard protects every route beneath it.
    `
      @Controller('admin')
      @UseGuards(AdminGuard)
      class AdminController {
        @Get()
        index() {}
      }
    `,
    // `health` is not a default debug segment — @nestjs/terminus ships it as
    // the documented public health-check pattern.
    `
      @Controller('health')
      class HealthController {
        @Get()
        check() {}
      }
    `,
    // Segment matching is token-aligned, so a longer word is not a hit.
    `
      @Controller('badminton')
      class SportsController {
        @Get('testimonials')
        list() {}
      }
    `,
    // Test files are skipped by default.
    {
      code: `
        @Controller('debug')
        class DebugController {
          @Get()
          index() {}
        }
      `,
      filename: 'debug.controller.spec.ts',
    },
    // ignoreFiles honoured.
    {
      code: `
        @Controller('debug')
        class DebugController {
          @Get()
          index() {}
        }
      `,
      filename: 'src/tools/debug.controller.ts',
      options: [{ ignoreFiles: ['src/tools/'] }],
    },
    // A custom endpoint list replaces the defaults.
    {
      code: `
        @Controller('admin')
        class AdminController {
          @Get()
          index() {}
        }
      `,
      options: [{ endpoints: ['sekrit'] }],
    },
  ],

  invalid: [
    // Unguarded debug route on a controller.
    {
      code: `
        @Controller('ops')
        class OpsController {
          @Get('/debug')
          getDebug() {}
        }
      `,
      errors: [{ messageId: 'violationDetected' }],
    },
    // Unguarded admin route.
    {
      code: `
        @Controller('ops')
        class OpsController {
          @Post('admin')
          getAdmin() {}
        }
      `,
      errors: [{ messageId: 'violationDetected' }],
    },
    // The debug segment can come from the @Controller prefix.
    {
      code: `
        @Controller('internal')
        class InternalController {
          @Get('stats')
          stats() {}
        }
      `,
      errors: [{ messageId: 'violationDetected' }],
    },
    // Nested segments are matched segment-wise.
    {
      code: `
        @Controller('api')
        class ApiController {
          @Get('v1/admin/users')
          adminUsers() {}
        }
      `,
      errors: [{ messageId: 'violationDetected' }],
    },
    // Namespace-imported decorators are not a hiding place.
    {
      code: `
        @common.Controller('ops')
        class OpsController {
          @common.Get('debug')
          getDebug() {}
        }
      `,
      errors: [{ messageId: 'violationDetected' }],
    },
    // Array-form route paths.
    {
      code: `
        @Controller('ops')
        class OpsController {
          @Get(['status', 'metrics'])
          metrics() {}
        }
      `,
      errors: [{ messageId: 'violationDetected' }],
    },
    // A guard unrelated to the route still counts as protection; absence does not.
    {
      code: `
        @Controller('ops')
        class OpsController {
          @Get('actuator')
          actuator() {}
        }
      `,
      errors: [{ messageId: 'violationDetected' }],
    },
    // Custom endpoint list.
    {
      code: `
        @Controller('x')
        class XController {
          @Get('sekrit')
          secret() {}
        }
      `,
      options: [{ endpoints: ['sekrit'] }],
      errors: [{ messageId: 'violationDetected' }],
    },
    // allowInTests: false re-enables the rule in spec files.
    {
      code: `
        @Controller('debug')
        class DebugController {
          @Get()
          index() {}
        }
      `,
      filename: 'debug.controller.spec.ts',
      options: [{ allowInTests: false }],
      errors: [{ messageId: 'violationDetected' }],
    },
  ],
});

// Path-extraction edge cases introduced by the route-scoped rewrite.
ruleTester.run(
  'no-exposed-debug-endpoints (path extraction)',
  noExposedDebugEndpoints,
  {
    valid: [
      // An unrecognised decorator may be a project auth wrapper — immich guards
      // its admin routes with @MaintenanceRoute(), defined in maintenance-auth.guard.ts.
      // Abstain rather than claim the route is unguarded.
      `
      @Controller('ops')
      class OpsController {
        @Get('admin/database-backups')
        @MaintenanceRoute()
        listBackups() {}
      }
    `,
      // Naming it explicitly restores the finding path.
      {
        code: `
        @Controller('ops')
        class OpsController {
          @Get('debug')
          @MaintenanceRoute()
          dbg() {}
        }
      `,
        options: [{ authDecorators: ['MaintenanceRoute'] }],
      },
      // A class-level unknown decorator also causes abstention.
      `
      @Controller('ops')
      @ProjectSpecific()
      class OpsController {
        @Get('debug')
        dbg() {}
      }
    `,
      // Bare (undecorated) members are unaffected by the abstention path.
      `
      @Controller('ops')
      class OpsController {
        helper() {}
      }
    `,
      // Swagger decorators are recognised and do not cause abstention.
      // Non-literal route path: nothing static to match against.
      `
      @Controller('ops')
      class OpsController {
        @Get(DEBUG_ROUTE)
        route() {}
      }
    `,
      // Array route paths with non-string and sparse entries.
      `
      @Controller('ops')
      class OpsController {
        @Get(['ok', 123, , SOME_CONST])
        route() {}
      }
    `,
      // Bare (uninvoked) decorators declare no path.
      `
      @Controller
      class OpsController {
        @Get
        route() {}
      }
    `,
      // A non-route method inside a controller is not a route.
      `
      @Controller('debug')
      class OpsController {
        helper() {}
      }
    `,
    ],
    invalid: [
      // Sparse arrays still yield their string entries.
      {
        code: `
        @Controller('ops')
        class OpsController {
          @Get(['ok', , 'debug'])
          route() {}
        }
      `,
        errors: [{ messageId: 'violationDetected' }],
      },
      // Recognised non-auth decorators (Swagger, HttpCode) still allow the claim.
      {
        code: `
        @Controller('ops')
        @ApiTags('ops')
        class OpsController {
          @Get('debug')
          @HttpCode(200)
          @ApiOkResponse({ type: String })
          dbg() {}
        }
      `,
        errors: [{ messageId: 'violationDetected' }],
      },
    ],
  },
);
