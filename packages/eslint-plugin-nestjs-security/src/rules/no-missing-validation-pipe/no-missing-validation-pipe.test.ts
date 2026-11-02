import { RuleTester } from '@typescript-eslint/rule-tester';
import { noMissingValidationPipe } from './index';

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
const nest = <T>(cases: T[]): T[] =>
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

ruleTester.run('no-missing-validation-pipe', noMissingValidationPipe, {
  valid: nest([
    // nest-framework/.../hello.controller.ts:29 — a custom pipe resolves the id
    // to an entity and throws when it cannot. Matching the literal name
    // `ValidationPipe` reported every one of NestJS's own samples.
    `
      @Controller('users')
      class UsersController {
        @Get(':id')
        findOne(@Param('id', UserByIdPipe) user: any) {}
      }
    `,
    `
      @Controller('users')
      class UsersController {
        @Post()
        create(@Body(CustomValidationPipe) dto: any) {}
      }
    `,
    // A pipe built by a factory has no name to resolve. Unnameable is not the
    // same as absent — something is installed, so the rule abstains.
    `
      @Controller('users')
      class UsersController {
        @Post()
        create(@Body(buildPipe({ transform: true })) dto: any) {}
      }
    `,
    // Optional scalar query params are unions, not unvalidated objects.
    `
      @Controller('u')
      class UsersController {
        @Get()
        find(@Query('error') error: string | undefined) {}
      }
    `,
    // A literal union is still a scalar.
    `
      @Controller('u')
      class UsersController {
        @Get()
        find(@Query('sort') sort: 'asc' | 'desc') {}
      }
    `,
    // ========== VALID: Controller with class-level ValidationPipe ==========
    {
      name: 'the controller carries @UsePipes(ValidationPipe)',
      code: `
        @Controller('users')
        @UsePipes(ValidationPipe)
        class UsersController {
          @Post()
          create(@Body() dto: CreateUserDto) {}
        }
      `,
    },
    // ========== VALID: Controller with method-level ValidationPipe ==========
    {
      code: `
        @Controller('users')
        class UsersController {
          @Post()
          @UsePipes(new ValidationPipe())
          create(@Body() dto: CreateUserDto) {}
        }
      `,
    },
    // ========== VALID: Route without @Body (GET request) ==========
    {
      code: `
        @Controller('users')
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
          create(dto: CreateUserDto) {}
        }
      `,
    },
    // ========== VALID: Primitive type parameters (string) ==========
    {
      code: `
        @Controller('users')
        class UsersController {
          @Get(':id')
          findOne(@Param('id') id: string) {}
        }
      `,
    },
    // ========== VALID: Test file ==========
    {
      code: `
        @Controller('users')
        class UsersController {
          @Post()
          create(@Body() dto: CreateUserDto) {}
        }
      `,
      filename: 'users.controller.spec.ts',
    },
    // ========== VALID: assumeGlobalPipes: true ==========
    {
      code: `
        @Controller('users')
        class UsersController {
          @Post()
          create(@Body() dto: CreateUserDto) {}
        }
      `,
      options: [{ assumeGlobalPipes: true }],
    },
    // ========== VALID: @Param with DTO type (but primitive-like usage) ==========
    {
      code: `
        @Controller('users')
        class UsersController {
          @Delete(':id')
          remove(@Param('id') id: number) {}
        }
      `,
    },
    // ========== VALID: Primitive @Body type (unlikely but allowed) ==========
    {
      code: `
        @Controller('data')
        class DataController {
          @Post()
          process(@Body() data: boolean) {}
        }
      `,
    },
  ]),
  invalid: nest([
    // A global ValidationPipe cannot validate what carries no runtime class.
    // The early return that used to skip the whole file on a global
    // registration hid exactly these.
    {
      name: 'a @Body() typed `any` with no pipe to check it',
      code: `
        @Controller('users')
        class UsersController {
          @Post()
          create(@Body() payload: any) {}
        }
      `,
      errors: [{ messageId: 'missingValidation' }],
    },
    {
      code: `
        @Controller('users')
        class UsersController {
          @Post()
          create(@Body() payload) {}
        }
      `,
      errors: [{ messageId: 'missingValidation' }],
    },
    // ========== INVALID: Missing ValidationPipe with DTO body ==========
    {
      code: `
        @Controller('users')
        class UsersController {
          @Post()
          create(@Body() dto: CreateUserDto) {}
        }
      `,
      options: [{ requireExplicitPipe: true }],
      errors: [{ messageId: 'missingValidation' }],
    },
    // ========== INVALID: Missing ValidationPipe with @Query DTO ==========
    {
      code: `
        @Controller('users')
        class UsersController {
          @Get()
          search(@Query() query: SearchQueryDto) {}
        }
      `,
      options: [{ requireExplicitPipe: true }],
      errors: [{ messageId: 'missingValidation' }],
    },
    // ========== INVALID: Test file with allowInTests: false ==========
    {
      code: `
        @Controller('users')
        class UsersController {
          @Post()
          create(@Body() dto: CreateUserDto) {}
        }
      `,
      filename: 'users.controller.spec.ts',
      options: [{ requireExplicitPipe: true, allowInTests: false }],
      errors: [{ messageId: 'missingValidation' }],
    },
  ]),
});

// Locks for the parameter-scoped pipe and the untyped-@Body false negative.
ruleTester.run(
  'no-missing-validation-pipe (parameter scope)',
  noMissingValidationPipe,
  {
    valid: nest([
      // A pipe applied directly to the parameter validates it.
      `
      @Controller('u')
      class UsersController {
        @Post()
        create(@Body(new ValidationPipe()) dto: CreateDto) {}
      }
    `,
      `
      @Controller('u')
      class UsersController {
        @Post()
        create(@Body(ValidationPipe) dto: CreateDto) {}
      }
    `,
    ]),
    invalid: nest([
      // FN-5: an untyped @Body is the most dangerous shape and was silent.
      {
        code: `
        @Controller('u')
        class UsersController {
          @Post()
          create(@Body() payload) {}
        }
      `,
        options: [{ requireExplicitPipe: true }],
        errors: [{ messageId: 'missingValidation' }],
      },
      // A pipe that is not a ValidationPipe does not validate.
      {
        code: `
        @Controller('u')
        class UsersController {
          @Post()
          create(@Body(new ParseIntPipe()) dto: CreateDto) {}
        }
      `,
        options: [{ requireExplicitPipe: true }],
        errors: [{ messageId: 'missingValidation' }],
      },
    ]),
  },
);

// The default targets shapes no ValidationPipe — global or local — can validate.
// 5 of 8 real applications we measured register a global pipe, so demanding a
// per-route pipe on a typed DTO reported ~465 correctly-validated handlers.
ruleTester.run(
  'no-missing-validation-pipe (unvalidatable shapes)',
  noMissingValidationPipe,
  {
    valid: nest([
      // A typed DTO IS validated by a global ValidationPipe.
      {
        name: 'a typed body DTO is validated by a global ValidationPipe',
        code: `
      @Controller('u')
      class UsersController {
        @Post()
        create(@Body() dto: CreateUserDto) {}
      }
    `,
        options: [{ assumeGlobalPipes: true }],
      },
      {
        name: 'a typed query DTO is validated by a global ValidationPipe',
        code: `
      @Controller('u')
      class UsersController {
        @Get()
        find(@Query() dto: SearchRequestDto) {}
      }
    `,
        options: [{ assumeGlobalPipes: true }],
      },
    ]),
    invalid: nest([
      // No annotation: the pipe has no metatype, so nothing is checked.
      {
        code: `
        @Controller('u')
        class UsersController {
          @Post()
          create(@Body() payload) {}
        }
      `,
        errors: [{ messageId: 'missingValidation' }],
      },
      // `any` is skipped by ValidationPipe.
      {
        code: `
        @Controller('u')
        class UsersController {
          @Post()
          create(@Body() payload: any) {}
        }
      `,
        errors: [{ messageId: 'missingValidation' }],
      },
      // An inline object type has no runtime class to validate against.
      {
        code: `
        @Controller('u')
        class UsersController {
          @Post()
          create(@Body() payload: { name: string }) {}
        }
      `,
        errors: [{ messageId: 'missingValidation' }],
      },
      // `object` / `unknown` likewise.
      {
        code: `
        @Controller('u')
        class UsersController {
          @Post()
          create(@Body() a: object, @Body() b: unknown) {}
        }
      `,
        errors: [
          { messageId: 'missingValidation' },
          { messageId: 'missingValidation' },
        ],
      },
    ]),
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// Quint fidelity model (benchmarks/suites/fidelity/models/nestjs-security)
// ─────────────────────────────────────────────────────────────────────────────
ruleTester.run(
  'no-missing-validation-pipe (fidelity)',
  noMissingValidationPipe,
  {
    valid: nest([
      {
        name: 'a renamed ValidationPipe in @UsePipes validates the route',
        code: `
        import { ValidationPipe as VP } from '@nestjs/common';
        @Controller('users')
        export class UsersController {
          @Post()
          @UsePipes(new VP())
          create(@Body() dto: CreateUserDto) { return dto; }
        }
      `,
        options: [{ detectGlobalPipes: false }],
      },
    ]),
    invalid: nest([
      {
        name: "the doc's ❌ example — a DTO body with no pipe anywhere — is reported",
        code: `
        @Controller('users')
        export class UsersController {
          @Post()
          create(@Body() dto: CreateUserDto) { return dto; }
        }
      `,
        options: [{ detectGlobalPipes: false }],
        errors: [{ messageId: 'missingValidation' }],
      },
      {
        name: 'a query DTO with no pipe anywhere is reported',
        code: `
        @Controller('users')
        export class UsersController {
          @Post()
          create(@Query() dto: CreateUserDto) { return dto; }
        }
      `,
        options: [{ detectGlobalPipes: false }],
        errors: [{ messageId: 'missingValidation' }],
      },
      {
        name: 'a ParseIntPipe in @UsePipes is not a ValidationPipe',
        code: `
        @Controller('users')
        export class UsersController {
          @Post()
          @UsePipes(new ParseIntPipe())
          create(@Body() dto: CreateUserDto) { return dto; }
        }
      `,
        options: [{ detectGlobalPipes: false }],
        errors: [{ messageId: 'missingValidation' }],
      },
      {
        name: 'assumeGlobalPipes does not cover a shape no ValidationPipe can validate',
        code: `
        @Controller('users')
        export class UsersController {
          @Post()
          create(@Body() dto: any) { return dto; }
        }
      `,
        options: [{ assumeGlobalPipes: true }],
        errors: [{ messageId: 'missingValidation' }],
      },
      {
        name: 'requireExplicitPipe demands a per-route pipe even when a global one is assumed',
        code: `
        @Controller('users')
        export class UsersController {
          @Post()
          create(@Body() dto: CreateUserDto) { return dto; }
        }
      `,
        options: [{ assumeGlobalPipes: true, requireExplicitPipe: true }],
        errors: [{ messageId: 'missingValidation' }],
      },
    ]),
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// Mutation audit 2026-11-02: each case pins one claim a surviving mutant broke.
// `detectGlobalPipes: false` keeps the repo's own files out of the answer.
// ─────────────────────────────────────────────────────────────────────────────
const route = (handler: string, decorators = ''): string => `
  @Controller('users')
  class UsersController {
    @Post()
    ${decorators}
    ${handler}
  }
`;
const NO_SCAN = [{ detectGlobalPipes: false }];
ruleTester.run(
  'no-missing-validation-pipe (mutation audit)',
  noMissingValidationPipe,
  {
    valid: nest([
      {
        name: 'a test file is skipped by default (allowInTests)',
        code: route(`create(@Body() dto: CreateUserDto) {}`),
        filename: 'users.controller.spec.ts',
        options: NO_SCAN,
      },
      {
        name: 'a space before the call parenthesis is still a useGlobalPipes call',
        code: `app.useGlobalPipes (new ValidationPipe());\n${route(`create(@Body() dto: CreateUserDto) {}`)}`,
      },
      {
        name: 'a ValidationPipe listed after another pipe still validates the route',
        code: route(
          `create(@Body() dto: CreateUserDto) {}`,
          `@UsePipes(LoggingPipe, ValidationPipe)`,
        ),
        options: NO_SCAN,
      },
      {
        name: 'a custom pipe whose name merely contains Parse…Pipe is a real pipe',
        code: route(
          `create(@Body(new ZodParsePipe(schema)) dto: CreateUserDto) {}`,
        ),
        options: NO_SCAN,
      },
      {
        name: 'a pipe passed as the first argument is a pipe, not a property key',
        code: route(`create(@Body(UserPipe) dto: CreateUserDto) {}`),
        options: NO_SCAN,
      },
      {
        name: 'a method without an HTTP-method decorator is not a route',
        code: `
        @Controller('users')
        class UsersController {
          helper(@Body() dto: CreateUserDto) {}
        }
      `,
        options: NO_SCAN,
      },
    ]),
    invalid: nest([
      {
        name: 'a string property key is not a pipe',
        code: route(`create(@Body('user') user: CreateUserDto) {}`),
        options: NO_SCAN,
        errors: [
          { messageId: 'missingValidation', data: { param: '@Body() user' } },
        ],
      },
      {
        // @found mutation testing
        name: 'FN: a template-literal property key is a key, not a pipe',
        code: route('create(@Body(`user`) user: CreateUserDto) {}'),
        options: NO_SCAN,
        errors: [{ messageId: 'missingValidation' }],
      },
      {
        name: 'a union with a non-scalar member is not a scalar',
        code: route(`create(@Body() payload: string | CreateUserDto) {}`),
        options: NO_SCAN,
        errors: [{ messageId: 'missingValidation' }],
      },
      {
        // @found mutation testing
        name: 'FN: a destructured DTO body with no pipe is unvalidated',
        code: route(`create(@Body() { email, password }: LoginDto) {}`),
        options: NO_SCAN,
        errors: [
          {
            messageId: 'missingValidation',
            data: { param: '@Body() { email, password }' },
          },
        ],
      },
    ]),
  },
);
ruleTester.run(
  'no-missing-validation-pipe (mutation audit, parameter shapes)',
  noMissingValidationPipe,
  {
    valid: nest([
      {
        name: 'a rest parameter binds no request input',
        code: route(`list(...args: unknown[]) {}`),
        options: NO_SCAN,
      },
    ]),
    invalid: nest([
      {
        name: 'a destructured rest element is labelled, not dropped',
        code: route(`create(@Body() { email, ...rest }: LoginDto) {}`),
        options: NO_SCAN,
        errors: [
          {
            messageId: 'missingValidation',
            data: { param: '@Body() { email, … }' },
          },
        ],
      },
    ]),
  },
);
