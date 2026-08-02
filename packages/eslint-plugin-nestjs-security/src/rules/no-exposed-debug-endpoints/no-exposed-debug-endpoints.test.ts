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
    // ========== REGRESSION (ack): enum members named `debug` are not routes.
    // src/common/logger/enums/logger.enum.ts fired twice on these. ==========
    {
      code: `
        export enum EnumLoggerLevel {
          debug = 'debug',
          error = 'error',
        }
      `,
    },
    // ========== REGRESSION (brocoders): seed data / config strings ==========
    {
      code: `const seed = { role: 'admin', name: 'test' };`,
    },
    // ========== REGRESSION: 'admin', 'test' and 'health' are ordinary route
    // names, not debug endpoints ==========
    {
      code: `
        @Controller('admin')
        class AdminController {
          @Get('test')
          runTest() {}
          @Get('health')
          health() {}
        }
      `,
    },
    {
      code: `
        @Controller('users')
        class UsersController {
          @Get('/api/v1/profile')
          getProfile() {}
        }
      `,
    },
    // ========== VALID: guarded debug endpoint ==========
    {
      code: `
        @Controller('app')
        class AppController {
          @Get('debug')
          @UseGuards(AdminGuard)
          debug() {}
        }
      `,
    },
    // ========== VALID: class-level guard covers the debug route ==========
    {
      code: `
        @Controller('app')
        @UseGuards(AdminGuard)
        class AppController {
          @Get('debug')
          debug() {}
        }
      `,
    },
    // ========== VALID: custom composite decorator may guard the route ==========
    {
      code: `
        @Controller('app')
        class AppController {
          @Get('debug')
          @AuthJwtAccessProtected()
          debug() {}
        }
      `,
    },
    // ========== VALID: not a controller ==========
    {
      code: `
        class DebugService {
          @Get('debug')
          debug() {}
        }
      `,
    },
    // ========== VALID: non-route method in a controller ==========
    {
      code: `
        @Controller('debug')
        class DebugController {
          helper() {}
        }
      `,
    },
    // ========== VALID: ignoreFiles ==========
    {
      code: `
        @Controller('app')
        class DebugController {
          @Get('debug')
          debug() {}
        }
      `,
      options: [{ ignoreFiles: ['skip-me'] }],
      filename: 'src/skip-me.controller.ts',
    },
    // ========== VALID: dynamic route path ==========
    {
      code: `
        @Controller('app')
        class AppController {
          @Get(routePath)
          dynamic() {}
        }
      `,
    },
  ],

  invalid: [
    // ========== INVALID: unguarded debug route ==========
    {
      code: `
        @Controller('app')
        class AppController {
          @Get('/debug')
          getDebug() {}
        }
      `,
      errors: [{ messageId: 'violationDetected' }],
    },
    // ========== INVALID: debug base path on the controller ==========
    {
      code: `
        @Controller({ version: '1', path: '/__debug__' })
        class DebugController {
          @Get('state')
          state() {}
        }
      `,
      errors: [{ messageId: 'violationDetected' }],
    },
    // ========== INVALID: @Public() does not make a debug route acceptable ==========
    {
      code: `
        @Controller('app')
        class AppController {
          @Get('devtools')
          @Public()
          devtools() {}
        }
      `,
      errors: [{ messageId: 'violationDetected' }],
    },
    // ========== INVALID: custom endpoints option (leading slash) ==========
    {
      code: `
        @Controller('app')
        class AppController {
          @Get('custom-debug')
          custom() {}
        }
      `,
      options: [{ endpoints: ['/custom-debug'] }],
      errors: [{ messageId: 'violationDetected' }],
    },
  ],
});
