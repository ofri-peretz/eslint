import { RuleTester } from '@typescript-eslint/rule-tester';
import { noMissingValidationPipe } from './index';

const ruleTester = new RuleTester();

ruleTester.run('no-missing-validation-pipe', noMissingValidationPipe, {
  valid: [
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
  ],
  invalid: [
    // A global ValidationPipe cannot validate what carries no runtime class.
    // The early return that used to skip the whole file on a global
    // registration hid exactly these.
    {
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
  ],
});

// Locks for the parameter-scoped pipe and the untyped-@Body false negative.
ruleTester.run(
  'no-missing-validation-pipe (parameter scope)',
  noMissingValidationPipe,
  {
    valid: [
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
    ],
    invalid: [
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
    ],
  },
);

// The default targets shapes no ValidationPipe — global or local — can validate.
// 5 of 8 real applications we measured register a global pipe, so demanding a
// per-route pipe on a typed DTO reported ~465 correctly-validated handlers.
ruleTester.run(
  'no-missing-validation-pipe (unvalidatable shapes)',
  noMissingValidationPipe,
  {
    valid: [
      // A typed DTO IS validated by a global ValidationPipe.
      `
      @Controller('u')
      class UsersController {
        @Post()
        create(@Body() dto: CreateUserDto) {}
      }
    `,
      `
      @Controller('u')
      class UsersController {
        @Get()
        find(@Query() dto: SearchRequestDto) {}
      }
    `,
    ],
    invalid: [
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
    ],
  },
);
