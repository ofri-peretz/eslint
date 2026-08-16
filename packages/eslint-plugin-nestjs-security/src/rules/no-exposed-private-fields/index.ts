/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-exposed-private-fields
 * Detects exposed sensitive fields in response DTOs
 * CWE-200: Exposure of Sensitive Information to an Unauthorized Actor
 *
 * @see https://cwe.mitre.org/data/definitions/200.html
 * @see https://docs.nestjs.com/techniques/serialization
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { fileUsesNestjs } from '../../utils/nestjs-evidence';
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';
import {
  decoratorCall,
  enclosingClass,
  hasDecorator,
  isTestFile,
  isTrueLiteral,
  memberName,
  objectProperties,
  type ClassNode,
} from '../../utils/nest-ast';
import {
  compileSensitiveTerms,
  isSensitiveName,
} from '../../utils/sensitive-names';

type MessageIds = 'exposedField';

export interface Options {
  /** Allow in test files. Default: true */
  allowInTests?: boolean;
  /** Custom sensitive field patterns. Default: password, secret, token, etc. */
  sensitivePatterns?: string[];
}

type RuleOptions = [Options?];

/**
 * Field names that must not be serialized into API responses.
 *
 * These are matched token-wise, not as substrings — see
 * `utils/sensitive-names`. Substring matching flagged `shippingAddress`
 * (contains "pin") and `hashtags` (contains "hash").
 */
const DEFAULT_SENSITIVE_TERMS = [
  'password',
  'passwordHash',
  'passwd',
  'pwd',
  'secret',
  'clientSecret',
  'token',
  'accessToken',
  'refreshToken',
  'sessionToken',
  'apiKey',
  'accessKey',
  'secretKey',
  'privateKey',
  'salt',
  'ssn',
  'creditCard',
  'cardNumber',
  'cvv',
  'cvc',
  'pin',
  'otp',
  'mfaSecret',
  'totpSecret',
];

export const noExposedPrivateFields = createRule<RuleOptions, MessageIds>({
  name: 'no-exposed-private-fields',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-nestjs-security/docs/rules/no-exposed-private-fields.md',
      description: 'Detects sensitive fields not excluded from serialization',
      cwe: 'CWE-200',
      cvss: 7.5,
    },
    messages: {
      exposedField: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Exposed Sensitive Field',
        cwe: 'CWE-200',
        owasp: 'A01:2021',
        cvss: 7.5,
        description:
          'Sensitive field "{{field}}" may be exposed in API responses',
        severity: 'HIGH',
        fix: 'Add @Exclude() decorator or use class-transformer to exclude from responses',
        documentationLink: 'https://docs.nestjs.com/techniques/serialization',
      }),

    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: { type: 'boolean', default: true },
          sensitivePatterns: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Extra field-name patterns to treat as sensitive',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ allowInTests: true, sensitivePatterns: [] }],
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options = {}],
  ) {
    // Registering no visitors is both the gate and the cheap path: a file
    // that does not use this SDK does no work at all.
    if (!fileUsesNestjs(context.sourceCode.ast)) return {};

    const { allowInTests = true, sensitivePatterns = [] } = options as Options;

    if (allowInTests && isTestFile(context.filename)) {
      return {};
    }

    const terms = compileSensitiveTerms([
      ...DEFAULT_SENSITIVE_TERMS,
      ...sensitivePatterns,
    ]);

    /** Decorators that mark a class as something serialized back to clients. */
    /**
     * Class decorators marking something that is serialized *outward*.
     *
     * `@InputType()` and `@ArgsType()` are deliberately absent: they are
     * GraphQL *inputs*, submitted by the client and never returned, so a
     * credential-named field on one cannot be exposed. They were in this set,
     * which made every `@InputType()` a reporting surface for a rule about
     * data leaving. `@ObjectType()` stays — that one is returned.
     */
    /**
     * Persistence. A stored class is serialized outward whatever it is called,
     * so its name cannot argue it out of scope.
     */
    const PERSISTED_DECORATORS = new Set(['Entity', 'Schema']);

    /**
     * Transport. `@ObjectType()` and `@ApiProperty` say the class is returned
     * to a caller — which is exactly the question the name answers next. These
     * used to sit in the same set as the persistence decorators, so an
     * `@ObjectType() class ApiKeyToken` short-circuited to "in scope" before
     * the credential-delivery check could run, and twenty's entire auth DTO
     * directory was reported for carrying the token it exists to return.
     */
    const TRANSPORT_DECORATORS = new Set(['ObjectType', 'ApiProperty']);

    /**
     * Classes whose purpose is to deliver a credential to the caller.
     *
     * A login/refresh/token endpoint returns a token by definition — flagging
     * `RefreshResponseDto.refreshToken` is noise, not a finding. The risk this
     * rule exists for is a credential riding along on an *unrelated* payload.
     */
    const CREDENTIAL_DELIVERY =
      /(Login|SignIn|SignUp|Register|Auth|Refresh|Token|Session|Credential|Verify|Otp|Mfa|TwoFactor)\w*(Response|ResponseDto|Payload|Result)$/;

    /**
     * Classes named after the credential they carry.
     *
     * `ApiKeyToken`, `AuthTokenPairDTO`, `LoginTokenDTO`, `RotateClientSecretDTO`,
     * and the bare `Token` model prisma-starter returns from its login
     * mutation — the credential is the payload, not a passenger on it. The
     * name must *end* with the credential word (optionally followed by a shape
     * suffix), so `UserEntity` with a `token` column stays firmly in scope.
     */
    const CREDENTIAL_NAMED =
      /(^|[a-z])(Token|Credential|Secret|ApiKey|Otp|Mfa)(Pair)?(DTO|Dto|Object|Output|Model)?$/;

    /**
     * Whether the class is a *response* shape.
     *
     * Deliberately excludes plain `*Dto`. A `LoginDto` or `AuthEmailLoginDto`
     * must carry a `password` field — that is inbound payload, not a leak, and
     * matching on `Dto$` reported every login form in every real repository.
     * Only entities, persisted models and explicitly response-named classes
     * are serialized back to clients.
     */
    /**
     * Class names that describe a *request* body.
     *
     * `RegisterPayload` matches the `Payload$` response convention while being
     * bound with `@Body()` and never returned. `@Exclude()` on it is a no-op at
     * best, and under `excludeExtraneousValues` it strips the field the request
     * depends on — so the rule's own advice would break the endpoint.
     */
    const INBOUND_NAME =
      /^(Create|Update|Patch|Upsert|Register|SignUp|SignIn|Login|Reset|Change|Verify|Send|Request)[A-Z]/;

    function isEntityOrDto(cls: ClassNode): boolean {
      const name = cls.id?.name;
      // Checked first: a persisted class is serialized outward whatever it is
      // called, so `@Entity() class CreateAuditEntry` must stay in scope even
      // though its name opens with an inbound verb.
      if (hasDecorator(cls.decorators, PERSISTED_DECORATORS)) return true;
      if (name && CREDENTIAL_DELIVERY.test(name)) return false;
      if (name && CREDENTIAL_NAMED.test(name)) return false;
      if (name && INBOUND_NAME.test(name)) return false;
      if (hasDecorator(cls.decorators, TRANSPORT_DECORATORS)) return true;
      return name
        ? /(Entity|Model|Schema|Response|ResponseDto|Payload|View)$/.test(name)
        : false;
    }

    /**
     * Whether a member is a boolean flag rather than a credential.
     *
     * `isSecret: boolean` on an environment-variable response says *whether* a
     * value is secret; it is not the secret. Both the declared type and the
     * predicate-style prefix are checked, since flags are often untyped.
     */
    function isFlag(
      node: TSESTree.PropertyDefinition,
      propName: string,
    ): boolean {
      // Third-person forms matter: `requiresPassword` is as much a flag as
      // `requirePassword`. The uppercase boundary keeps `hashPassword` out.
      if (
        /^(is|are|has|have|can|should|must|allows?|enables?|requires?|uses?|supports?|no)[A-Z]/.test(
          propName,
        )
      ) {
        return true;
      }
      const annotation = node.typeAnnotation?.typeAnnotation.type;
      return annotation === AST_NODE_TYPES.TSBooleanKeyword;
    }

    /** Whether a persistence decorator keeps this column out of results. */
    function isProjectionExcluded(node: TSESTree.PropertyDefinition): boolean {
      for (const decorator of node.decorators) {
        const arg = decoratorCall(decorator)?.arguments[0];
        if (arg?.type !== AST_NODE_TYPES.ObjectExpression) continue;
        const props = objectProperties(arg);
        if (!props) continue;
        const select = props.get('select');
        if (select?.type === AST_NODE_TYPES.Literal && select.value === false) {
          return true;
        }
        if (isTrueLiteral(props.get('hidden'))) return true;
      }
      return false;
    }

    return {
      PropertyDefinition(node: TSESTree.PropertyDefinition) {
        const cls = enclosingClass(node);
        if (!cls || !isEntityOrDto(cls)) return;

        // Statics are class constants, never part of an instance's payload.
        if (node.static) return;

        const propName = memberName(node);
        if (!propName) return;

        if (isFlag(node, propName)) return;
        if (!isSensitiveName(propName, terms)) return;

        // Already excluded, on the field or class-wide (excludeAll strategy).
        if (hasDecorator(node.decorators, 'Exclude')) return;
        if (hasDecorator(cls.decorators, 'Exclude')) return;
        // `@HideField()` is @nestjs/graphql's `@Exclude()`: it drops the
        // property from the generated schema, so it is never resolvable.
        // prisma-starter/src/user/models/user.model.ts:36 marks `password`
        // exactly this way and was reported anyway.
        if (hasDecorator(node.decorators, 'HideField')) return;

        // Or excluded by the ORM's own projection, which is the idiomatic
        // mechanism in each stack and a stronger guarantee than @Exclude():
        // the column never leaves the database. TypeORM and Typegoose spell it
        // `select: false`, MikroORM spells it `hidden: true`.
        if (isProjectionExcluded(node)) return;

        context.report({
          node,
          messageId: 'exposedField',
          data: { field: propName },
        });
      },
    };
  },
});
