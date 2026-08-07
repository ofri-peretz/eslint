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
        // prisma-starter/src/user/models/user.model.ts:36 — @HideField() is
        // @nestjs/graphql's @Exclude(): the property never reaches the schema.
        `
      @ObjectType()
      class UserModel {
        @HideField()
        password: string;
      }
    `,
        // twenty/.../api-key-token.dto.ts and .../auth-token-pair.dto.ts — an
        // @ObjectType() named after the credential exists to return it. This used
        // to be reported because the decorator was checked before the name.
        `
      @ObjectType()
      class ApiKeyToken {
        @Field(() => String)
        token: string;
      }
    `,
        `
      @ObjectType()
      class AuthTokenPairDTO {
        @Field(() => AuthToken)
        accessToken: AuthToken;
        @Field(() => AuthToken)
        refreshToken: AuthToken;
      }
    `,
        // prisma-starter/src/auth/models/token.model.ts — the bare name.
        `
      @ObjectType()
      class Token {
        @Field(() => GraphQLJWT, { description: 'JWT access token' })
        accessToken: string;
      }
    `,
        // A GraphQL @InputType is submitted by the client and never returned, so a
        // credential-named field on it cannot be *exposed* — this rule is CWE-200,
        // data leaving. Previously asserted as a finding; that expectation was
        // wrong. Validating such a field is require-class-validator's job.
        `
      @InputType()
      class CreateUser {
        secretToken: string;
      }
    `,

        // FP-D1 — the ORM already excludes it from every query result. Each stack
        // spells the same guarantee differently, and @Exclude() is not the only
        // proof of safety.
        `
      class UserModel {
        @prop({ required: true, select: false })
        password: string;
      }
    `,
        `
      class UserEntity {
        @Property({ hidden: true })
        password: string;
      }
    `,
        `
      @Entity()
      class UserEntity {
        @Column({ select: false })
        password: string;
      }
    `,
        // FP-D2 — an inbound payload. @Exclude() here is a no-op at best and
        // breaks the request under excludeExtraneousValues.
        `
      class RegisterPayload {
        @IsString()
        password: string;
      }
    `,
        // FP-D3 — the token IS the payload. Following the rule's advice here
        // would break sign-in.
        `
      class SignInResponseDto {
        @ApiProperty()
        access_token: string;
        @ApiProperty()
        refresh_token: string;
      }
    `,

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
      invalid: [
        // Persistence still outranks the name: a stored credential is serialized
        // outward whatever the class is called.
        {
          code: `
        @Entity()
        class ApiKeyToken {
          @Column()
          apiSecret: string;
        }
      `,
          errors: [{ messageId: 'exposedField' }],
        },
        // …and a credential riding along on an unrelated payload is the finding
        // this rule exists for.
        {
          code: `
        @ObjectType()
        class UserProfileModel {
          @Field()
          apiSecret: string;
        }
      `,
          errors: [{ messageId: 'exposedField' }],
        },
        // "Cannot prove excluded" is not "proved excluded". A non-literal
        // projection value and a spread both leave the question open, so the rule
        // proceeds and reports rather than assuming safety.
        {
          code: `
        class TokenEntity {
          @Column({ select: shouldSelect })
          secret: string;
        }
      `,
          errors: [{ messageId: 'exposedField' }],
        },
        {
          code: `
        class SessionEntity {
          @Column({ ...columnOpts })
          secret: string;
        }
      `,
          errors: [{ messageId: 'exposedField' }],
        },

        // A persisted class stays in scope whatever it is named — the inbound-verb
        // exclusion must not override the @Entity fact.
        {
          code: `
        @Entity()
        class CreateAuditEntryEntity {
          @Column()
          password: string;
        }
      `,
          errors: [{ messageId: 'exposedField' }],
        },
      ],
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
        // Response DTO with exposed secret
        {
          code: `
            class UserResponseDto {
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

// Regression locks for the token-aligned matcher and the skip rules.
ruleTester.run('no-exposed-private-fields (matching)', noExposedPrivateFields, {
  valid: [
    // A boolean flag says *whether* something is secret; it is not the secret.
    `
      class EnvironmentVariableResponseDto {
        @ApiProperty()
        isSecret: boolean;
        hasToken: boolean;
        requiresPassword;
      }
    `,
    // A login/refresh endpoint returns a token by definition.
    `
      class RefreshResponseDto {
        @ApiProperty()
        token: string;
        @ApiProperty()
        refreshToken: string;
      }
    `,
    `
      class LoginResponsePayload {
        accessToken: string;
      }
    `,
    // A request DTO must be able to carry a password: that is inbound payload,
    // not a leak. Matching every `*Dto` reported every login form in every repo.
    `
      class AuthEmailLoginDto {
        email: string;
        password: string;
      }
    `,
    `
      class LoginPayloadDto {
        accessToken: string;
      }
    `,
    // FP-2: substring matches are not word matches.
    `
      @Entity()
      class OrderEntity {
        shippingAddress: string;
        hashtags: string[];
        pinnedAt: Date;
        tokenizer: string;
      }
    `,
    // FP-3: a timestamp about a credential is not the credential.
    `
      @Entity()
      class UserEntity {
        passwordChangedAt: Date;
        tokenExpiresAt: Date;
      }
    `,
    // Statics are class constants, not instance payload.
    `
      @Entity()
      class UserEntity {
        static readonly PASSWORD_MIN = 8;
        static secret = 'build-time';
      }
    `,
    // A class-level @Exclude() (excludeAll strategy) covers every field.
    `
      @Entity()
      @Exclude()
      class SecretEntity {
        password: string;
      }
    `,
    // Anonymous class expression with no entity decorator.
    `const C = class { password: string; };`,
    // Computed key has no static name.
    `
      @Entity()
      class TokenEntity {
        [dynamicKey]: string;
      }
    `,
  ],
  invalid: [
    // Qualifier-prefixed credentials still match.
    {
      code: `
        @Entity()
        class UserEntity {
          hashedPassword: string;
          userApiKey: string;
          securityPin: number;
        }
      `,
      errors: [
        { messageId: 'exposedField' },
        { messageId: 'exposedField' },
        { messageId: 'exposedField' },
      ],
    },
    // snake_case is tokenized the same way.
    {
      code: `
        @Entity()
        class UserEntity {
          refresh_token: string;
        }
      `,
      errors: [{ messageId: 'exposedField' }],
    },
    // Custom terms extend the defaults.
    {
      code: `
        @Entity()
        class UserEntity {
          internalNote: string;
        }
      `,
      options: [{ sensitivePatterns: ['internalNote'] }],
      errors: [{ messageId: 'exposedField' }],
    },
  ],
});
