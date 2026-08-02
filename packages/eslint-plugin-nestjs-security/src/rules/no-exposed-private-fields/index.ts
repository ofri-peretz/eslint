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
import { AST_NODE_TYPES, createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { getDecoratorNames, hasDecoratorNamed } from '../../utils/decorators';

type MessageIds = 'exposedField' | 'useExcludeDecorator';

export interface Options {
  /** Allow in test files. Default: true */
  allowInTests?: boolean;
  /** Custom sensitive field patterns. Default: password, secret, token, etc. */
  sensitivePatterns?: string[];
  /**
   * Also check DTO classes. A DTO listing `token` or `password` is an explicit
   * author decision (`LoginResponseDto` *must* carry a token; a
   * `ResetPasswordDto` *must* carry a password), whereas a persistence entity
   * exposing the same field leaks it through serialization by accident.
   * Default: false
   */
  includeDtos?: boolean;
}

type RuleOptions = [Options?];

/** Class decorators that mark a persistence entity / serialized domain model. */
const ENTITY_DECORATORS: ReadonlySet<string> = new Set([
  'Entity',
  'Schema',
  'Table',
  'ObjectType',
  'Model',
]);

/**
 * Class decorators that mark a GraphQL **input** object.
 *
 * `@InputType()` / `@ArgsType()` describe what a client *sends*, which is the
 * GraphQL equivalent of a request DTO — a `LoginInput` must carry a `password`
 * and a `ResetPasswordArgs` must carry a `token`. Tracking them by default
 * contradicted the DTO exclusion (`Input$` is already in `DTO_NAME`), so they
 * follow `includeDtos` like every other request contract. `@ObjectType()`
 * stays in the entity set: that is the *response* side, where an accidental
 * `password` field really does leak.
 */
const DTO_DECORATORS: ReadonlySet<string> = new Set(['InputType', 'ArgsType']);

/** Class-name suffixes that mark a persistence entity / domain model. */
const ENTITY_NAME = /Entity$|Schema$|Model$|Document$|Table$/;

/** Class-name suffixes that mark a data-transfer object. */
const DTO_NAME = /Dto$|Request$|Response$|Input$|Output$|Payload$/;

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
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-nestjs-security/docs/rules/no-exposed-private-fields.md',
      description: 'Detects sensitive fields not excluded from serialization',
      cwe: 'CWE-200',
      cvss: 7.5,
    },
    hasSuggestions: true,
    messages: {
      exposedField: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Exposed Sensitive Field',
        cwe: 'CWE-200',
        owasp: 'A01:2021',
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
          includeDtos: { type: 'boolean', default: false },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ allowInTests: true, sensitivePatterns: [], includeDtos: false }],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>, [options = {}]) {
    const {
      allowInTests = true,
      sensitivePatterns = [],
      includeDtos = false,
    } = options as Options;
    const filename = context.filename;
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
      return getDecoratorNames(decorators).includes('Exclude');
    }

    /**
     * Is this a persistence entity / serialized domain model?
     *
     * Scoped deliberately: an entity that names a `password` column and never
     * says `@Exclude()` leaks it the first time the object is returned from a
     * controller. A DTO with the same field name is a declared contract.
     */
    function isTrackedClass(node: TSESTree.ClassDeclaration): boolean {
      if (hasDecoratorNamed(node.decorators, ENTITY_DECORATORS)) return true;
      // A GraphQL input object is a request contract, not a persisted row —
      // the decorator outranks the class name here.
      if (hasDecoratorNamed(node.decorators, DTO_DECORATORS)) return includeDtos;
      const name = node.id?.name;
      if (name === undefined) return false;
      if (ENTITY_NAME.test(name)) return true;
      return includeDtos && DTO_NAME.test(name);
    }

    // Track if we're in an entity class
    let isInEntityOrDto = false;

    return {
      ClassDeclaration(node: TSESTree.ClassDeclaration) {
        isInEntityOrDto = isTrackedClass(node);
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
