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
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';
import {
  enclosingClass,
  hasDecorator,
  isTestFile,
  memberName,
  type ClassNode,
} from '../../utils/nest-ast';
import {
  compileSensitiveTerms,
  isSensitiveName,
} from '../../utils/sensitive-names';

type MessageIds = 'exposedField' | 'useExcludeDecorator';

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
    hasSuggestions: true,
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
      useExcludeDecorator: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Exclude Decorator',
        description:
          'Use @Exclude() from class-transformer to hide sensitive fields',
        severity: 'LOW',
        fix: 'import { Exclude } from "class-transformer"; @Exclude() fieldName: string;',
        documentationLink:
          'https://github.com/typestack/class-transformer#excludeexpose',
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
    const { allowInTests = true, sensitivePatterns = [] } = options as Options;

    if (allowInTests && isTestFile(context.filename)) {
      return {};
    }

    const terms = compileSensitiveTerms([
      ...DEFAULT_SENSITIVE_TERMS,
      ...sensitivePatterns,
    ]);

    /** Decorators that mark a class as something serialized back to clients. */
    const ENTITY_DECORATORS = new Set([
      'Entity',
      'Schema',
      'ObjectType',
      'InputType',
      'ArgsType',
      'ApiProperty',
    ]);

    /**
     * Classes whose purpose is to deliver a credential to the caller.
     *
     * A login/refresh/token endpoint returns a token by definition — flagging
     * `RefreshResponseDto.refreshToken` is noise, not a finding. The risk this
     * rule exists for is a credential riding along on an *unrelated* payload.
     */
    const CREDENTIAL_DELIVERY =
      /(Login|Auth|Refresh|Token|Session|Credential)\w*(Response|ResponseDto|Payload|Result)$/;

    /**
     * Whether the class is a *response* shape.
     *
     * Deliberately excludes plain `*Dto`. A `LoginDto` or `AuthEmailLoginDto`
     * must carry a `password` field — that is inbound payload, not a leak, and
     * matching on `Dto$` reported every login form in every real repository.
     * Only entities, persisted models and explicitly response-named classes
     * are serialized back to clients.
     */
    function isEntityOrDto(cls: ClassNode): boolean {
      const name = cls.id?.name;
      if (name && CREDENTIAL_DELIVERY.test(name)) return false;
      if (hasDecorator(cls.decorators, ENTITY_DECORATORS)) return true;
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
