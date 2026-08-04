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
        // DTO with exposed secret — opt-in via includeDtos (a DTO field is a
        // declared contract; see the regression block at the bottom of this file)
        {
          code: `
            class UserDto {
              secret: string;
            }
          `,
          options: [{ includeDtos: true }],
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
      valid: [
        // @InputType (GraphQL) is a *request* contract — the GraphQL
        // equivalent of a DTO — so it follows `includeDtos`, which is off
        // by default. A LoginInput must carry a password.
        {
          code: `
            @InputType()
            class LoginInput {
              password: string;
            }
          `,
        },
        // @ArgsType (GraphQL), same reasoning
        {
          code: `
            @ArgsType()
            class ResetPasswordArgs {
              token: string;
            }
          `,
        },
        // The decorator outranks the class name: an @InputType is an input
        // even when it is named like an entity.
        {
          code: `
            @InputType()
            class UserEntity {
              password: string;
            }
          `,
        },
      ],
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
        // @InputType (GraphQL) with includeDtos: true — the opt-in restores
        // the older, noisier behaviour for request contracts.
        {
          code: `
            @InputType()
            class CreateUser {
              secretToken: string;
            }
          `,
          options: [{ includeDtos: true }],
          errors: [{ messageId: 'exposedField' }],
        },
        // @ArgsType (GraphQL) with includeDtos: true
        {
          code: `
            @ArgsType()
            class ResetPasswordArgs {
              token: string;
            }
          `,
          options: [{ includeDtos: true }],
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

  describe('DTOs (regression: 44 findings on ack, 22 on brocoders)', () => {
    ruleTester.run('DTO fields are declared contracts', noExposedPrivateFields, {
      valid: [
        // brocoders: auth/dto/login-response.dto.ts — a login response MUST
        // carry a token; flagging it is a contradiction.
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
        // brocoders: auth/dto/auth-reset-password.dto.ts — a password reset
        // request MUST carry a password.
        {
          code: `
            class AuthResetPasswordDto {
              @IsNotEmpty()
              password: string;

              @IsNotEmpty()
              hash: string;
            }
          `,
        },
        // ack: app/dtos/app.env.dto.ts — environment validation DTO, never
        // serialized to a client.
        {
          code: `
            class AppEnvDto {
              @IsString()
              AUTH_JWT_ACCESS_TOKEN_SECRET_KEY: string;

              @IsString()
              DATABASE_PASSWORD: string;
            }
          `,
        },
        // ack: modules/user/dtos/user.dto.ts
        {
          code: `
            class UserDto {
              @Expose()
              passwordExpired: Date;
            }
          `,
        },
      ],
      invalid: [
        // TRUE POSITIVE (brocoders): TypeORM entity exposing the password hash
        {
          code: `
            @Entity({ name: 'user' })
            export class UserEntity extends EntityRelationalHelper {
              @Column({ nullable: true })
              password?: string;
            }
          `,
          errors: [{ messageId: 'exposedField', data: { field: 'password' } }],
        },
        // TRUE POSITIVE (brocoders): mongoose schema exposing the session hash
        {
          code: `
            @Schema({ timestamps: true })
            export class SessionSchemaClass extends EntityDocumentHelper {
              @Prop()
              hash: string;
            }
          `,
          errors: [{ messageId: 'exposedField', data: { field: 'hash' } }],
        },
        // Entity suffix without a decorator is still tracked
        {
          code: `
            export class TokenEntity {
              refreshToken: string;
            }
          `,
          errors: [{ messageId: 'exposedField', data: { field: 'refreshToken' } }],
        },
        // includeDtos: true restores the old, noisier behaviour
        {
          code: `
            class LoginResponseDto {
              token: string;
            }
          `,
          options: [{ includeDtos: true }],
          errors: [{ messageId: 'exposedField', data: { field: 'token' } }],
        },
      ],
    });
  });
});
