import { RuleTester } from '@typescript-eslint/rule-tester';
import { requireThrottler } from './index';

const ruleTester = new RuleTester();

ruleTester.run('require-throttler', requireThrottler, {
  valid: [
    // ========== VALID: root module configures ThrottlerModule ==========
    {
      code: `
        @Module({
          imports: [ThrottlerModule.forRoot([{ ttl: 60000, limit: 10 }])],
          providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
        })
        export class AppModule {}
      `,
    },
    // ========== VALID: async throttler configuration ==========
    {
      code: `
        @Module({
          imports: [ThrottlerModule.forRootAsync({ useFactory: () => ({}) })],
        })
        export class AppModule {}
      `,
    },
    // ========== REGRESSION (ack + brocoders): route handlers are never
    // reported. Rate limiting is adopted once in the root module, so 24 (and
    // 93) per-route findings described a single one-line fix. ==========
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
    },
    // ========== VALID: feature modules are not the root module ==========
    {
      code: `
        @Module({ controllers: [UsersController] })
        export class UsersModule {}
      `,
    },
    // ========== VALID: non-module class in app.module.ts ==========
    {
      code: `export class AppModuleHelper {}`,
      filename: 'app.module.ts',
    },
    // ========== VALID: test file ==========
    {
      code: `
        @Module({})
        export class AppModule {}
      `,
      filename: 'app.module.spec.ts',
    },
    // ========== VALID: assumeGlobalThrottler option ==========
    {
      code: `
        @Module({})
        export class AppModule {}
      `,
      options: [{ assumeGlobalThrottler: true }],
    },
    // ========== VALID: custom root module name not matched ==========
    {
      code: `
        @Module({})
        export class AppModule {}
      `,
      options: [{ rootModuleNames: ['RootModule'], rootModuleFiles: [] }],
    },
  ],
  invalid: [
    // ========== INVALID: root module with no rate limiting ==========
    {
      code: `
        @Module({
          imports: [UsersModule],
          controllers: [],
          providers: [],
        })
        export class AppModule {}
      `,
      errors: [{ messageId: 'missingThrottler', data: { name: 'AppModule' } }],
    },
    // ========== INVALID: recognised by file name, not class name ==========
    {
      code: `
        @Module({ imports: [UsersModule] })
        export class ApplicationModule {}
      `,
      filename: 'src/app.module.ts',
      errors: [
        { messageId: 'missingThrottler', data: { name: 'ApplicationModule' } },
      ],
    },
    // ========== INVALID: custom root module name ==========
    {
      code: `
        @Module({ imports: [UsersModule] })
        export class RootModule {}
      `,
      options: [{ rootModuleNames: ['RootModule'] }],
      errors: [{ messageId: 'missingThrottler', data: { name: 'RootModule' } }],
    },
    // ========== INVALID: test file with allowInTests: false ==========
    {
      code: `
        @Module({})
        export class AppModule {}
      `,
      filename: 'app.module.spec.ts',
      options: [{ allowInTests: false }],
      errors: [{ messageId: 'missingThrottler' }],
    },
  ],
});
