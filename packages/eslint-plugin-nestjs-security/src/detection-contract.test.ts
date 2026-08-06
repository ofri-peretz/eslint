/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Detection contract — the false-negative half of the quality gate.
 *
 * The rest of the suite proves the rules do not fire on correct code. This file
 * proves they still fire on the thing each rule exists to catch, and stay silent
 * on the *minimally different* safe twin.
 *
 * Every FP fix in this plugin narrowed a rule. Narrowing is how a security rule
 * quietly stops protecting anything while still scoring a perfect FP rate, so
 * each narrowing gets a paired probe here: one vulnerable fixture, one safe
 * fixture differing only by the fix. If a future change guts a rule, the
 * vulnerable half fails.
 */
import { describe, it, expect } from 'vitest';
import { Linter } from 'eslint';
import tsParser from '@typescript-eslint/parser';
import { rules } from './index';

const linter = new Linter({ configType: 'flat' });

/** Run one rule over a snippet and return its message ids. */
function run(rule: string, code: string, options?: unknown): string[] {
  const messages = linter.verify(
    code,
    {
      files: ['**/*.ts'],
      languageOptions: {
        parser: tsParser as never,
        parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
      },
      plugins: { n: { rules } as never },
      rules: { [`n/${rule}`]: options ? ['error', options] : 'error' } as never,
    },
    'app.controller.ts',
  );
  return messages
    .filter((m) => m.ruleId === `n/${rule}`)
    .map((m) => m.messageId as string);
}

interface Probe {
  rule: string;
  what: string;
  vulnerable: string;
  safe: string;
  options?: unknown;
}

const PROBES: Probe[] = [
  {
    rule: 'require-guards',
    what: 'a private route with no access control (CWE-284)',
    vulnerable: `
      @Controller('users')
      class UsersController {
        @Delete(':id')
        remove(@Param('id') id: string) {}
      }
    `,
    safe: `
      @Controller('users')
      @UseGuards(JwtAuthGuard)
      class UsersController {
        @Delete(':id')
        remove(@Param('id') id: string) {}
      }
    `,
  },
  {
    rule: 'require-guards',
    what: '@UseGuards() that names no guard, so it enforces nothing',
    vulnerable: `
      @Controller('users')
      @UseGuards()
      class UsersController {
        @Delete(':id')
        remove() {}
      }
    `,
    safe: `
      @Controller('users')
      @UseGuards(JwtAuthGuard)
      class UsersController {
        @Delete(':id')
        remove() {}
      }
    `,
  },
  {
    rule: 'require-guards',
    what: 'a namespace-imported decorator hiding an unguarded route',
    vulnerable: `
      @common.Controller('users')
      class UsersController {
        @common.Delete(':id')
        remove() {}
      }
    `,
    safe: `
      @common.Controller('users')
      @common.UseGuards(JwtAuthGuard)
      class UsersController {
        @common.Delete(':id')
        remove() {}
      }
    `,
  },
  {
    rule: 'no-missing-validation-pipe',
    what: 'a body no ValidationPipe can validate (CWE-20)',
    vulnerable: `
      @Controller('users')
      class UsersController {
        @Post()
        create(@Body() payload) {}
      }
    `,
    safe: `
      @Controller('users')
      class UsersController {
        @Post()
        create(@Body() payload: CreateUserDto) {}
      }
    `,
  },
  {
    rule: 'require-throttler',
    what: 'an unauthenticated login route with no rate limiting (CWE-770)',
    vulnerable: `
      @Controller('auth')
      class AuthController {
        @Post('login')
        login(@Body() dto: LoginDto) {}
      }
    `,
    safe: `
      @Controller('auth')
      @Throttle({ default: { limit: 5, ttl: 60000 } })
      class AuthController {
        @Post('login')
        login(@Body() dto: LoginDto) {}
      }
    `,
  },
  {
    rule: 'no-exposed-private-fields',
    what: 'a credential serialized out of an entity (CWE-200)',
    vulnerable: `
      @Entity()
      class UserEntity {
        @Column()
        email: string;
        @Column()
        password: string;
      }
    `,
    safe: `
      @Entity()
      class UserEntity {
        @Column()
        email: string;
        @Exclude()
        @Column()
        password: string;
      }
    `,
  },
  {
    rule: 'require-validation-pipe-whitelist',
    what: 'a ValidationPipe that forwards undeclared properties (CWE-915)',
    vulnerable: `app.useGlobalPipes(new ValidationPipe({ transform: true }));`,
    safe: `app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));`,
  },
  {
    rule: 'no-permissive-cors',
    what: 'a reflected origin combined with credentials (CWE-942)',
    vulnerable: `app.enableCors({ origin: true, credentials: true });`,
    safe: `app.enableCors({ origin: ['https://app.example.com'], credentials: true });`,
  },
  {
    rule: 'no-res-bypass-serialization',
    what: 'an object written past ClassSerializerInterceptor (CWE-200)',
    // The serializer has to be mounted for the bypass to cost anything — the
    // rule requires visible evidence of one before it will accuse a handler.
    vulnerable: `
      @Controller('users')
      @UseInterceptors(ClassSerializerInterceptor)
      class UsersController {
        @Get()
        findAll(@Res() res: Response) { res.json(this.users.findAll()); }
      }
    `,
    safe: `
      @Controller('users')
      @UseInterceptors(ClassSerializerInterceptor)
      class UsersController {
        @Get()
        findAll(@Res({ passthrough: true }) res: Response) { return this.users.findAll(); }
      }
    `,
  },
  {
    rule: 'no-hybrid-app-config-loss',
    what: 'a microservice transport that inherits none of the global pipes and guards (CWE-20)',
    vulnerable: `
      const app = await NestFactory.create(AppModule);
      app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
      app.connectMicroservice<MicroserviceOptions>(createNestjsKafkaConfig());
    `,
    safe: `
      const app = await NestFactory.create(AppModule);
      app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
      app.connectMicroservice<MicroserviceOptions>(createNestjsKafkaConfig(), {
        inheritAppConfig: true,
      });
    `,
  },
];

describe('detection contract: every rule still catches what it exists for', () => {
  it.each(PROBES)('$rule detects $what', ({ rule, vulnerable, options }) => {
    expect(run(rule, vulnerable, options).length).toBeGreaterThan(0);
  });

  it.each(PROBES)(
    '$rule stays silent on the safe twin of: $what',
    ({ rule, safe, options }) => {
      expect(run(rule, safe, options)).toEqual([]);
    },
  );
});

describe('detection contract: the recommended config is usable out of the box', () => {
  /**
   * A correctly-written NestJS application — global guard, global pipe, guarded
   * routes, validated DTOs, excluded credentials — must produce zero findings
   * with every rule enabled. This is the claim that decides whether a
   * maintainer keeps the plugin installed.
   */
  const CLEAN_APP = `
    @Controller('users')
    @UseGuards(JwtAuthGuard)
    class UsersController {
      @Get()
      findAll(@Query() query: ListUsersRequestDto) {}

      @Post()
      create(@Body() dto: CreateUserDto) {}

      @Delete(':id')
      remove(@Param('id') id: string) {}
    }

    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.enableCors({ origin: ['https://app.example.com'], credentials: true });

    @Controller('auth')
    class AuthController {
      @Post('login')
      @Throttle({ default: { limit: 5, ttl: 60000 } })
      login(@Body() dto: LoginDto) {}
    }

    class CreateUserDto {
      @IsEmail()
      email: string;
      @IsString()
      name: string;
    }

    @Entity()
    class UserEntity {
      @Column()
      email: string;
      @Exclude()
      @Column()
      password: string;
      passwordChangedAt: Date;
    }

    class UserResponseDto {
      @ApiProperty()
      email: string;
    }
  `;

  it('reports nothing on a correctly-written application', () => {
    const found = Object.keys(rules).flatMap((rule) =>
      run(rule, CLEAN_APP).map((id) => `${rule}:${id}`),
    );
    expect(found).toEqual([]);
  });
});
