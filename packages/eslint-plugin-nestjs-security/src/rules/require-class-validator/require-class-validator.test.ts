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
function fixtureFile(
  mode:
    | 'inline'
    | 'imported'
    | 'barrel'
    | 'deep-barrel'
    | 'custom-validator'
    | 'none',
): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nestjs-wl-'));
  fs.writeFileSync(
    path.join(dir, 'package.json'),
    '{"name":"fx","private":true}',
  );
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
  } else if (mode === 'custom-validator') {
    // No global pipe here on purpose — the class must be spared because the
    // decorator validates, not because a whitelist would strip the field.
    fs.mkdirSync(path.join(dir, 'validators'));
    fs.writeFileSync(
      path.join(dir, 'validators', 'same-as.validator.ts'),
      "import { registerDecorator, ValidationOptions } from 'class-validator';\n" +
        'export function SameAs(property: string, opts?: ValidationOptions) {\n' +
        '  return (object: object, propertyName: string) => {\n' +
        "    registerDecorator({ name: 'sameAs', target: object.constructor, propertyName });\n" +
        '  };\n}',
    );
  } else if (mode === 'deep-barrel') {
    // The commonest NestJS layout: main.ts imports a barrel, and the barrel
    // only re-exports. The answer is two hops away, and a one-hop scan
    // concluded the project does not whitelist — then reported the very fields
    // the whitelist exists to strip. Real path in the corpus:
    // nestjs-starter-rest-api/src/{main.ts, shared/constants/index.ts,
    // shared/constants/common.ts}.
    fs.mkdirSync(path.join(dir, 'shared'));
    fs.mkdirSync(path.join(dir, 'shared', 'constants'));
    fs.writeFileSync(
      path.join(dir, 'shared', 'constants', 'common.ts'),
      'export const VALIDATION_PIPE_OPTIONS = { transform: true, whitelist: true };',
    );
    fs.writeFileSync(
      path.join(dir, 'shared', 'constants', 'index.ts'),
      "export * from './common';",
    );
    fs.writeFileSync(
      path.join(dir, 'main.ts'),
      "import { VALIDATION_PIPE_OPTIONS } from './shared/constants';\napp.useGlobalPipes(new ValidationPipe(VALIDATION_PIPE_OPTIONS));",
    );
  } else if (mode === 'barrel') {
    fs.mkdirSync(path.join(dir, 'config'));
    fs.writeFileSync(path.join(dir, 'config', 'index.ts'), opts);
    fs.writeFileSync(
      path.join(dir, 'main.ts'),
      "import validationOptions from './config';\napp.useGlobalPipes(new ValidationPipe(validationOptions));",
    );
  } else {
    fs.writeFileSync(
      path.join(dir, 'validation-options.ts'),
      'export default { transform: true };',
    );
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
        // amplication / twenty / ultimate-backend: GraphQL input types. The schema
        // already enforces scalar types and nullability, so the type-confusion this
        // rule guards against is handled before a resolver ever runs. Telling a
        // maintainer to decorate every field of every generated `WhereInput` is not
        // actionable — this shape alone was 1,449 of 1,773 corpus findings.
        `
      import { Field, InputType } from '@nestjs/graphql';

      @InputType()
      export class ResourceWhereInput {
        @Field(() => String, { nullable: true })
        id?: string;

        @Field(() => String, { nullable: true })
        name?: string;
      }
    `,
        // ultimate-backend: @InputType re-exported through a project barrel — the
        // name still identifies it.
        `
      import { Field, InputType } from '../../common/graphql';

      @InputType()
      export class UserFilterInput {
        @Field(() => String, { nullable: true })
        email?: string;
      }
    `,
        // No import in the snippet at all: nothing contradicts the name.
        `
      @InputType()
      export class TenantWhereInput {
        @Field(() => String, { nullable: true })
        slug?: string;
      }
    `,
        `
      import { ArgsType, Field } from '@nestjs/graphql';

      @ArgsType()
      export class EntityFindManyArgs {
        @Field(() => Number, { nullable: true })
        take?: number;
      }
    `,

        // novu: an @Injectable() service whose name ends in "Request". A provider
        // is never a request payload, whatever it is called.
        `
      @Injectable()
      export class PasswordResetRequest {
        private MAX_ATTEMPTS_IN_A_MINUTE = 5;
        private RATE_LIMIT_IN_SECONDS = 60;
      }
    `,
        // Accessibility is the point: private/protected members are not part of
        // the payload a ValidationPipe ever populates.
        `
      export class CreateUserDto {
        @IsEmail()
        email: string;
        private attempts = 0;
        protected trace: string;
      }
    `,
        // twenty: environment configuration validated once at boot. It uses
        // class-validator, but the undecorated members are defaults, not fields a
        // request can set — and nothing else marks the class as inbound.
        `
      export class ConfigVariables {
        @IsString()
        @IsOptional()
        PASSWORD_RESET_TOKEN_EXPIRES_IN = '5m';

        CALENDAR_PROVIDER_GOOGLE_ENABLED = false;

        LOG_LEVELS = ['error'];
      }
    `,

        // A composed project decorator counts as validation (awesome-nest-boilerplate
        // ships @StringField/@NumberFieldOptional/@ClassFieldOptional wrapping class-validator).
        `
      class CreateUserDto {
        @NumberFieldOptional({ minimum: 1, maximum: 50 })
        readonly take: number = 10;
      }
    `,
        // A custom validator name supplied via options.
        {
          code: `
        class CreateUserDto {
          @MyCustomCheck()
          name: string;
        }
      `,
          options: [{ validatorDecorators: ['MyCustomCheck'] }],
        },
        // @nestjs/graphql's bare @Field() is a schema decorator, not validation.
        // Treating it as one made every TypeORM entity look like a validated DTO.
        `
      @Entity()
      class ApplicationEntity {
        @Field()
        @Column({ nullable: false, type: 'text' })
        name: string;
        @Column({ nullable: true, type: 'uuid' })
        ownerId: string;
      }
    `,
        // The @Schema()/@ViewEntity() decorator forms are excluded too.
        `
      @Schema()
      class UserDoc {
        @Prop()
        email: string;
        legacyField: string;
      }
    `,
        // Persistence classes are the database shape, not a request payload.
        `
      class BillingPriceEntity {
        @Column()
        amount: number;
        currency: string;
      }
    `,
        // A verb prefix alone is not a DTO: this is a Svelte view-model from
        // immich's frontend, matched by an earlier `^Edit[A-Z]` heuristic.
        `
      class EditManager {
        isShowingConfirmDialog = false;
        currentAsset = null;
      }
    `,
        // Verb-prefixed *responses* are still responses.
        `
      class SetAgentMcpServersFailureDto {
        @ApiProperty()
        mcpId: string;
      }
    `,
        `
      class DeleteTopicSubscriptionsResponseDto {
        @ApiProperty()
        subscriberId: string;
      }
    `,
        // An entity mapper carries decorators for serialisation, not validation.
        `
      class AbstractDto {
        @DateField()
        createdAt: Date;
        translations?: AbstractTranslationDto[];
        constructor(entity: AbstractEntity) {}
      }
    `,
        // Outbound classes whose names no suffix blocklist would catch.
        `
      class TestDomainRouteAgentResultDto {
        @ApiProperty()
        agentId: string;
      }
    `,
        `
      class SubscriptionErrorDto {
        @ApiProperty()
        subscriberId: string;
      }
    `,
        // Response-shaped classes are outbound: @ApiProperty for Swagger, no validators.
        `
      class AgentIntegrationResponseDto {
        identifier: string;
      }
    `,
        `
      class WorkflowRunsPayload {
        cursor: string;
      }
    `,
        // A class with no name (anonymous expression) is not a DTO.
        `const C = class { name: string; };`,
        // A name with no DTO-ish suffix is not a DTO.
        `class Helper { name: string; }`,
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
      invalid: [
        // Opt in and the same class is reported — the semantic checks GraphQL does
        // not do (length, format, enum) are a real gap for teams that want them.
        {
          code: `
        import { Field, InputType } from '@nestjs/graphql';

        @InputType()
        export class ResourceWhereInput {
          @Field(() => String, { nullable: true })
          id?: string;
        }
      `,
          options: [{ checkGraphqlInputs: true }],
          errors: [{ messageId: 'missingValidator' }],
        },
        // A REST DTO that merely *imports* from @nestjs/graphql is not exempt.
        {
          code: `
        import { IsString } from 'class-validator';

        export class CreateUserRequestDto {
          @IsString()
          name: string;
          role: string;
        }
      `,
          errors: [{ messageId: 'missingValidator' }],
        },

        // A default does not make a named DTO's field safe — a request still sets
        // it. Only the inferred-by-sibling path treats initialisers as defaults.
        {
          code: `
        export class CreateUserDto {
          @IsEmail()
          email: string;
          role: string = 'user';
        }
      `,
          errors: [{ messageId: 'missingValidator' }],
        },
      ],
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
            class CreateComplexDto {
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
            class CreateComplexDto {
              nested: NestedDto;
            }
          `,
          errors: [{ messageId: 'missingValidator' }],
        },
      ],
    });
  });
});

// Locks for the members the rule must not treat as inbound payload.
ruleTester.run(
  'require-class-validator (member skips)',
  requireClassValidator,
  {
    valid: [
      // FP-4: statics are class constants.
      `
      class CreateUserDto {
        static readonly TABLE = 'users';
        static defaults = {};
      }
    `,
      // A field stripped from the payload needs no validator.
      `
      class CreateUserDto {
        @Exclude()
        internalId: string;
      }
    `,
      // Computed keys have no static name.
      `
      class CreateUserDto {
        [dynamicKey]: string;
      }
    `,
    ],
    invalid: [
      // A class that already validates *something* is inbound: the bare members
      // beside the validated one are real gaps.
      {
        code: `
        class SignupPayload {
          @IsString()
          email: string;
          socialId: string;
        }
      `,
        errors: [{ messageId: 'missingValidator' }],
      },
    ],
  },
);
// ─────────────────────────────────────────────────────────────────────────────
// A global ValidationPipe with `whitelist: true` strips undecorated properties,
// so they never arrive from a request. Reporting them as unvalidated input is a
// false positive — measured on brocoders/nestjs-boilerplate, which sets
// whitelist and still drew 5 findings on server-set fields (`provider`,
// `socialId`, `path`).
// ─────────────────────────────────────────────────────────────────────────────
ruleTester.run(
  'require-class-validator (whitelisting pipe)',
  requireClassValidator,
  {
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
      // Two hops: main.ts imports a barrel, the barrel only re-exports, and the
      // options live beyond it. This is the commonest NestJS layout and a
      // one-hop scan concluded the project does not whitelist — then reported
      // the very fields the whitelist exists to strip.
      {
        code: `
        export class FileDto {
          @IsString()
          id: string;

          path: string;
        }
      `,
        filename: fixtureFile('deep-barrel'),
      },
      // A constraint authored with class-validator's own registerDecorator is
      // a validator. vivify-nestjs-boilerplate's @SameAs('password') is one,
      // and was reported as unvalidated. No global pipe in this fixture on
      // purpose: the class must be spared because the decorator validates, not
      // because a whitelist would strip the field.
      {
        code: `
        import { SameAs } from './validators/same-as.validator';

        export class RegisterPayload {
          @IsString()
          password: string;

          @SameAs('password')
          passwordConfirmation: string;
        }
      `,
        filename: fixtureFile('custom-validator'),
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
        options: [
          { assumeWhitelistingPipe: false, detectWhitelistingPipe: false },
        ],
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
  },
);
