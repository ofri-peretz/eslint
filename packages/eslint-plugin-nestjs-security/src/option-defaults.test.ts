/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Configuring a rule must not change what it reports.
 *
 * ESLint validates rule options with Ajv in `useDefaults` mode, so every
 * `default:` in a schema is *written into the options object* the rule
 * receives — but only when the config supplies an options object at all.
 * `['error']` and `['error', {}]` therefore reach the rule differently.
 *
 * That breaks any option merged as `provided ?? DEFAULTS`: with a schema
 * default of `[]`, the provided value is `[]` rather than `undefined`, the
 * `??` never fires, and the rule's built-in list silently becomes empty.
 *
 * It was not hypothetical. `require-guards` with `['error', {}]` reported
 * `POST /auth/login` as unguarded, because `publicRoutes` defaulted to `[]`
 * and wiped out the entire public-route list. Anyone who configured the rule —
 * even to set an unrelated option — lost every default.
 *
 * So the invariant is locked for every rule, not just the two that had the
 * bug: an empty options object behaves exactly like no options object.
 */
import { describe, it, expect } from 'vitest';
import { Linter } from 'eslint';
import tsParser from '@typescript-eslint/parser';
import { rules } from './index';

const linter = new Linter({ configType: 'flat' });

function findings(rule: string, code: string, options?: unknown): string[] {
  return linter
    .verify(
      code,
      {
        files: ['**/*.ts'],
        languageOptions: {
          parser: tsParser as never,
          parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
        },
        plugins: { n: { rules } as never },
        rules: {
          [`n/${rule}`]: options === undefined ? 'error' : ['error', options],
        },
      } as never,
      'app.controller.ts',
    )
    .filter((m) => m.ruleId === `n/${rule}`)
    .map((m) => `${m.line}:${m.messageId}`);
}

/**
 * Code that exercises each rule's *default* lists, so wiping a default is
 * visible. A fixture that reports the same either way would prove nothing.
 */
const FIXTURES: Record<string, string> = {
  // Public-route defaults: login must stay unreported.
  'require-guards': `
    @Controller('auth')
    class AuthController {
      @Post('login')
      login(@Body() dto: LoginDto) {}

      @Post('register')
      register(@Body() dto: RegisterDto) {}
    }
  `,
  // Debug-path defaults: 'admin' must stay reported.
  // Sensitive-route defaults: login must stay reported.
  'require-throttler': `
    @Controller('auth')
    class AuthController {
      @Post('login')
      login(@Body() dto: LoginDto) {}
    }
  `,
  // Validator-decorator defaults: @IsEmail must still count as validation.
  // Sensitive-term defaults: password must stay reported.
  'no-exposed-private-fields': `
    @Entity()
    class UserEntity {
      @Column()
      password: string;
    }
  `,
  'no-missing-validation-pipe': `
    @Controller('users')
    class UsersController {
      @Post()
      create(@Body() payload) {}
    }
  `,
  'require-validation-pipe-whitelist': `app.useGlobalPipes(new ValidationPipe());`,
  'no-permissive-cors': `app.enableCors({ origin: '*' });`,
  'no-unguarded-swagger': `
    async function bootstrap() {
      const app = await NestFactory.create(AppModule);
      SwaggerModule.setup('docs', app, document);
    }
  `,
  // detectGlobalRegistrations is on by default and the synthetic filename finds
  // no project, so the fixture must switch it off to reach the rule's own logic.
  'no-hybrid-app-config-loss': `
    app.connectMicroservice<MicroserviceOptions>(createNestjsKafkaConfig());
  `,
  'no-unsafe-multer-filename': `
    diskStorage({
      filename(req, file, cb) { cb(null, Date.now() + '-' + file.originalname); },
    });
  `,
  // Needs a visible serializer, or the rule abstains before reaching the
  // options logic this fixture exists to exercise.
  'no-res-bypass-serialization': `
    @Controller('users')
    @UseInterceptors(ClassSerializerInterceptor)
    class UsersController {
      @Get()
      findAll(@Res() res: Response) { res.json(this.users); }
    }
  `,
};

describe('an empty options object behaves like no options object', () => {
  const names = Object.keys(rules);

  it('covers every rule in the plugin', () => {
    expect(Object.keys(FIXTURES).sort()).toEqual(names.sort());
  });

  it.each(names)('%s', (rule) => {
    const code = FIXTURES[rule];
    expect(findings(rule, code, {})).toEqual(findings(rule, code));
  });

  /**
   * The fixtures must actually exercise something, or the comparison above is
   * two empty arrays agreeing with each other.
   */
  it.each(names)('%s fixture is non-trivial', (rule) => {
    const reported = findings(rule, FIXTURES[rule]).length;
    const suppressed = rule === 'require-guards';
    expect(suppressed ? reported === 0 : reported > 0).toBe(true);
  });
});
