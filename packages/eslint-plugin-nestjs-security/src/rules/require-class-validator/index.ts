/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: require-class-validator
 * Requires class-validator decorators on DTO properties
 * CWE-20: Improper Input Validation
 *
 * @see https://cwe.mitre.org/data/definitions/20.html
 * @see https://github.com/typestack/class-validator
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';
import {
  enclosingClass,
  expressionName,
  hasDecorator,
  collectImportOrigins,
  decoratorName,
  decoratorSource,
  moduleRole,
  isRelativeOrLocal,
  isTestFile,
  memberName,
  type ClassNode,
} from '../../utils/nest-ast';
import { getProjectContext } from '../../utils/project-context';

type MessageIds = 'missingValidator' | 'addValidator';

export interface Options {
  /** Allow in test files. Default: true */
  allowInTests?: boolean;
  /**
   * Extra decorator names that count as validation, for projects that compose
   * class-validator into their own decorators.
   */
  validatorDecorators?: string[];
  /**
   * Also report GraphQL `@InputType()` / `@ArgsType()` classes. Default: false.
   *
   * The GraphQL schema already enforces scalar types and nullability on every
   * input field, so the type-confusion this rule guards against is handled
   * before a resolver runs. What class-validator adds there is *semantic*
   * validation — length, format, enum — which is worth having but is a
   * different, opt-in claim. Left on, this shape was 1,449 of 1,773 findings
   * across the measured codebases, most of them generated filter inputs.
   */
  checkGraphqlInputs?: boolean;
  /**
   * Stay quiet when the project registers a ValidationPipe with
   * `whitelist: true`, which strips undecorated properties. Default: true
   */
  detectWhitelistingPipe?: boolean;
  /**
   * Treat the project as whitelisting without scanning for it — for setups the
   * static scan cannot see (options built at runtime, a pipe registered in a
   * library). Mirrors `assumeGlobalThrottler` on require-throttler. Default: false
   */
  assumeWhitelistingPipe?: boolean;
}

type RuleOptions = [Options?];

// Common class-validator decorators
const VALIDATOR_DECORATORS = new Set([
  // Type validation
  'IsString',
  'IsNumber',
  'IsInt',
  'IsBoolean',
  'IsDate',
  'IsArray',
  'IsEnum',
  'IsObject',
  'IsUUID',
  'IsEmail',
  'IsUrl',
  'IsOptional',
  'IsDefined',
  'IsNotEmpty',
  'IsEmpty',
  'IsNotEmptyObject',
  'Allow',
  // Value constraints — `@IsIn(['user','admin'])` is one of the most common
  // ways to validate a role field, and its absence here was a false negative
  // caught by the detection contract.
  'IsIn',
  'IsNotIn',
  'Equals',
  'NotEquals',
  // String validation
  'Contains',
  'NotContains',
  'IsAlpha',
  'IsAlphanumeric',
  'IsDecimal',
  'IsAscii',
  'IsBase64',
  'IsByteLength',
  'IsCreditCard',
  'IsCurrency',
  'IsDataURI',
  'IsDateString',
  'IsFQDN',
  'IsFullWidth',
  'IsHalfWidth',
  'IsHexColor',
  'IsHexadecimal',
  'IsIP',
  'IsISBN',
  'IsJSON',
  'IsJWT',
  'IsLatLong',
  'IsLocale',
  'IsLowercase',
  'IsUppercase',
  'IsPhoneNumber',
  'IsPostalCode',
  'IsMongoId',
  'IsMilitaryTime',
  'IsPort',
  'IsNumberString',
  'IsBooleanString',
  'IsStrongPassword',
  'IsHash',
  'IsSemVer',
  'IsISO8601',
  'IsRFC3339',
  'IsTimeZone',
  'IsMimeType',
  'IsMACAddress',
  'IsMagnetURI',
  'IsOctal',
  'IsBase32',
  'IsIBAN',
  'IsBIC',
  'IsEAN',
  'IsISIN',
  'IsISSN',
  'IsISRC',
  'IsIdentityCard',
  'IsPassportNumber',
  'IsTaxId',
  'IsEthereumAddress',
  'IsBtcAddress',
  'IsRgbColor',
  'IsHSL',
  'IsSurrogatePair',
  'IsFirebasePushId',
  'IsISO31661Alpha2',
  'IsISO31661Alpha3',
  'IsLatitude',
  'IsLongitude',
  'Length',
  'MinLength',
  'MaxLength',
  'Matches',
  // Number validation
  'Min',
  'Max',
  'IsPositive',
  'IsNegative',
  'IsDivisibleBy',
  'MinDate',
  'MaxDate',
  // Object validation
  'ValidateNested',
  'IsInstance',
  // Custom
  'Validate',
  'ValidateBy',
  'ValidateIf',
  // Array validation
  'ArrayContains',
  'ArrayNotContains',
  'ArrayNotEmpty',
  'ArrayMinSize',
  'ArrayMaxSize',
  'ArrayUnique',
]);

export const requireClassValidator = createRule<RuleOptions, MessageIds>({
  name: 'require-class-validator',
  meta: {
    type: 'suggestion',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-nestjs-security/docs/rules/require-class-validator.md',
      description: 'Requires class-validator decorators on DTO properties',
      cwe: 'CWE-20',
      cvss: 7.5,
    },
    hasSuggestions: true,
    messages: {
      missingValidator: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Missing Class Validator',
        cwe: 'CWE-20',
        owasp: 'A03:2021',
        cvss: 7.5,
        description:
          'DTO property "{{property}}" lacks class-validator decorators',
        severity: 'MEDIUM',
        fix: 'Add class-validator decorator: @IsString() @IsNotEmpty() propertyName: string',
        documentationLink: 'https://github.com/typestack/class-validator',
      }),
      addValidator: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Add Validator',
        description: 'Add validation decorator based on property type',
        severity: 'LOW',
        fix: 'import { IsString, IsNotEmpty } from "class-validator"; @IsNotEmpty() @IsString()',
        documentationLink:
          'https://github.com/typestack/class-validator#validation-decorators',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: { type: 'boolean', default: true },
          validatorDecorators: {
            type: 'array',
            items: { type: 'string' },
            default: [],
          },
          checkGraphqlInputs: { type: 'boolean', default: false },
          detectWhitelistingPipe: { type: 'boolean', default: true },
          assumeWhitelistingPipe: { type: 'boolean', default: false },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ allowInTests: true }],
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options = {}],
  ) {
    const {
      allowInTests = true,
      validatorDecorators = [],
      checkGraphqlInputs = false,
      detectWhitelistingPipe = true,
      assumeWhitelistingPipe = false,
    } = options as Options;
    // A global ValidationPipe with `whitelist: true` strips every property the
    // DTO does not decorate, so an undecorated property never arrives from a
    // request — it is dead, not unvalidated. Reporting it under a CWE banner is
    // a false positive, and it fires on exactly the well-configured apps we most
    // want to keep quiet: brocoders/nestjs-boilerplate sets whitelist and still
    // drew 5 findings on server-set fields like `provider` and `socialId`.
    if (assumeWhitelistingPipe) return {};
    if (
      detectWhitelistingPipe &&
      getProjectContext(context).hasWhitelistingValidationPipe
    ) {
      return {};
    }

    const origins = collectImportOrigins(context.sourceCode.ast);
    const extraValidators = new Set(validatorDecorators);

    if (allowInTests && isTestFile(context.filename)) {
      return {};
    }

    /** Class-level decorators that mark a class as an input DTO. */
    const DTO_CLASS_DECORATORS = new Set([
      'InputType',
      'ArgsType',
      'Validated',
    ]);

    /** GraphQL's own input markers, as opposed to `@Validated`. */
    const GRAPHQL_INPUT_DECORATORS = new Set(['InputType', 'ArgsType']);

    /**
     * Whether the class is a GraphQL input type rather than a REST DTO.
     *
     * Judged by origin where the import resolves: `@InputType` from
     * `@nestjs/graphql` is definitive. A project that re-exports it through its
     * own barrel keeps the name, so an unresolved or project-local origin falls
     * back to the name — neither spelling is used for anything else in Nest.
     */
    function isGraphqlInput(cls: ClassNode): boolean {
      return cls.decorators.some((d) => {
        if (!GRAPHQL_INPUT_DECORATORS.has(decoratorName(d))) return false;
        const source = decoratorSource(d, origins);
        return (
          !source ||
          moduleRole(source) === 'graphql' ||
          isRelativeOrLocal(source)
        );
      });
    }

    /**
     * Classes Nest instantiates itself. A provider is wired by the injector,
     * never populated from a request body, so its members are not payload
     * fields no matter what the class is called — novu's `@Injectable()`
     * `PasswordResetRequest` matched the `(Request)$` half of DTO_NAME and had
     * its private rate-limit constants reported.
     */
    const PROVIDER_DECORATORS = new Set([
      'Injectable',
      'Controller',
      'Module',
      'Resolver',
      'Global',
    ]);

    /**
     * Names that are outbound anywhere in the identifier.
     *
     * Checked before anything else: `DeleteTopicSubscriptionsResponseDto` and
     * `SetAgentMcpServersFailureDto` both start with an inbound-looking verb
     * and are both responses.
     */
    const OUTBOUND_NAME = /(Response|Result|Failure|Error|Success)/;

    /**
     * Persistence and schema classes. A TypeORM entity is the database shape,
     * not a request payload — `no-exposed-private-fields` is the rule that
     * cares about those.
     */
    const PERSISTENCE_DECORATORS = new Set([
      'Entity',
      'Schema',
      'ViewEntity',
      'ChildEntity',
    ]);
    const PERSISTENCE_NAME = /(Entity|Model|Schema|View)$/;

    /**
     * Names that are request payloads.
     *
     * Both halves are required, and each half alone was measured to be wrong:
     *  - a bare `Dto$` suffix matched every response DTO in the corpus (novu
     *    alone has hundreds), which is what produced 533 findings there;
     *  - a bare verb prefix matched `EditManager`, a Svelte view-model in
     *    immich's *frontend*, which has nothing to do with NestJS.
     * A mutating verb *and* a DTO suffix together is the reliable signal, plus
     * the suffixes that name a request outright.
     */
    const DTO_NAME =
      /^(Create|Update|Patch|Upsert|Delete|Add|Edit|Set)[A-Z].*Dto$|(Request|RequestDto|Input|InputDto|Body|BodyDto|Params|ParamsDto|Query|QueryDto)$/;

    /**
     * Whether a decorator validates the member.
     *
     * Decided by where the decorator came from, not how it is spelled:
     *
     *  - imported from `class-validator` → it validates, whatever its name;
     *  - imported from any other package we know (`@nestjs/graphql`,
     *    `typeorm`, `@nestjs/swagger`) → it does not, whatever its name. This
     *    is what settles bare `@Field()`, whose name once made every TypeORM
     *    entity in twenty look like a validated DTO (175 findings);
     *  - from a project-local module → we cannot read that file, so fall back
     *    to the composed-decorator convention (`@StringField()`,
     *    `@NumberFieldOptional()`), which awesome-nest-boilerplate ships a full
     *    set of.
     */
    function isValidatorDecorator(decorators: TSESTree.Decorator[]): boolean {
      return decorators.some((d) => {
        const name = decoratorName(d);
        if (VALIDATOR_DECORATORS.has(name) || extraValidators.has(name))
          return true;

        const source = decoratorSource(d, origins);
        if (source) {
          const role = moduleRole(source);
          if (role === 'validator') return true;
          if (role) return false;
        }
        return /.Field(Optional)?$/.test(name);
      });
    }

    /**
     * Whether the class maps an entity to a response — `constructor(e: FooEntity)`.
     * These carry decorators for serialisation, not validation.
     */
    function isEntityMapper(cls: ClassNode): boolean {
      const ctor = cls.body.body.find(
        (m) =>
          m.type === AST_NODE_TYPES.MethodDefinition &&
          m.kind === 'constructor',
      ) as TSESTree.MethodDefinition | undefined;
      const first = ctor?.value.params[0];
      const ann =
        first && first.type === AST_NODE_TYPES.Identifier
          ? first.typeAnnotation?.typeAnnotation
          : undefined;
      if (!ann || ann.type !== AST_NODE_TYPES.TSTypeReference) return false;
      return expressionName(ann.typeName).endsWith('Entity');
    }

    /**
     * How we know a class is an *input* DTO — and the distinction matters.
     *
     * `declared`: the class says so, by carrying `@InputType()` or by being
     * named like a DTO. Every undecorated member is a gap.
     *
     * `inferred`: nothing names it, but some member carries a class-validator
     * decorator, so the class participates in validation. That is weaker
     * evidence, and it is the path twenty's `ConfigVariables` takes — boot-time
     * environment config that validates itself with class-validator and has 40
     * undecorated members holding defaults. Members with an initialiser are
     * treated as defaults on this path only.
     */
    type DtoKind = 'declared' | 'inferred' | null;

    function dtoKind(cls: ClassNode): DtoKind {
      // Checked first: a provider can carry a DTO-ish name but never is one.
      if (hasDecorator(cls.decorators, PROVIDER_DECORATORS)) return null;
      if (!checkGraphqlInputs && isGraphqlInput(cls)) return null;
      if (hasDecorator(cls.decorators, DTO_CLASS_DECORATORS)) return 'declared';

      const name = cls.id?.name;
      if (name && OUTBOUND_NAME.test(name)) return null;
      if (name && PERSISTENCE_NAME.test(name)) return null;
      if (hasDecorator(cls.decorators, PERSISTENCE_DECORATORS)) return null;
      if (isEntityMapper(cls)) return null;

      if (name && DTO_NAME.test(name)) return 'declared';
      const validated = cls.body.body.some(
        (m) =>
          m.type === AST_NODE_TYPES.PropertyDefinition &&
          isValidatorDecorator(m.decorators as TSESTree.Decorator[]),
      );
      return validated ? 'inferred' : null;
    }

    return {
      PropertyDefinition(node: TSESTree.PropertyDefinition) {
        // A PropertyDefinition is always a ClassBody child, so this is non-null.
        const kind = dtoKind(enclosingClass(node) as ClassNode);
        if (!kind) return;

        // Statics are class constants, not inbound payload fields.
        if (node.static) return;

        // Neither are members the class keeps to itself: a ValidationPipe
        // never populates a private or protected field.
        if (
          node.accessibility === 'private' ||
          node.accessibility === 'protected'
        )
          return;

        // On the inferred path an initialiser marks a default, not a field a
        // request fills. A class that declares itself a DTO keeps its power:
        // `role: string = 'user'` there is still assignable from the payload.
        if (kind === 'inferred' && node.value) return;

        const propName = memberName(node);
        if (!propName) return;

        // Skip private/internal properties
        if (propName.startsWith('_')) return;

        // Fields stripped from the payload need no validator.
        if (hasDecorator(node.decorators, 'Exclude')) return;

        // Check if already validated
        if (isValidatorDecorator(node.decorators as TSESTree.Decorator[]))
          return;

        context.report({
          node,
          messageId: 'missingValidator',
          data: { property: propName },
          suggest: [{ messageId: 'addValidator', fix: () => null }],
        });
      },
    };
  },
});
