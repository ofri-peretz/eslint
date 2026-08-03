/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Real-world regression lock.
 *
 * Every fixture here is a shape taken from one of the ten high-star NestJS
 * codebases we measure against, reduced to the smallest form that still
 * reproduces the behaviour. Each row pins the exact findings the whole plugin
 * produces for that shape.
 *
 * This exists because unit tests were not enough. While narrowing
 * `require-class-validator`, one heuristic change took the corpus from 414 to
 * 726 findings and every unit test stayed green — the regression was only
 * visible in a five-minute corpus run. A fix that quietly breaks a different
 * pattern is the failure mode to design against, so the patterns themselves are
 * pinned here and run in milliseconds.
 *
 * When a row changes, that is not automatically a bug — but it must be a
 * decision, made deliberately, with the number updated in the same commit.
 */
import { describe, it, expect } from 'vitest';
import { Linter } from 'eslint';
import tsParser from '@typescript-eslint/parser';
import { rules } from './index';

const linter = new Linter({ configType: 'flat' });
const ALL = Object.keys(rules);

/** Findings across every rule, as `rule` → count, omitting zeroes. */
function findings(
  code: string,
  filename = 'app.controller.ts',
): Record<string, number> {
  const messages = linter.verify(
    code,
    {
      files: ['**/*.ts'],
      languageOptions: {
        parser: tsParser as never,
        parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
      },
      plugins: { n: { rules } as never },
      rules: Object.fromEntries(ALL.map((r) => [`n/${r}`, 'error'])) as never,
    },
    filename,
  );
  const out: Record<string, number> = {};
  for (const m of messages) {
    const id = m.ruleId?.replace(/^n\//, '');
    if (!id || !ALL.includes(id)) continue;
    out[id] = (out[id] ?? 0) + 1;
  }
  return out;
}

interface Fixture {
  from: string;
  what: string;
  code: string;
  expected: Record<string, number>;
}

const FIXTURES: Fixture[] = [
  {
    from: 'immich',
    what: 'controller guarded by a project auth decorator imported from a guard module',
    code: `
      import { Controller, Post } from '@nestjs/common';
      import { Auth, Authenticated } from 'src/middleware/auth.guard';
      import { AuthDto } from 'src/dtos/auth.dto';

      @Controller('admin/auth')
      export class AuthAdminController {
        @Post('unlink-all')
        @Authenticated({ permission: 'AdminAuthUnlinkAll', admin: true })
        unlinkAll(@Auth() auth: AuthDto): Promise<void> {}
      }
    `,
    expected: {},
  },
  {
    from: 'novu',
    what: 'route guarded by @RequireAuthentication with Swagger decorators alongside',
    code: `
      import { Controller, Get, Query } from '@nestjs/common';
      import { ApiTags, ApiOkResponse } from '@nestjs/swagger';
      import { RequireAuthentication } from '../auth/framework/auth.decorator';
      import { GetSubscribersDto } from './dtos';

      @ApiTags('Subscribers')
      @Controller('/subscribers')
      export class SubscribersV1Controller {
        @Get('')
        @RequireAuthentication()
        @ApiOkResponse({ type: String })
        list(@Query() query: GetSubscribersDto) {}
      }
    `,
    expected: {},
  },
  {
    from: 'awesome-nest-boilerplate',
    what: 'composed class-validator decorators on a request DTO',
    code: `
      import { NumberFieldOptional, StringField } from '../../decorators';

      export class PageOptionsDto {
        @NumberFieldOptional({ minimum: 1, default: 1 })
        readonly page: number = 1;

        @StringField()
        readonly q: string;
      }
    `,
    expected: {},
  },
  {
    from: 'twenty',
    what: 'TypeORM entity with @nestjs/graphql @Field() — not a validated DTO',
    code: `
      import { Column, Entity, ManyToOne } from 'typeorm';
      import { Field, ObjectType } from '@nestjs/graphql';

      @Entity()
      @ObjectType()
      export class ApplicationEntity {
        @Field()
        @Column({ nullable: false, type: 'text' })
        name: string;

        @Column({ nullable: true, type: 'uuid' })
        ownerId: string;
      }
    `,
    expected: {},
  },
  {
    from: 'brocoders',
    what: 'versioned @Controller({ path }) with a public login route',
    code: `
      import { Body, Controller, HttpCode, Post } from '@nestjs/common';
      import { AuthAppleLoginDto } from './dto/auth-apple-login.dto';

      @Controller({ path: 'auth/apple', version: '1' })
      export class AuthAppleController {
        @Post('login')
        @HttpCode(200)
        login(@Body() loginDto: AuthAppleLoginDto) {}
      }
    `,
    // Public by design, so no guard is required — but an unthrottled login is
    // brute-forceable, which is exactly the division of labour between the two.
    expected: { 'require-throttler': 1 },
  },
  {
    from: 'novu',
    what: 'response DTO documented with Swagger and no validators',
    code: `
      import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

      export class TestDomainRouteAgentResultDto {
        @ApiProperty()
        agentId: string;

        @ApiPropertyOptional()
        latencyMs?: number;
      }
    `,
    expected: {},
  },
  {
    from: 'brocoders',
    what: 'refresh endpoint response that returns tokens by design',
    code: `
      import { ApiProperty } from '@nestjs/swagger';

      export class RefreshResponseDto {
        @ApiProperty()
        token: string;

        @ApiProperty()
        refreshToken: string;
      }
    `,
    expected: {},
  },
  {
    from: 'novu',
    what: 'environment-variable response carrying an isSecret flag',
    code: `
      import { ApiProperty } from '@nestjs/swagger';

      export class EnvironmentVariableResponseDto {
        @ApiProperty()
        key: string;

        @ApiProperty()
        isSecret: boolean;
      }
    `,
    expected: {},
  },
  {
    from: 'immich',
    what: 'frontend view-model with a mutating-verb name',
    code: `
      export class EditManager {
        currentAsset = null;
        isShowingConfirmDialog = false;
      }
    `,
    expected: {},
  },
  {
    from: 'amplication',
    what: 'entity with a credential column and no @Exclude',
    code: `
      import { Column, Entity } from 'typeorm';

      @Entity()
      export class UserEntity {
        @Column()
        email: string;

        @Column()
        password: string;

        @Column()
        passwordChangedAt: Date;
      }
    `,
    expected: { 'no-exposed-private-fields': 1 },
  },
  {
    from: 'immich',
    what: 'admin route guarded by @MaintenanceRoute from a local *-auth.guard module',
    // Resolved by import origin — no `authDecorators` configuration needed.
    code: `
      import { Controller, Get } from '@nestjs/common';
      import { MaintenanceRoute } from './maintenance-auth.guard';

      @Controller('admin')
      export class MaintenanceWorkerController {
        @Get('database-backups')
        @MaintenanceRoute()
        listBackups() {}
      }
    `,
    expected: {},
  },
  {
    from: 'synthesised',
    what: 'a decorator named like a validator but imported from @nestjs/graphql',
    // The package settles it: the name must not override the origin.
    code: `
      import { Field, ObjectType } from '@nestjs/graphql';

      @ObjectType()
      export class CreateThingDto {
        @Field()
        name: string;
      }
    `,
    expected: { 'require-class-validator': 1 },
  },
  {
    from: 'synthesised',
    what: 'a validator imported from class-validator under an alias',
    // The origin settles it even though the local name is unrecognisable.
    code: `
      import { IsString as MustBeText } from 'class-validator';

      export class CreateThingDto {
        @MustBeText()
        name: string;
        other: string;
      }
    `,
    expected: { 'require-class-validator': 1 },
  },
  {
    from: 'synthesised',
    what: 'a locally declared auth decorator with an auth-ish name',
    code: `
      import { Controller, Get } from '@nestjs/common';

      const RequiresRole = () => () => {};

      @Controller('reports')
      export class ReportsController {
        @Get()
        @RequiresRole()
        list() {}
      }
    `,
    expected: {},
  },
  {
    from: 'nestjs-realworld',
    what: '@ApiBearerAuth() documents bearer auth in Swagger but enforces nothing',
    // Name matching read "Auth" and suppressed the finding. The import origin
    // settles it: @nestjs/swagger is documentation, not enforcement. This repo
    // has zero @UseGuards — its actual auth is middleware wired in a module,
    // which no single-file rule can see (same class as a global APP_GUARD).
    code: `
      import { Controller, Delete, Get } from '@nestjs/common';
      import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

      @ApiBearerAuth()
      @ApiTags('articles')
      @Controller('articles')
      export class ArticleController {
        @Get()
        findAll() {}

        @Delete(':slug')
        remove() {}
      }
    `,
    expected: { 'require-guards': 2 },
  },
  {
    from: 'nest samples',
    what: 'genuinely unguarded private route with an unvalidatable body',
    code: `
      import { Body, Controller, Delete, Post } from '@nestjs/common';

      @Controller('cats')
      export class CatsController {
        @Post()
        create(@Body() payload) {}

        @Delete(':id')
        remove() {}
      }
    `,
    expected: { 'require-guards': 2, 'no-missing-validation-pipe': 1 },
  },
  {
    from: 'synthesised',
    what: 'unguarded admin route with only recognised decorators',
    code: `
      import { Controller, Get, HttpCode } from '@nestjs/common';
      import { ApiTags } from '@nestjs/swagger';

      @ApiTags('ops')
      @Controller('internal')
      export class OpsController {
        @Get('debug')
        @HttpCode(200)
        dump() {}
      }
    `,
    expected: { 'require-guards': 1, 'no-exposed-debug-endpoints': 1 },
  },
  {
    from: 'brocoders',
    what: 'ValidationPipe built from options declared in another module',
    // `new ValidationPipe(validationOptions)` — this file cannot prove whitelist
    // is missing, so the rule must not guess.
    code: `
      import { ValidationPipe } from '@nestjs/common';
      import validationOptions from './utils/validation-options';

      async function bootstrap() {
        const app = await NestFactory.create(AppModule, { cors: true });
        app.useGlobalPipes(new ValidationPipe(validationOptions));
      }
    `,
    expected: {},
  },
  {
    from: 'novu',
    what: 'global ValidationPipe with transform but no whitelist',
    code: `
      import { ValidationPipe } from '@nestjs/common';

      export function setupPipes(app) {
        app.useGlobalPipes(
          new ValidationPipe({ transform: true, forbidUnknownValues: false })
        );
      }
    `,
    expected: { 'require-validation-pipe-whitelist': 1 },
  },
  {
    from: 'novu',
    what: 'wildcard CORS with no credentials — a public API, not a finding',
    code: `
      export function bootstrap(app) {
        app.enableCors({
          origin: '*',
          preflightContinue: false,
          allowedHeaders: ['Content-Type', 'Authorization'],
          methods: ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        });
      }
    `,
    expected: {},
  },
  {
    from: 'ultimate-backend',
    what: 'CORS reflecting the request origin while allowing credentials',
    code: `
      import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

      export const corsOptions: CorsOptions = {
        origin: true,
        credentials: true,
        optionsSuccessStatus: 200,
      };
    `,
    expected: { 'no-permissive-cors': 1 },
  },
  {
    from: 'awesome-nest-bp',
    what: 'an explicit origin allow-list with credentials',
    code: `
      export function bootstrap(app) {
        app.enableCors({
          origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
          methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
          credentials: true,
        });
      }
    `,
    expected: {},
  },
  {
    from: 'immich',
    what: 'a route that streams a file through @Res()',
    // Nothing is serialised, so the serialization bypass cannot leak anything.
    code: `
      import { Controller, Get, Res } from '@nestjs/common';
      import { Authenticated } from 'src/middleware/auth.guard';

      @Controller('assets')
      export class AssetMediaController {
        @Get(':id/original')
        @Authenticated()
        download(@Res() res: Response) {
          res.sendFile(this.path);
        }
      }
    `,
    expected: {},
  },
  {
    from: 'amplication',
    what: 'a health check writing a string literal through @Res()',
    code: `
      import { Controller, Get, Res } from '@nestjs/common';

      @Controller('health')
      export class HealthController {
        @Get('live')
        liveness(@Res() res: Response) {
          res.status(200).send('ok');
        }
      }
    `,
    // Public by design: 'health' is in require-guards' public-route defaults
    // and dropped from no-exposed-debug-endpoints' list for the same reason.
    expected: {},
  },
  {
    from: 'novu',
    what: 'a guarded route writing a domain object through @Res()',
    code: `
      import { Controller, Post, Res } from '@nestjs/common';
      import { RequireAuthentication } from '../auth/framework/auth.decorator';

      @Controller('chat')
      export class WebChatController {
        @Post('session')
        @RequireAuthentication()
        async session(@Res() res: Response) {
          res.status(200).json(await this.service.createSession());
        }
      }
    `,
    expected: { 'no-res-bypass-serialization': 1 },
  },
  {
    from: 'novu',
    what: 'an @Injectable() service whose name ends in "Request"',
    // DTO_NAME's `(Request|Input|Body|…)$` half is unanchored at the start, so
    // the name matched. @Injectable() settles it: the injector builds this, no
    // request body ever does.
    code: `
      import { Injectable } from '@nestjs/common';

      @Injectable()
      export class PasswordResetRequest {
        private MAX_ATTEMPTS_IN_A_MINUTE = 5;
        private RATE_LIMIT_IN_SECONDS = 60;

        async execute(command: PasswordResetRequestCommand) {}
      }
    `,
    expected: {},
  },
  {
    from: 'twenty',
    what: 'boot-time environment config that validates itself with class-validator',
    // Nothing names this class inbound; it is admitted only because siblings
    // carry validators. On that weaker evidence an initialiser is a default,
    // not a field a request fills — this shape alone was 40 findings.
    code: `
      import { IsOptional, IsString } from 'class-validator';

      export class ConfigVariables {
        @IsString()
        @IsOptional()
        PASSWORD_RESET_TOKEN_EXPIRES_IN = '5m';

        CALENDAR_PROVIDER_GOOGLE_ENABLED = false;

        LOG_LEVELS = ['error'];
      }
    `,
    expected: {},
  },
  {
    from: 'amplication',
    what: 'a generated GraphQL filter input with no class-validator decorators',
    // The GraphQL schema enforces scalar types and nullability before a
    // resolver runs, so the type-confusion require-class-validator guards
    // against is already handled. This shape alone was 1,449 of 1,773 corpus
    // findings — almost all generated filter inputs. Opt in with
    // `checkGraphqlInputs` for the semantic checks GraphQL does not do.
    code: `
      import { Field, InputType } from '@nestjs/graphql';

      @InputType()
      export class ResourceWhereInput {
        @Field(() => String, { nullable: true })
        id?: string;

        @Field(() => String, { nullable: true })
        name?: string;
      }
    `,
    expected: {},
  },
];

describe('real-world regression lock', () => {
  it.each(FIXTURES)('$from: $what', ({ code, expected }) => {
    expect(findings(code)).toEqual(expected);
  });
});
