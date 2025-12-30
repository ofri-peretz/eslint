import { RuleTester } from '@typescript-eslint/rule-tester';
import { noMissingValidationPipe } from './index';

const ruleTester = new RuleTester();

ruleTester.run('no-missing-validation-pipe', noMissingValidationPipe, {
  valid: [
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
  ],
  invalid: [
    // ========== INVALID: Missing ValidationPipe with DTO body ==========
    {
      code: `
        @Controller('users')
        class UsersController {
          @Post()
          create(@Body() dto: CreateUserDto) {}
        }
      `,
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
      options: [{ allowInTests: false }],
      errors: [{ messageId: 'missingValidation' }],
    },
  ],
});
