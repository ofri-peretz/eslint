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
      {
        name: 'an array-destructured parameter is not a shape this rule reads',
        code: route(`create(@Body() [first]: Item[]) {}`),
        options: NO_SCAN,
      },
      {
        name: 'a default-valued scalar parameter is still a scalar',
        code: route(`list(@Query('page') page: number = 1) {}`),
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
      {
        name: 'a nested destructuring is labelled by a placeholder, not by a missing name',
        code: route(
          `create(@Body() { email, profile: { name } }: LoginDto) {}`,
        ),
        options: NO_SCAN,
        errors: [
          {
            messageId: 'missingValidation',
            data: { param: '@Body() { email, … }' },
          },
        ],
      },
      {
        // @found mutation testing
        name: 'FN: a default-valued DTO body with no pipe is unvalidated',
        code: route(`create(@Body() dto: CreateDto = {}) {}`),
        options: NO_SCAN,
        errors: [
          { messageId: 'missingValidation', data: { param: '@Body() dto' } },
        ],
      },
      {
        // @found mutation testing
        name: 'FN: a default-valued destructured body with no pipe is unvalidated',
        code: route(`create(@Body() { email }: LoginDto = {}) {}`),
        options: NO_SCAN,
        errors: [
          {
            messageId: 'missingValidation',
            data: { param: '@Body() { email }' },
          },
        ],
      },
    ]),
  },
);

/**
 * NestJS 12 Standard Schema. `@Body({ schema })` attaches the schema as
 * metadata and nothing more: `StandardSchemaValidationPipe#transform` is the
 * only reader (`if (!schema) return value`), and `ValidationPipe` never looks
 * at it. So the schema is enforced exactly when that pipe runs on the route.
 */
ruleTester.run(
  'no-missing-validation-pipe (NestJS 12 Standard Schema)',
  noMissingValidationPipe,
  {
    valid: nest([
      {
        name: 'a schema is enforced by the schema pipe on the controller',
        code: `
          @Controller('users')
          @UsePipes(StandardSchemaValidationPipe)
          class UsersController {
            @Post()
            create(@Body({ schema: createUserSchema }) body: any) {}
          }
        `,
        options: NO_SCAN,
      },
      {
        name: 'a schema is enforced by the schema pipe on the handler',
        code: route(
          `@UsePipes(new StandardSchemaValidationPipe()) create(@Body({ schema }) body) {}`,
        ),
        options: NO_SCAN,
      },
      {
        name: 'a schema is enforced by the schema pipe listed in the same options',
        code: route(
          `create(@Body({ schema, pipes: [StandardSchemaValidationPipe] }) body) {}`,
        ),
        options: NO_SCAN,
      },
      {
        name: 'a schema is enforced by the schema pipe passed after the options',
        code: route(
          `find(@Param('id', { schema }, new StandardSchemaValidationPipe()) id: number) {}`,
        ),
        options: NO_SCAN,
      },
      {
        name: 'a schema is taken as enforced when a global pipe is registered',
        code: route(`create(@Body({ schema }) body: any) {}`),
        options: [{ assumeGlobalPipes: true }],
      },
      {
        name: 'a pipe listed in the options object is a parameter pipe',
        code: route(
          `create(@Body({ pipes: [UserByIdPipe] }) dto: CreateDto) {}`,
        ),
        options: NO_SCAN,
      },
      {
        name: 'a pipe listed after a hole in the options list still counts',
        code: route(
          `create(@Body({ pipes: [, UserByIdPipe] }) dto: CreateDto) {}`,
        ),
        options: NO_SCAN,
      },
      {
        name: 'a pipes list held in a variable gets the benefit of the doubt',
        code: route(`create(@Body({ pipes: bodyPipes }) dto: CreateDto) {}`),
        options: NO_SCAN,
      },
      {
        name: 'an object with a transform member is itself a pipe',
        code: route(
          `create(@Body({ transform: (value) => parse(value) }) dto: CreateDto) {}`,
        ),
        options: NO_SCAN,
      },
      {
        name: 'an options object built from a spread may carry a pipe',
        code: route(`create(@Body({ ...bodyOptions }) dto: CreateDto) {}`),
        options: NO_SCAN,
      },
      {
        name: 'an options object with a computed key may carry a pipe',
        code: route(`create(@Body({ [key]: value }) dto: CreateDto) {}`),
        options: NO_SCAN,
      },
    ]),
    invalid: nest([
      {
        // @found NestJS 12 release notes, verified in standard-schema-validation.pipe.ts
        name: 'FN: a schema with no pipe to enforce it validates nothing',
        code: route(
          `create(@Body({ schema: createUserSchema }) body: CreateUserDto) {}`,
        ),
        options: NO_SCAN,
        errors: [
          { messageId: 'schemaWithoutPipe', data: { param: '@Body() body' } },
        ],
      },
      {
        // @found NestJS 12 release notes, verified in standard-schema-validation.pipe.ts
        name: 'FN: a schema on a scalar parameter is still a constraint nothing applies',
        code: route(
          `find(@Param('id', { schema: z.coerce.number().int() }) id: number) {}`,
        ),
        options: NO_SCAN,
        errors: [
          { messageId: 'schemaWithoutPipe', data: { param: '@Param() id' } },
        ],
      },
      {
        name: 'a Parse*Pipe beside the schema does not enforce the schema',
        code: route(
          `find(@Param('id', { schema, pipes: [ParseIntPipe] }) id: number) {}`,
        ),
        options: NO_SCAN,
        errors: [{ messageId: 'schemaWithoutPipe' }],
      },
      {
        name: 'requireExplicitPipe does not accept a global pipe for a schema either',
        code: route(`create(@Body({ schema }) body: any) {}`),
        options: [{ assumeGlobalPipes: true, requireExplicitPipe: true }],
        errors: [{ messageId: 'schemaWithoutPipe' }],
      },
      {
        name: 'the schema pipe with no schema to read validates nothing',
        code: route(
          `create(@Body(new StandardSchemaValidationPipe()) dto: CreateDto) {}`,
        ),
        options: NO_SCAN,
        errors: [{ messageId: 'missingValidation' }],
      },
      {
        name: 'the schema pipe on the route validates only parameters that declare a schema',
        code: route(
          `@UsePipes(StandardSchemaValidationPipe) create(@Body() dto: CreateDto) {}`,
        ),
        options: NO_SCAN,
        errors: [{ messageId: 'missingValidation' }],
      },
      {
        // @found NestJS 12 release notes, verified in parameter-decorator-options.util.ts
        name: 'FN: an options object with no pipe in it is not a pipe',
        code: route(`create(@Body({ pipes: [] }) dto: CreateDto) {}`),
        options: NO_SCAN,
        errors: [{ messageId: 'missingValidation' }],
      },
      {
        name: 'a pipes list holding only a hole lists no pipe',
        code: route(`create(@Body({ pipes: [,] }) dto: CreateDto) {}`),
        options: NO_SCAN,
        errors: [{ messageId: 'missingValidation' }],
      },
      {
        name: 'a string key named like an option is a key, and the options follow it',
        code: route(`find(@Query('schema', { schema }) filter: Filter) {}`),
        options: NO_SCAN,
        errors: [{ messageId: 'schemaWithoutPipe' }],
      },
      {
        name: 'a string-literal schema key is the same option',
        code: route(
          `create(@Body({ 'schema': createUserSchema }) body: any) {}`,
        ),
        options: NO_SCAN,
        errors: [{ messageId: 'schemaWithoutPipe' }],
      },
    ]),
  },
);

/**
 * One named value is not an object of them. Measured on 79 NestJS
 * repositories: `@Param('id') id` and `@Query('page') page = 1` were 105 of
 * this rule's 489 reports, and the advice on each was to add a pipe that does
 * nothing for a primitive.
 */
ruleTester.run(
  'no-missing-validation-pipe (keyed scalars)',
  noMissingValidationPipe,
  {
    valid: nest([
      {
        // @found real-source (brocoders/nestjs-boilerplate, files.controller)
        name: 'FP: an unannotated path parameter is a URL segment, always a string',
        code: route(`download(@Param('path') path) {}`),
        options: NO_SCAN,
      },
      {
        name: 'a path parameter is a string whatever it is annotated as',
        code: route(`find(@Param('id') id: UserId) {}`),
        options: NO_SCAN,
      },
      {
        // @found real-source (novu, notification.controller)
        name: 'FP: an unannotated query value with a default is as validated as a string one',
        code: route(`graph(@Query('days') days = 32) {}`),
        options: NO_SCAN,
      },
      {
        // @found real-source (nestjs/nest, sample/03-microservices)
        name: 'FP: an unannotated keyed query value is as validated as a string one',
        code: route(`call(@Query('command') cmd) {}`),
        options: NO_SCAN,
      },
      {
        // @found real-source (bookorbit, book-metadata-fetch.controller)
        name: 'FP: a parsed, default-valued query value is a number',
        code: route(
          `list(@Query('page', new ParseIntPipe({ optional: true })) page = 1) {}`,
        ),
        options: NO_SCAN,
      },
      {
        name: 'requireExplicitPipe has no pipe to demand for a path parameter',
        code: route(`find(@Param('id') id) {}`),
        options: [{ assumeGlobalPipes: true, requireExplicitPipe: true }],
      },
    ]),
    invalid: nest([
      {
        name: 'a whole query object with no annotation is still unvalidated',
        code: route(`findAll(@Query() query) {}`),
        options: NO_SCAN,
        errors: [{ messageId: 'missingValidation' }],
      },
      {
        name: 'a whole params object with no annotation is still unvalidated',
        code: route(`update(@Param() params) {}`),
        options: NO_SCAN,
        errors: [{ messageId: 'missingValidation' }],
      },
      {
        name: 'a keyed body field is whatever JSON the client sent',
        code: route(`login(@Body('code') code) {}`),
        options: NO_SCAN,
        errors: [{ messageId: 'missingValidation' }],
      },
      {
        name: 'a keyed query value annotated as an object shape is still unvalidated',
        code: route(
          `find(@Query('projection') projection: { [field: string]: boolean }) {}`,
        ),
        options: NO_SCAN,
        errors: [{ messageId: 'missingValidation' }],
      },
      {
        name: 'a keyed query value annotated as a DTO is still unvalidated',
        code: route(`find(@Query('filter') filter: FilterDto) {}`),
        options: NO_SCAN,
        errors: [{ messageId: 'missingValidation' }],
      },
      {
        name: 'a schema on a path parameter is still a constraint nothing applies',
        code: route(`find(@Param('id', { schema }) id) {}`),
        options: NO_SCAN,
        errors: [{ messageId: 'schemaWithoutPipe' }],
      },
    ]),
  },
);
