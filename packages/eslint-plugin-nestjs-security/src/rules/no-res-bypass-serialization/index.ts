/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Detect `@Res()` handlers that write an object past the
 * serialization layer
 *
 * Injecting `@Res()` without `passthrough: true` switches a handler into
 * library-specific mode: Nest stops handling the response, so no interceptor
 * runs on it. `ClassSerializerInterceptor` is an interceptor, which means every
 * `@Exclude()` on the object being written silently stops applying — the
 * password hash that is stripped on every other route is serialized here.
 *
 * Scope note: the bypass is only a *disclosure* risk when the handler writes an
 * object. Streaming a file, redirecting, or sending a string literal has
 * nothing to serialize, and reporting those was the difference between 95
 * findings and 23 across the ten measured codebases. When the handler passes
 * `res` to a service instead of writing to it, this file cannot see what
 * happens next, so the rule abstains.
 *
 * CWE-200: Exposure of Sensitive Information to an Unauthorized Actor
 */

import {
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';
import { AST_NODE_TYPES } from '@interlace/eslint-devkit';
import type { TSESTree } from '@interlace/eslint-devkit';
import {
  callReceiver,
  decoratorCall,
  decoratorName,
  enclosingClass,
  isControllerClass,
  isRouteHandler,
  isTestFile,
  isTrueLiteral,
  expressionName,
  objectProperties,
} from '../../utils/nest-ast';

type MessageIds = 'bypassesSerialization';

export interface Options {
  /** Allow in test files. Default: true */
  allowInTests?: boolean;
}

type RuleOptions = [Options?];

/** `@Res()` and its documented alias. */
const RESPONSE_DECORATORS = new Set(['Res', 'Response']);

/** Response methods that serialize their argument into the body. */
const BODY_WRITERS = new Set(['json', 'jsonp', 'send']);

export const noResBypassSerialization = createRule<RuleOptions, MessageIds>({
  name: 'no-res-bypass-serialization',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-nestjs-security/docs/rules/no-res-bypass-serialization.md',
      description:
        'Detect @Res() handlers that write objects past ClassSerializerInterceptor',
      cwe: 'CWE-200',
      cvss: 7.5,
    },
    messages: {
      bypassesSerialization: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Response Serialization Bypassed',
        cwe: 'CWE-200',
        cvss: 7.5,
        description:
          '@Res() without passthrough stops every interceptor, so @Exclude() does not apply to the object written by {{writer}}',
        severity: 'HIGH',
        fix: 'Use @Res({ passthrough: true }) and return the value, so ClassSerializerInterceptor still runs',
        documentationLink: 'https://cwe.mitre.org/data/definitions/200.html',
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

    /**
     * The identifier bound to a non-passthrough `@Res()`, if the handler has
     * one. `@Res({ passthrough: true })` keeps interceptors running and is the
     * fix, so it is not a finding.
     */
    function bareResponseParam(
      node: TSESTree.MethodDefinition,
    ): { decorator: TSESTree.Decorator; binding: string } | null {
      for (const target of node.value.params) {
        for (const decorator of target.decorators) {
          if (!RESPONSE_DECORATORS.has(decoratorName(decorator))) continue;
          const arg = decoratorCall(decorator)?.arguments[0];
          if (arg?.type === AST_NODE_TYPES.ObjectExpression) {
            const props = objectProperties(arg);
            // A spread could set passthrough; abstain rather than accuse.
            if (!props) continue;
            if (isTrueLiteral(props.get('passthrough'))) continue;
          }
          // Destructured or rest params give us no name to track writes to.
          if (target.type !== AST_NODE_TYPES.Identifier) continue;
          return { decorator, binding: target.name };
        }
      }
      return null;
    }

    /**
     * The first body-writing call on `binding` whose argument is not a literal.
     *
     * `res.status(404).send('nope')` writes a string — there is nothing for
     * ClassSerializerInterceptor to have stripped. `res.json(user)` is the case
     * this rule exists for.
     */
    function objectBodyWriter(
      body: TSESTree.BlockStatement,
      binding: string,
    ): string | null {
      let found: string | null = null;

      const visit = (node: TSESTree.Node): void => {
        if (found) return;
        if (node.type === AST_NODE_TYPES.CallExpression) {
          const writer = expressionName(node.callee);
          if (BODY_WRITERS.has(writer)) {
            const receiver = callReceiver(node.callee);
            const arg = node.arguments[0];
            const literalBody =
              !arg ||
              arg.type === AST_NODE_TYPES.Literal ||
              arg.type === AST_NODE_TYPES.TemplateLiteral;
            if (receiver?.name === binding && !literalBody) {
              found = writer;
              return;
            }
          }
        }
        for (const key of Object.keys(node) as (keyof TSESTree.Node)[]) {
          if (key === 'parent') continue;
          const value = node[key] as unknown;
          if (Array.isArray(value)) {
            for (const child of value) {
              if (child && typeof child === 'object' && 'type' in child) {
                visit(child as TSESTree.Node);
              }
            }
          } else if (value && typeof value === 'object' && 'type' in value) {
            visit(value as TSESTree.Node);
          }
        }
      };

      visit(body);
      return found;
    }

    return {
      MethodDefinition(node: TSESTree.MethodDefinition) {
        if (!isRouteHandler(node)) return;
        // A MethodDefinition is always a ClassBody child, so this is non-null.
        if (!isControllerClass(enclosingClass(node))) return;

        const found = bareResponseParam(node);
        if (!found) return;

        const { decorator, binding } = found;
        // Non-null here: TypeScript forbids decorators on a method overload or
        // an abstract signature, so a body-less handler cannot carry `@Res()`.
        const body = node.value.body as TSESTree.BlockStatement;
        const writer = objectBodyWriter(body, binding);
        if (!writer) return;

        context.report({
          node: decorator,
          messageId: 'bypassesSerialization',
          data: { writer: `${binding}.${writer}()` },
        });
      },
    };
  },
});
