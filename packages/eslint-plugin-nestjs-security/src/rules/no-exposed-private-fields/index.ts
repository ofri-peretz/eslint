/**
 * ESLint Rule: no-exposed-private-fields
 * Detects exposed sensitive fields in response DTOs
 * CWE-200: Exposure of Sensitive Information to an Unauthorized Actor
 *
 * @see https://cwe.mitre.org/data/definitions/200.html
 * @see https://docs.nestjs.com/techniques/serialization
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { AST_NODE_TYPES, createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'exposedField' | 'useExcludeDecorator';

export interface Options {
  /** Allow in test files. Default: true */
  allowInTests?: boolean;
  /** Custom sensitive field patterns. Default: password, secret, token, etc. */
  sensitivePatterns?: string[];
}

type RuleOptions = [Options?];

// Default sensitive field patterns
const DEFAULT_SENSITIVE_PATTERNS = [
  'password',
  'secret',
  'token',
  'apiKey',
  'apikey',
  'api_key',
  'accessKey',
  'access_key',
  'secretKey',
  'secret_key',
  'privateKey',
  'private_key',
  'refreshToken',
  'refresh_token',
  'salt',
  'hash',
  'ssn',
  'creditCard',
  'credit_card',
  'cardNumber',
  'card_number',
  'cvv',
  'pin',
  'otp',
];

export const noExposedPrivateFields = createRule<RuleOptions, MessageIds>({
  name: 'no-exposed-private-fields',
  meta: {
    type: 'problem',
    docs: {
      description: 'Detects sensitive fields not excluded from serialization',
    },
    hasSuggestions: true,
    messages: {
      exposedField: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Exposed Sensitive Field',
        cwe: 'CWE-200',
        owasp: 'A01',
        cvss: 7.5,
        description: 'Sensitive field "{{field}}" may be exposed in API responses',
        severity: 'HIGH',
        fix: 'Add @Exclude() decorator or use class-transformer to exclude from responses',
        documentationLink: 'https://docs.nestjs.com/techniques/serialization',
      }),
      useExcludeDecorator: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Exclude Decorator',
        description: 'Use @Exclude() from class-transformer to hide sensitive fields',
        severity: 'LOW',
        fix: 'import { Exclude } from "class-transformer"; @Exclude() fieldName: string;',
        documentationLink: 'https://github.com/typestack/class-transformer#excludeexpose',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: { type: 'boolean', default: true },
          sensitivePatterns: { type: 'array', items: { type: 'string' }, default: [] },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ allowInTests: true, sensitivePatterns: [] }],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>, [options = {}]) {
    const { allowInTests = true, sensitivePatterns = [] } = options as Options;
    const filename = context.filename || context.getFilename();
    const isTestFile = /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);

    if (allowInTests && isTestFile) {
      return {};
    }

    // Combine default and custom patterns
    const allPatterns = [...DEFAULT_SENSITIVE_PATTERNS, ...sensitivePatterns];
    const patternRegex = new RegExp(allPatterns.join('|'), 'i');

    /**
     * Check if decorators include @Exclude
     */
    function hasExcludeDecorator(decorators: TSESTree.Decorator[] | undefined): boolean {
      if (!decorators) return false;
      return decorators.some((dec) => {
        const name =
          dec.expression.type === AST_NODE_TYPES.Identifier
            ? dec.expression.name
            : dec.expression.type === AST_NODE_TYPES.CallExpression &&
              dec.expression.callee.type === AST_NODE_TYPES.Identifier
            ? dec.expression.callee.name
            : '';
        return name === 'Exclude';
      });
    }

    /**
     * Check if class looks like an entity/DTO (contains decorators from TypeORM, class-validator, etc.)
     */
    function isEntityOrDto(decorators: TSESTree.Decorator[] | undefined): boolean {
      if (!decorators) return false;
      const entityDecorators = [
        'Entity',
        'Schema',
        'ObjectType',
        'InputType',
        'ArgsType',
        'ApiProperty',
      ];
      return decorators.some((dec) => {
        const name =
          dec.expression.type === AST_NODE_TYPES.Identifier
            ? dec.expression.name
            : dec.expression.type === AST_NODE_TYPES.CallExpression &&
              dec.expression.callee.type === AST_NODE_TYPES.Identifier
            ? dec.expression.callee.name
            : '';
        return entityDecorators.includes(name);
      });
    }

    // Track if we're in an entity/dto class
    let isInEntityOrDto = false;

    return {
      ClassDeclaration(node: TSESTree.ClassDeclaration) {
        isInEntityOrDto = isEntityOrDto(node.decorators);
        // Also check class name for DTO/Entity suffix
        if (node.id?.name) {
          isInEntityOrDto =
            isInEntityOrDto ||
            /Dto$|Entity$|Model$|Schema$/.test(node.id.name);
        }
      },

      PropertyDefinition(node: TSESTree.PropertyDefinition) {
        if (!isInEntityOrDto) return;

        // Get property name
        const propName =
          node.key.type === AST_NODE_TYPES.Identifier ? node.key.name : null;
        if (!propName) return;

        // Check if field name matches sensitive patterns
        if (!patternRegex.test(propName)) return;

        // Check if already has @Exclude
        if (hasExcludeDecorator(node.decorators)) return;

        context.report({
          node,
          messageId: 'exposedField',
          data: { field: propName },
          suggest: [{ messageId: 'useExcludeDecorator', fix: () => null }],
        });
      },
    };
  },
});
