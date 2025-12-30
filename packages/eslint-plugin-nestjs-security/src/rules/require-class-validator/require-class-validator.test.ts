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
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { requireClassValidator } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

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
});
