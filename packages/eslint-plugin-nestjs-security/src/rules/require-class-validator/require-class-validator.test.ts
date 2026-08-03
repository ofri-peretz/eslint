/**
 * Tests for require-class-validator rule
 * Security: CWE-20 (Improper Input Validation)
 * 
 * Edge cases to reveal false positives/negatives:
 * - DTO classes (Dto/Request/Input suffix)
 * - Classes with @ApiProperty decorator
 * - Various class-validator decorators
 * - Private/underscore prefixed fields
 * - Non-DTO classes (should not flag)
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { requireClassValidator } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

/**
 * A minimal on-disk NestJS project. `mode` picks where `whitelist: true` lives:
 * inline in main.ts, in a relative import (the brocoders shape), behind an
 * index.ts barrel, or nowhere at all.
 */
function fixtureFile(mode: 'inline' | 'imported' | 'barrel' | 'none'): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nestjs-wl-'));
  fs.writeFileSync(path.join(dir, 'package.json'), '{"name":"fx","private":true}');
  const opts = 'export default { transform: true, whitelist: true };';
  if (mode === 'inline') {
    fs.writeFileSync(
      path.join(dir, 'main.ts'),
      'app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));',
    );
  } else if (mode === 'imported') {
    fs.writeFileSync(path.join(dir, 'validation-options.ts'), opts);
    fs.writeFileSync(
      path.join(dir, 'main.ts'),
      "import validationOptions from './validation-options';\napp.useGlobalPipes(new ValidationPipe(validationOptions));",
    );
  } else if (mode === 'barrel') {
    fs.mkdirSync(path.join(dir, 'config'));
    fs.writeFileSync(path.join(dir, 'config', 'index.ts'), opts);
    fs.writeFileSync(
      path.join(dir, 'main.ts'),
      "import validationOptions from './config';\napp.useGlobalPipes(new ValidationPipe(validationOptions));",
    );
  } else {
    fs.writeFileSync(path.join(dir, 'validation-options.ts'), 'export default { transform: true };');
    fs.writeFileSync(
      path.join(dir, 'main.ts'),
      "import validationOptions from './validation-options';\napp.useGlobalPipes(new ValidationPipe(validationOptions));",
    );
  }
  return path.join(dir, 'file.dto.ts');
}

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

describe('require-class-validator', () => {
  describe('Valid Code - Properties with Validators', () => {
    ruleTester.run('valid - validated properties', requireClassValidator, {
      valid: [
        // @IsString and @IsNotEmpty
        {
          code: `
            class CreateUserDto {
              @IsString()
              @IsNotEmpty()
              name: string;
            }
          `,
        },
        // @IsEmail
        {
          code: `
            class CreateUserDto {
              @IsEmail()
              email: string;
            }
          `,
        },
        // @IsOptional for optional fields
        {
          code: `
            class UpdateUserDto {
              @IsOptional()
              @IsString()
              name?: string;
            }
          `,
        },
        // @IsNumber
        {
          code: `
            class CreateProductDto {
              @IsNumber()
              @Min(0)
              price: number;
            }
          `,
        },
        // @ValidateNested
        {
          code: `
            class OrderDto {
              @ValidateNested({ each: true })
              items: ItemDto[];
            }
          `,
        },
        // @Matches (regex)
        {
          code: `
            class CreateUserDto {
              @Matches(/^[a-zA-Z]+$/)
              username: string;
            }
          `,
        },
        // @Validate (custom validator)
        {
          code: `
            class CustomDto {
              @Validate(CustomConstraint)
              field: string;
            }
          `,
        },
        // @ValidateIf (conditional validation)
        {
          code: `
            class ConditionalDto {
              @ValidateIf(o => o.type === 'premium')
              @IsNotEmpty()
              premiumField: string;
            }
          `,
        },
      ],
      invalid: [],
    });
  });

  describe('Valid Code - Non-DTO Classes', () => {
    ruleTester.run('valid - non-dto classes', requireClassValidator, {
      valid: [
        // Service class
        {
          code: `
            class UserService {
              name: string;
            }
          `,
        },
        // Entity class (not a DTO naming pattern)
        {
          code: `
            class User {
              name: string;
            }
          `,
        },
        // Controller class
        {
          code: `
            @Controller('users')
            class UsersController {
              service: UsersService;
            }
          `,
        },
      ],
      invalid: [],
    });
  });

  describe('Valid Code - Private Fields', () => {
    ruleTester.run('valid - private underscore fields', requireClassValidator, {
      valid: [
        // Underscore prefix (private convention)
        {
          code: `
            class CreateUserDto {
              @IsString()
              name: string;
              _internalId: string;
            }
          `,
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Missing Validators', () => {
    ruleTester.run('invalid - missing validation', requireClassValidator, {
      valid: [],
      invalid: [
        // DTO property without validators
        {
          code: `
            class CreateUserDto {
              name: string;
            }
          `,
          errors: [{ messageId: 'missingValidator' }],
        },
        // Multiple properties without validators
        {
          code: `
            class CreateUserDto {
              name: string;
              email: string;
              age: number;
            }
          `,
          errors: [
            { messageId: 'missingValidator' },
            { messageId: 'missingValidator' },
            { messageId: 'missingValidator' },
          ],
        },
        // Request suffix class
        {
          code: `
            class CreateUserRequest {
              username: string;
            }
          `,
          errors: [{ messageId: 'missingValidator' }],
        },
        // Input suffix class
        {
          code: `
            class UserInput {
              email: string;
            }
          `,
          errors: [{ messageId: 'missingValidator' }],
        },
        // Partial validation (some fields validated, some not)
        {
          code: `
            class CreateUserDto {
              @IsString()
              name: string;
              email: string;
            }
          `,
          errors: [{ messageId: 'missingValidator' }],
        },
      ],
    });
  });

  describe('Edge Cases', () => {
    ruleTester.run('edge cases - complex scenarios', requireClassValidator, {
      valid: [
        // Nested validation
        {
          code: `
            class ComplexDto {
              @ValidateNested()
              nested: NestedDto;
            }
          `,
        },
      ],
      invalid: [
        // Nested object without ValidateNested
        {
          code: `
            class ComplexDto {
              nested: NestedDto;
            }
          `,
          errors: [{ messageId: 'missingValidator' }],
        },
      ],
    });
  });

  describe('Response DTOs (regression: 303 findings on ack, 20 on brocoders)', () => {
    ruleTester.run('response DTOs are output, not input', requireClassValidator, {
      valid: [
        // ack-nestjs-boilerplate: modules/hello/dtos/response/hello.response.dto.ts
        {
          code: `
            class HelloDateResponseDto {
              @ApiProperty({ required: true })
              date: Date;

              @ApiProperty({ required: true })
              iso: string;
            }
          `,
        },
        // ack: common/response/dtos/response.paging.dto.ts
        {
          code: `
            class ResponsePagingDto {
              @ApiProperty()
              totalData: number;
            }
          `,
        },
        // ack: modules/user/dtos/user.dto.ts — @Expose marks a serialization
        // model even though the class name says nothing about responses
        {
          code: `
            class UserDto {
              @ApiProperty({ required: false })
              @Expose()
              name?: string;

              @ApiProperty({ required: true })
              @Expose()
              username: string;
            }
          `,
        },
        // ack: a DTO extending a shared response base class
        {
          code: `
            class SessionDto extends DatabaseResponseDto {
              @ApiProperty()
              id: string;
            }
          `,
        },
        // brocoders: auth/dto/login-response.dto.ts
        {
          code: `
            class LoginResponseDto {
              @ApiProperty()
              token: string;

              @ApiProperty()
              refreshToken: string;
            }
          `,
        },
        // Class-level @Exclude() marks the whole class as serialization output
        {
          code: `
            @Exclude()
            class UserProfileDto {
              id: string;
            }
          `,
        },
        // brocoders: auth-apple/dto/auth-apple-login.dto.ts — @Allow() is an
        // explicit class-validator whitelist decision
        {
          code: `
            class AuthAppleLoginDto {
              @ApiProperty({ example: 'abc' })
              @IsNotEmpty()
              idToken: string;

              @Allow()
              @ApiPropertyOptional()
              firstName?: string;
            }
          `,
        },
        // ack: common/file/dtos/file.single.dto.ts — multipart upload slot
        {
          code: `
            class FileUploadSingleRequestDto {
              @ApiProperty({ type: 'string', format: 'binary', description: 'Single file' })
              file: IFile;
            }
          `,
        },
        // ack: common/file/dtos/file.multiple.dto.ts — nested items schema
        {
          code: `
            class FileUploadMultipleRequestDto {
              @ApiProperty({
                type: 'array',
                items: { type: 'string', format: 'binary' },
              })
              files: IFile[];
            }
          `,
        },
        // Extended class-validator vocabulary must be recognised
        {
          code: `
            class SettingsDto {
              @IsIn(['a', 'b'])
              mode: string;

              @IsStrongPassword()
              password: string;

              @IsTimeZone()
              tz: string;
            }
          `,
        },
      ],
      invalid: [
        // TRUE POSITIVE (brocoders): request DTO fields with no validator at
        // all — the rule must not go inert.
        {
          code: `
            class CreateUserDto {
              @ApiProperty()
              @IsEmail()
              email: string;

              provider?: string;

              socialId?: string | null;
            }
          `,
          errors: [
            { messageId: 'missingValidator', data: { property: 'provider' } },
            { messageId: 'missingValidator', data: { property: 'socialId' } },
          ],
        },
        // A response-shaped class is still checked when asked for explicitly
        {
          code: `
            class LoginResponseDto {
              @ApiProperty()
              token: string;
            }
          `,
          options: [{ checkResponseDtos: true }],
          errors: [{ messageId: 'missingValidator', data: { property: 'token' } }],
        },
        // A custom responseDtoPattern narrows the exemption
        {
          code: `
            class UserViewDto {
              @ApiProperty()
              id: string;
            }
          `,
          options: [{ responseDtoPattern: 'Response' }],
          errors: [{ messageId: 'missingValidator', data: { property: 'id' } }],
        },
        // @Transform / @Type alone do NOT mark a class as a response DTO —
        // request DTOs legitimately use them for coercion.
        {
          code: `
            class CreateUserDto {
              @Transform(lowerCaseTransformer)
              email: string;
            }
          `,
          errors: [{ messageId: 'missingValidator', data: { property: 'email' } }],
        },
        // @ApiProperty without a `format: 'binary'` schema is still checked
        {
          code: `
            class UploadDto {
              @ApiProperty({ type: 'string', description: 'not a file' })
              name: string;
            }
          `,
          errors: [{ messageId: 'missingValidator', data: { property: 'name' } }],
        },
        // Bare @ApiProperty (no argument object) is still checked
        {
          code: `
            class UploadDto {
              @ApiProperty
              name: string;
            }
          `,
          errors: [{ messageId: 'missingValidator', data: { property: 'name' } }],
        },
        // A spread inside the schema object is not a `format` declaration
        {
          code: `
            class UploadDto {
              @ApiProperty({ ...baseSchema })
              name: string;
            }
          `,
          errors: [{ messageId: 'missingValidator', data: { property: 'name' } }],
        },
      ],
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// A global ValidationPipe with `whitelist: true` strips undecorated properties,
// so they never arrive from a request. Reporting them as unvalidated input is a
// false positive — measured on brocoders/nestjs-boilerplate, which sets
// whitelist and still drew 5 findings on server-set fields (`provider`,
// `socialId`, `path`).
// ─────────────────────────────────────────────────────────────────────────────
ruleTester.run('require-class-validator (whitelisting pipe)', requireClassValidator, {
  valid: [
    {
      code: `
        export class FileDto {
          @IsString()
          id: string;

          path: string;
        }
      `,
      options: [{ assumeWhitelistingPipe: true }],
    },
    // The real scan path: a throwaway project on disk whose main.ts registers
    // `new ValidationPipe({ whitelist: true })`. Built in the OS temp dir on
    // purpose — a fixture inside this package would be found by the scan for
    // every other test and silence them all.
    {
      code: `
        export class FileDto {
          @IsString()
          id: string;

          path: string;
        }
      `,
      filename: fixtureFile('inline'),
    },
    // The brocoders shape: options live in a relative import.
    {
      code: `
        export class FileDto {
          @IsString()
          id: string;

          path: string;
        }
      `,
      filename: fixtureFile('imported'),
    },
    // Same, behind an index.ts barrel.
    {
      code: `
        export class FileDto {
          @IsString()
          id: string;

          path: string;
        }
      `,
      filename: fixtureFile('barrel'),
    },
  ],
  invalid: [
    // Same source, without the whitelisting pipe: still reported.
    {
      code: `
        export class FileDto {
          @IsString()
          id: string;

          path: string;
        }
      `,
      options: [{ assumeWhitelistingPipe: false, detectWhitelistingPipe: false }],
      errors: 1,
    },
    // Pipe registered, options imported, but no whitelist anywhere → still reported.
    {
      code: `
        export class FileDto {
          @IsString()
          id: string;

          path: string;
        }
      `,
      filename: fixtureFile('none'),
      errors: 1,
    },
  ],
});
