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
    // ========== VALID: ThrottlerModule imported bare, configured elsewhere ==========
    {
      code: `
        @Module({
          imports: [ConfigModule, ThrottlerModule],
        })
        export class AppModule {}
      `,
    },
    // ========== VALID: guard registered as APP_GUARD, module configured
    // in a dedicated throttler module ==========
    {
      code: `
        @Module({
          providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
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
    // ========== REGRESSION: an *unused* `ThrottlerGuard` import is not a
    // registration. Matching the bare identifier anywhere in the file text
    // silenced the rule on a module that never puts the guard in providers. ==========
    {
      code: `
        import { ThrottlerGuard, ThrottlerStorage } from '@nestjs/throttler';

        @Module({
          imports: [UsersModule],
          providers: [UsersService],
        })
        export class AppModule {}
      `,
      errors: [{ messageId: 'missingThrottler', data: { name: 'AppModule' } }],
    },
    // ========== INVALID: a global APP_GUARD that is not a throttler does not
    // count as rate limiting ==========
    {
      code: `
        @Module({
          providers: [{ provide: APP_GUARD, useClass: JwtAuthGuard }],
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
