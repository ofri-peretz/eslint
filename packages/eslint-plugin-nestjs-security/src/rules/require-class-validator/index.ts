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
import { AST_NODE_TYPES, createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import {
  getDecoratorCall,
  getDecoratorNames,
  hasDecoratorNamed,
} from '../../utils/decorators';

type MessageIds = 'missingValidator' | 'addValidator';

export interface Options {
  /** Allow in test files. Default: true */
  allowInTests?: boolean;
  /**
   * Also require validators on response/serialization DTOs. Response DTOs
   * describe output, never untrusted input, so they carry no class-validator
   * decorators by design. Default: false
   */
  checkResponseDtos?: boolean;
  /** Class-name pattern identifying a response DTO. Default: see below. */
  responseDtoPattern?: string;
}

type RuleOptions = [Options?];

/**
 * Names that mark a class as *output*: it is produced by the server and
 * serialized to the client, so class-validator decorators are meaningless on
 * it. Matched against the class name and its superclass.
 */
const DEFAULT_RESPONSE_DTO_PATTERN = 'Response|Result|View|Payload|Output|Serializ';

/**
 * class-transformer decorators that only make sense on a serialization model.
 * `@Type` and `@Transform` are excluded — request DTOs legitimately use them
 * for coercion.
 */
const SERIALIZATION_DECORATORS: ReadonlySet<string> = new Set([
  'Expose',
  'Exclude',
]);

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
  'Length',
  'MinLength',
  'MaxLength',
  'Matches',
  // Number validation
  'Min',
  'Max',
  'IsPositive',
  'IsNegative',
  // Object validation
  'ValidateNested',
  'IsInstance',
  'IsDivisibleBy',
  'MinDate',
  'MaxDate',
  // Extended string validation
  'IsIn',
  'IsNotIn',
  'Equals',
  'NotEquals',
  'IsNumberString',
  'IsBooleanString',
  'IsMobilePhone',
  'IsPassportNumber',
  'IsIdentityCard',
  'IsStrongPassword',
  'IsSemVer',
  'IsISO8601',
  'IsISO31661Alpha2',
  'IsISO31661Alpha3',
  'IsRFC3339',
  'IsMimeType',
  'IsHash',
  'IsMD5',
  'IsRgbColor',
  'IsBtcAddress',
  'IsEthereumAddress',
  'IsMagnetURI',
  'IsMACAddress',
  'IsISSN',
  'IsIBAN',
  'IsBIC',
  'IsEAN',
  'IsISIN',
  'IsFirebasePushId',
  'IsTimeZone',
  'IsNotEmptyObject',
  'IsMultibyte',
  'IsSurrogatePair',
  'IsVariableWidth',
  'IsOctal',
  'IsUppercase',
  // Custom
  'Validate',
  'ValidateBy',
  'ValidateIf',
  'ValidatePromise',
  // `@Allow()` whitelists a property under `forbidNonWhitelisted` — an
  // explicit "this field is accepted as-is" decision, not a missing validator.
  'Allow',
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
        description: 'DTO property "{{property}}" lacks class-validator decorators',
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
        documentationLink: 'https://github.com/typestack/class-validator#validation-decorators',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: { type: 'boolean', default: true },
          checkResponseDtos: { type: 'boolean', default: false },
          responseDtoPattern: { type: 'string' },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ allowInTests: true, checkResponseDtos: false }],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>, [options = {}]) {
    const {
      allowInTests = true,
      checkResponseDtos = false,
      responseDtoPattern = DEFAULT_RESPONSE_DTO_PATTERN,
    } = options as Options;
    const filename = context.filename;
    const isTestFile = /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);

    if (allowInTests && isTestFile) {
      return {};
    }

    const responseNameRegex = new RegExp(responseDtoPattern);

    // Track if class is a DTO
    let isDto = false;

    /**
     * Check if class looks like a DTO
     */
    function isDtoClass(node: TSESTree.ClassDeclaration): boolean {
      // Check class name
      if (node.id?.name && /Dto$|Request$|Input$/.test(node.id.name)) {
        return true;
      }
      // Check for class-validator or API decorators at class level
      return getDecoratorNames(node.decorators).some((name) =>
        ['ApiProperty', 'ApiPropertyOptional', 'Validated'].includes(name),
      );
    }

    /**
     * Response DTOs describe what the server *returns*. They never carry
     * class-validator decorators, so requiring them produces one finding per
     * property of every serialization model in the codebase (303 on one
     * boilerplate). Detected by name, by superclass name, or by the presence
     * of class-transformer `@Expose`/`@Exclude`.
     */
    function isResponseDto(node: TSESTree.ClassDeclaration): boolean {
      if (node.id && responseNameRegex.test(node.id.name)) return true;
      const superClass = node.superClass;
      if (
        superClass &&
        superClass.type === AST_NODE_TYPES.Identifier &&
        responseNameRegex.test(superClass.name)
      ) {
        return true;
      }
      if (hasDecoratorNamed(node.decorators, SERIALIZATION_DECORATORS)) return true;
      return node.body.body.some(
        (member) =>
          member.type === AST_NODE_TYPES.PropertyDefinition &&
          hasDecoratorNamed(member.decorators, SERIALIZATION_DECORATORS),
      );
    }

    /**
     * Check if property has any class-validator decorator
     */
    function hasValidatorDecorator(decorators: TSESTree.Decorator[] | undefined): boolean {
      return hasDecoratorNamed(decorators, VALIDATOR_DECORATORS);
    }

    /** `format: 'binary'` anywhere in an object literal (incl. `items: {…}`). */
    function declaresBinaryFormat(node: TSESTree.ObjectExpression): boolean {
      return node.properties.some((property) => {
        if (property.type !== AST_NODE_TYPES.Property) return false;
        if (property.value.type === AST_NODE_TYPES.ObjectExpression) {
          return declaresBinaryFormat(property.value);
        }
        return (
          property.key.type === AST_NODE_TYPES.Identifier &&
          property.key.name === 'format' &&
          property.value.type === AST_NODE_TYPES.Literal &&
          property.value.value === 'binary'
        );
      });
    }

    /**
     * `@ApiProperty({ type: 'string', format: 'binary' })` declares a
     * multipart upload slot. The value never reaches class-validator — Multer
     * consumes it — so there is no validator to add.
     */
    function isBinaryUploadProperty(
      decorators: TSESTree.Decorator[] | undefined,
    ): boolean {
      return (decorators ?? []).some((decorator) => {
        const arg = getDecoratorCall(decorator)?.arguments[0];
        return (
          arg !== undefined &&
          arg.type === AST_NODE_TYPES.ObjectExpression &&
          declaresBinaryFormat(arg)
        );
      });
    }

    return {
      ClassDeclaration(node: TSESTree.ClassDeclaration) {
        isDto = isDtoClass(node) && (checkResponseDtos || !isResponseDto(node));
      },

      PropertyDefinition(node: TSESTree.PropertyDefinition) {
        if (!isDto) return;

        // Get property name
        const propName =
          node.key.type === AST_NODE_TYPES.Identifier ? node.key.name : null;
        if (!propName) return;

        // Skip private/internal properties
        if (propName.startsWith('_')) return;

        // Check if already validated
        if (hasValidatorDecorator(node.decorators)) return;

        // Multipart upload slots are handled by Multer, not class-validator
        if (isBinaryUploadProperty(node.decorators)) return;

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
