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

type MessageIds = 'missingValidator' | 'addValidator';

export interface Options {
  /** Allow in test files. Default: true */
  allowInTests?: boolean;
}

type RuleOptions = [Options?];

// Common class-validator decorators
const VALIDATOR_DECORATORS = [
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
];

export const requireClassValidator = createRule<RuleOptions, MessageIds>({
  name: 'require-class-validator',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Requires class-validator decorators on DTO properties',
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
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ allowInTests: true }],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>, [options = {}]) {
    const { allowInTests = true } = options as Options;
    const filename = context.filename || context.getFilename();
    const isTestFile = /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);

    if (allowInTests && isTestFile) {
      return {};
    }

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
      if (node.decorators) {
        return node.decorators.some((dec: TSESTree.Decorator) => {
          const name =
            dec.expression.type === AST_NODE_TYPES.Identifier
              ? dec.expression.name
              : dec.expression.type === AST_NODE_TYPES.CallExpression &&
                dec.expression.callee.type === AST_NODE_TYPES.Identifier
              ? dec.expression.callee.name
              : '';
          return ['ApiProperty', 'ApiPropertyOptional', 'Validated'].includes(name);
        });
      }
      return false;
    }

    /**
     * Check if property has any class-validator decorator
     */
    function hasValidatorDecorator(decorators: TSESTree.Decorator[] | undefined): boolean {
      if (!decorators) return false;
      return decorators.some((dec) => {
        const name =
          dec.expression.type === AST_NODE_TYPES.Identifier
            ? dec.expression.name
            : dec.expression.type === AST_NODE_TYPES.CallExpression &&
              dec.expression.callee.type === AST_NODE_TYPES.Identifier
            ? dec.expression.callee.name
            : '';
        return VALIDATOR_DECORATORS.includes(name);
      });
    }

    return {
      ClassDeclaration(node: TSESTree.ClassDeclaration) {
        isDto = isDtoClass(node);
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
