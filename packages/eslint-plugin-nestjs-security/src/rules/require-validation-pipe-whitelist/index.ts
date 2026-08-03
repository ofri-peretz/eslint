/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Require `whitelist: true` on every ValidationPipe
 *
 * A ValidationPipe without `whitelist: true` validates the properties a DTO
 * declares and then passes every *undeclared* property straight through. The
 * handler receives them, the service receives them, and `repository.save(dto)`
 * writes them — so a request can set `isAdmin` on a DTO that never mentioned
 * it. `whitelist: true` strips anything without a validation decorator, which
 * is what makes the DTO an allow-list rather than a suggestion.
 *
 * Measured across ten high-star NestJS codebases: 18 ValidationPipe
 * constructions outside nest's own samples, in 6 of 9 real repositories, do not
 * set it.
 *
 * CWE-915: Improperly Controlled Modification of Dynamically-Determined Object
 * Attributes (mass assignment)
 */

import {
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';
import { AST_NODE_TYPES } from '@interlace/eslint-devkit';
import type { TSESTree } from '@interlace/eslint-devkit';
import {
  collectImportOrigins,
  expressionName,
  isTestFile,
  isTrueLiteral,
  moduleRole,
  objectProperties,
} from '../../utils/nest-ast';

type MessageIds = 'missingWhitelist' | 'inertForbidNonWhitelisted';

export interface Options {
  /** Allow in test files. Default: true */
  allowInTests?: boolean;
}

type RuleOptions = [Options?];

export const requireValidationPipeWhitelist = createRule<
  RuleOptions,
  MessageIds
>({
  name: 'require-validation-pipe-whitelist',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-nestjs-security/docs/rules/require-validation-pipe-whitelist.md',
      description:
        'Require whitelist: true on ValidationPipe to prevent mass assignment',
      cwe: 'CWE-915',
      cvss: 7.5,
    },
    messages: {
      missingWhitelist: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'ValidationPipe Without whitelist',
        cwe: 'CWE-915',
        cvss: 7.5,
        description:
          'This ValidationPipe forwards properties the DTO never declared, so a request can set fields the DTO does not mention',
        severity: 'HIGH',
        fix: 'Pass { whitelist: true } so properties without a validation decorator are stripped',
        documentationLink: 'https://cwe.mitre.org/data/definitions/915.html',
      }),
      inertForbidNonWhitelisted: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'forbidNonWhitelisted Without whitelist',
        cwe: 'CWE-915',
        cvss: 7.5,
        description:
          'forbidNonWhitelisted only rejects extra properties while whitelist is on — on its own it does nothing',
        severity: 'HIGH',
        fix: 'Add whitelist: true alongside forbidNonWhitelisted',
        documentationLink: 'https://cwe.mitre.org/data/definitions/915.html',
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
  defaultOptions: [{}],
  create(context, [options = {}]) {
    const { allowInTests = true } = options;
    if (allowInTests && isTestFile(context.filename)) return {};

    const origins = collectImportOrigins(context.sourceCode.ast);

    /**
     * Whether this `ValidationPipe` is the one from `@nestjs/common`.
     *
     * If the name was imported from somewhere else entirely, the class is not
     * ours to have an opinion about. An unimported name is treated as Nest's:
     * that is the overwhelmingly common case, and it keeps the rule working on
     * snippets that omit their imports.
     */
    function isNestValidationPipe(node: TSESTree.NewExpression): boolean {
      const source = origins.get(expressionName(node.callee));
      if (!source) return true;
      const role = moduleRole(source);
      return role === null || role === 'framework';
    }

    return {
      NewExpression(node: TSESTree.NewExpression) {
        if (expressionName(node.callee) !== 'ValidationPipe') return;
        if (!isNestValidationPipe(node)) return;

        const arg = node.arguments[0];

        // `new ValidationPipe()` — no options at all, so no whitelist.
        if (!arg) {
          context.report({ node, messageId: 'missingWhitelist' });
          return;
        }

        // `new ValidationPipe(sharedOptions)` — the options are defined
        // elsewhere and may well set whitelist. Nothing in this file proves
        // otherwise, so say nothing.
        if (arg.type !== AST_NODE_TYPES.ObjectExpression) return;

        // A spread or computed key can define `whitelist`; abstain.
        const props = objectProperties(arg);
        if (!props) return;

        if (isTrueLiteral(props.get('whitelist'))) return;

        // `whitelist: isProduction` is a deliberate decision we cannot
        // evaluate. Only an absent or explicitly non-true literal is a finding.
        const whitelist = props.get('whitelist');
        if (whitelist && whitelist.type !== AST_NODE_TYPES.Literal) return;

        context.report({
          node,
          messageId: isTrueLiteral(props.get('forbidNonWhitelisted'))
            ? 'inertForbidNonWhitelisted'
            : 'missingWhitelist',
        });
      },
    };
  },
});
