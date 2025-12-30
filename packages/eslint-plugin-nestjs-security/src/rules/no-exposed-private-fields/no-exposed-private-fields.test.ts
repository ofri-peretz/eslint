/**
 * Tests for no-exposed-private-fields rule
 * Security: CWE-200 (Exposure of Sensitive Information)
 * 
 * Edge cases to reveal false positives/negatives:
 * - Entity classes with @Entity decorator
 * - DTO classes with Dto/Entity/Model/Schema suffix
 * - GraphQL types with @ObjectType, @InputType
 * - Classes with @ApiProperty (Swagger)
 * - Non-entity/DTO classes (should not flag)
 * - Fields with @Exclude decorator (should not flag)
 * - Various sensitive field patterns
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noExposedPrivateFields } from './index';

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

describe('no-exposed-private-fields', () => {
  describe('Valid Code - Properly Excluded Fields', () => {
    ruleTester.run('valid - excluded fields', noExposedPrivateFields, {
      valid: [
        // @Exclude on password
        {
          code: `
            @Entity()
            class User {
              id: string;
              email: string;
              @Exclude()
              password: string;
            }
          `,
        },
        // @Exclude on apiKey
        {
          code: `
            class UserEntity {
              @Exclude()
              apiKey: string;
              name: string;
            }
          `,
        },
        // @Exclude on multiple sensitive fields
        {
          code: `
            @Entity()
            class User {
              @Exclude()
              password: string;
              @Exclude()
              refreshToken: string;
              @Exclude()
              salt: string;
            }
          `,
        },
        // @Exclude() with call expression
        {
          code: `
            class UserDto {
              @Exclude()
              secret: string;
            }
          `,
        },
        // Exclude as identifier (without parentheses)
        {
          code: `
            class UserDto {
              @Exclude
              privateKey: string;
            }
          `,
        },
      ],
      invalid: [],
    });
  });

  describe('Valid Code - Non-Sensitive Classes', () => {
    ruleTester.run('valid - non-entity classes', noExposedPrivateFields, {
      valid: [
        // Regular class (not entity/dto)
        {
          code: `
            class AuthService {
              password: string;
            }
          `,
        },
        // Service class
        {
          code: `
            class UserService {
              private secret: string;
            }
          `,
        },
        // DTO without sensitive fields
        {
          code: `
            class UserResponseDto {
              id: string;
              email: string;
              name: string;
            }
          `,
        },
        // Entity without sensitive fields
        {
          code: `
            @Entity()
            class Category {
              id: string;
              name: string;
              description: string;
            }
          `,
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Exposed Sensitive Fields', () => {
    ruleTester.run('invalid - exposed passwords', noExposedPrivateFields, {
      valid: [],
      invalid: [
        // Entity with exposed password
        {
          code: `
            @Entity()
            class User {
              password: string;
            }
          `,
          errors: [{ messageId: 'exposedField' }],
        },
        // Entity with exposed passwordHash
        {
          code: `
            @Entity()
            class User {
              passwordHash: string;
            }
          `,
          errors: [{ messageId: 'exposedField' }],
        },
        // DTO with exposed secret
        {
          code: `
            class UserDto {
              secret: string;
            }
          `,
          errors: [{ messageId: 'exposedField' }],
        },
        // Entity suffix class
        {
          code: `
            class UserEntity {
              token: string;
            }
          `,
          errors: [{ messageId: 'exposedField' }],
        },
        // Model suffix class
        {
          code: `
            class UserModel {
              apiKey: string;
            }
          `,
          errors: [{ messageId: 'exposedField' }],
        },
        // Schema suffix class
        {
          code: `
            class UserSchema {
              secretKey: string;
            }
          `,
          errors: [{ messageId: 'exposedField' }],
        },
        // Multiple exposed fields
        {
          code: `
            class UserEntity {
              password: string;
              apiKey: string;
              salt: string;
            }
          `,
          errors: [
            { messageId: 'exposedField' },
            { messageId: 'exposedField' },
            { messageId: 'exposedField' },
          ],
        },
      ],
    });
  });

  describe('Invalid Code - Decorated Classes', () => {
    ruleTester.run('invalid - decorated classes', noExposedPrivateFields, {
      valid: [],
      invalid: [
        // @Schema (Mongoose)
        {
          code: `
            @Schema()
            class Credential {
              privateKey: string;
            }
          `,
          errors: [{ messageId: 'exposedField' }],
        },
        // @ObjectType (GraphQL)
        {
          code: `
            @ObjectType()
            class User {
              password: string;
            }
          `,
          errors: [{ messageId: 'exposedField' }],
        },
        // @InputType (GraphQL)
        {
          code: `
            @InputType()
            class CreateUser {
              secretToken: string;
            }
          `,
          errors: [{ messageId: 'exposedField' }],
        },
      ],
    });
  });

  describe('Edge Cases', () => {
    ruleTester.run('edge cases', noExposedPrivateFields, {
      valid: [
        // Partially excluded - only sensitive fields excluded
        {
          code: `
            @Entity()
            class User {
              id: string;
              @Exclude()
              password: string;
              email: string;
            }
          `,
        },
      ],
      invalid: [
        // Mixed - some excluded, some exposed
        {
          code: `
            @Entity()
            class User {
              @Exclude()
              password: string;
              apiKey: string;
            }
          `,
          errors: [{ messageId: 'exposedField' }],
        },
        // Underscore variants
        {
          code: `
            @Entity()
            class Api {
              api_key: string;
            }
          `,
          errors: [{ messageId: 'exposedField' }],
        },
      ],
    });
  });
});
